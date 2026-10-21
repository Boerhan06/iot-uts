/*
 * UTS ITO Kelompok 6 - Monitoring Kondisi Mesin dengan Proteksi Operasi
 * ESP32-S3 + Wokwi + Firebase Realtime Database (REST API / HTTPS)
 *
 * [INPUT SIMULASI] DHT22 = suhu mesin, MPU6050 = indikator getaran,
 *                  Serial 's'/'f' dan simSensorFault di Firebase = fault injection
 * [REPRESENTASI]   Relay = kontaktor motor (HIGH = motor jalan),
 *                  LED = lampu status, buzzer = alarm
 *
 * Kontrol berjalan di loop(), Firebase di task terpisah (netTask).
 * Keduanya bergantian dijalankan scheduler FreeRTOS, sehingga
 * proteksi lokal tidak pernah menunggu jaringan.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "esp_task_wdt.h"

// ===== KREDENSIAL (JANGAN TAMPILKAN DI VIDEO) =====
#define WIFI_SSID     "Wokwi-GUEST"
#define API_KEY       "AIzaSyDRqBoh11BuZHcqYkOPHrqbtkudrbKbyD4"
#define DATABASE_URL  "https://iot-uts-264a9-default-rtdb.firebaseio.com"
#define USER_EMAIL    "esp32.kelompok6@gmail.com"
#define USER_PASSWORD "Mkbsehat"

// ===== PIN =====
#define LED_HIJAU   37
#define LED_KUNING  36
#define LED_MERAH   35
#define BUZZER_PIN  21
#define DHT_PIN     18
#define BTN_HIJAU   11   // START / RESET
#define BTN_MERAH   13   // singkat = ACK, tahan 1 detik = STOP
#define RELAY_PIN   48
#define SDA_PIN     41
#define SCL_PIN     42

// ===== TIPE DATA (harus di atas semua fungsi) =====
enum State { IDLE, RUNNING, WARNING, TRIP, FAULT, RECOVERY };
enum Mode  { AUTO, MANUAL };
enum Cmd   { CMD_NONE, CMD_START, CMD_STOP, CMD_RESET, CMD_ACK };

struct EventMsg {
  uint32_t ms;
  char type[20];
  char msg[90];
  char state[14];
};

// ===== PARAMETER (nilai latihan simulasi, bukan standar) =====
const float TEMP_WARNING = 35.0, TEMP_TRIP = 45.0, TEMP_SAFE = 33.0;
const float VIB_WARNING  = 2.0,  VIB_TRIP  = 4.0,  VIB_SAFE  = 1.5;
const unsigned long WARNING_DELAY = 5000;    // warning harus bertahan 5 detik
const unsigned long TRIP_DELAY    = 3000;    // trip harus bertahan 3 detik
const unsigned long SAFE_DELAY    = 5000;    // aman 5 detik untuk pulih
const unsigned long WARNING_LIMIT = 20000;   // mode AUTO: WARNING > 30 detik -> TRIP
const unsigned long FAULT_DELAY   = 2000;    // sensor invalid 2 detik -> FAULT
const unsigned long CLOUD_TIMEOUT = 30000;   // tanpa respons 30 detik = Firebase gagal

// ===== VARIABEL KONTROL =====
DHT dht(DHT_PIN, DHT22);
Adafruit_MPU6050 mpu;

State state = IDLE;
Mode  mode  = AUTO;
float temperature = NAN, vibration = NAN;

bool mpuOK = false, sensorFault = true, injectFault = false;
bool alarmAck = false, relayOn = false, cloudOnline = false;
bool greenWas = false, redWas = false, redLong = false;

unsigned long stateStart = 0, warnTimer = 0, tripTimer = 0, safeTimer = 0, faultTimer = 0;
unsigned long lastDht = 0, lastMpu = 0, lastBtn = 0, lastPrint = 0, redDownAt = 0, chirpUntil = 0;

// ===== DATA BERSAMA DENGAN TASK FIREBASE =====
QueueHandle_t eventQueue;
volatile Cmd  cloudCmd = CMD_NONE;
volatile int  cloudMode = -1;              // -1 = tidak ada perubahan mode
volatile bool cloudSimFault = false;       // [FAULT INJECTION] dari Firebase
volatile bool simFirebaseFail = false;     // [FAULT INJECTION] Serial 'f'
volatile uint32_t lastCloudOk = 0;

// ===== UTILITAS =====
const char* stateName(State s) {
  const char* n[] = {"IDLE", "RUNNING", "WARNING", "TRIP", "SENSOR_FAULT", "RECOVERY"};
  return n[s];
}

void logEvent(const char* type, String msg) {
  EventMsg e;
  e.ms = millis();
  strlcpy(e.type, type, sizeof(e.type));
  strlcpy(e.msg, msg.c_str(), sizeof(e.msg));
  strlcpy(e.state, stateName(state), sizeof(e.state));
  Serial.printf("[EVENT %lu ms] %s | %s: %s\n", (unsigned long)e.ms, e.state, type, e.msg);
  if (xQueueSend(eventQueue, &e, 0) != pdTRUE) {   // non-blocking
    Serial.println("[EVENT] antrean penuh, event ini tidak terkirim ke Firebase");
  }
}

void changeState(State s, String reason) {
  if (s == state) return;
  String msg = String(stateName(state)) + " -> " + stateName(s) + " (" + reason + ")";
  state = s;
  stateStart = millis();
  warnTimer = tripTimer = safeTimer = 0;
  alarmAck = false;
  logEvent("STATE_CHANGE", msg);
}

void setMode(Mode m, const char* src) {
  if (m == mode) return;
  mode = m;
  logEvent("MODE_CHANGE", String("mode -> ") + (mode == AUTO ? "AUTO" : "MANUAL") + " (dari " + src + ")");
}

// ===== KONDISI =====
bool warningCond() { return !sensorFault && (temperature >= TEMP_WARNING || vibration >= VIB_WARNING); }
bool tripCond()    { return !sensorFault && (temperature >= TEMP_TRIP    || vibration >= VIB_TRIP); }
bool safeCond()    { return !sensorFault && temperature < TEMP_SAFE && vibration < VIB_SAFE; }  // hysteresis

// True jika kondisi sudah bertahan selama 'duration'
bool heldFor(bool cond, unsigned long &timer, unsigned long duration) {
  if (!cond) { timer = 0; return false; }
  if (timer == 0) timer = millis();
  return millis() - timer >= duration;
}

// ===== SENSOR =====
void readSensors() {
  unsigned long now = millis();

  if (lastDht == 0 || now - lastDht >= 2000) {
    lastDht = now;
    float t = dht.readTemperature();
    temperature = (!isnan(t) && t > -40 && t < 80) ? t : NAN;
  }

  if (now - lastMpu >= 200) {
    lastMpu = now;
    if (mpuOK) {
      sensors_event_t a, g, tmp;
      mpu.getEvent(&a, &g, &tmp);
      float mag = sqrt(sq(a.acceleration.x) + sq(a.acceleration.y) + sq(a.acceleration.z));
      vibration = fabs(mag - SENSORS_GRAVITY_STANDARD);
    } else {
      vibration = NAN;
    }
  }

  static bool lastCloudSim = false;
  if (cloudSimFault != lastCloudSim) {
    lastCloudSim = cloudSimFault;
    logEvent("FAULT_INJECTION", String("SIMULASI sensor rusak ") + (lastCloudSim ? "ON" : "OFF") + " (dari FIREBASE)");
  }

  sensorFault = isnan(temperature) || isnan(vibration) || injectFault || lastCloudSim;
}

// ===== PERINTAH + INTERLOCK =====
void command(Cmd c, const char* src) {
  String s = src;

  if (c == CMD_START) {
    if (state == TRIP || state == FAULT || state == RECOVERY)
      logEvent("CMD_REJECTED", "START dari " + s + " ditolak: masih " + stateName(state) + " (IL-1)");
    else if (state != IDLE)
      logEvent("CMD_IGNORED", "START dari " + s + ": motor sudah jalan");
    else if (!safeCond())
      logEvent("CMD_REJECTED", "START dari " + s + " ditolak: kondisi belum aman (IL-2)");
    else
      changeState(RUNNING, "START dari " + s);
  }
  else if (c == CMD_STOP) {
    if (state == RUNNING || state == WARNING || state == RECOVERY)
      changeState(IDLE, "STOP dari " + s);
    else
      logEvent("CMD_IGNORED", "STOP dari " + s + ": motor sudah berhenti");
  }
  else if (c == CMD_RESET) {
    if (state != TRIP && state != FAULT)
      logEvent("CMD_IGNORED", "RESET dari " + s + ": tidak ada trip/fault");
    else if (!safeCond())
      logEvent("CMD_REJECTED", "RESET dari " + s + " ditolak: kondisi belum pulih (IL-3)");
    else
      changeState(RECOVERY, "RESET dari " + s);
  }
  else if (c == CMD_ACK) {
    if ((state == WARNING || state == TRIP || state == FAULT) && !alarmAck) {
      alarmAck = true;
      logEvent("ALARM_ACK", "alarm di-acknowledge dari " + s);
    }
  }
}

// ===== INPUT LOKAL =====
void readButtons() {
  unsigned long now = millis();
  if (now - lastBtn < 30) return;   // debounce
  lastBtn = now;

  bool green = digitalRead(BTN_HIJAU) == LOW;
  if (green && !greenWas) command((state == TRIP || state == FAULT) ? CMD_RESET : CMD_START, "TOMBOL");
  greenWas = green;

  bool red = digitalRead(BTN_MERAH) == LOW;
  if (red && !redWas) { redDownAt = now; redLong = false; }
  if (red && !redLong && now - redDownAt >= 1000) { redLong = true; command(CMD_STOP, "TOMBOL"); }
  if (!red && redWas && !redLong) command(CMD_ACK, "TOMBOL");
  redWas = red;
}

void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if      (c == '1') command(CMD_START, "SERIAL");
    else if (c == '2') command(CMD_STOP,  "SERIAL");
    else if (c == '3') command(CMD_RESET, "SERIAL");
    else if (c == '4') command(CMD_ACK,   "SERIAL");
    else if (c == 'a') setMode(AUTO,   "SERIAL");
    else if (c == 'm') setMode(MANUAL, "SERIAL");
    else if (c == 's') {
      injectFault = !injectFault;
      logEvent("FAULT_INJECTION", String("SIMULASI sensor rusak ") + (injectFault ? "ON" : "OFF"));
    }
    else if (c == 'f') {
      simFirebaseFail = !simFirebaseFail;
      logEvent("FAULT_INJECTION", String("SIMULASI Firebase gagal ") + (simFirebaseFail ? "ON" : "OFF"));
    }
  }
}

// ===== STATE MACHINE =====
void runStateMachine() {
  unsigned long now = millis();

  // Prioritas utama: sensor invalid -> SENSOR_FAULT (kecuali sudah TRIP)
  if (now > 3000 && heldFor(sensorFault, faultTimer, FAULT_DELAY) && state != FAULT && state != TRIP) {
    changeState(FAULT, "data sensor tidak valid");
    return;
  }

  switch (state) {
    case IDLE:
      break;

    case RUNNING:
      if (heldFor(tripCond(), tripTimer, TRIP_DELAY))           changeState(TRIP, "melewati ambang trip");
      else if (heldFor(warningCond(), warnTimer, WARNING_DELAY)) changeState(WARNING, "melewati ambang warning");
      break;

    case WARNING:
      if (heldFor(tripCond(), tripTimer, TRIP_DELAY))       changeState(TRIP, "melewati ambang trip");
      else if (heldFor(safeCond(), safeTimer, SAFE_DELAY))  changeState(RUNNING, "kondisi pulih (hysteresis)");
      else if (mode == AUTO && !safeCond() && now - stateStart >= WARNING_LIMIT)
        changeState(TRIP, "WARNING > 30 detik (mode AUTO)");
      break;

    case TRIP:
    case FAULT:
      break;   // terkunci, hanya keluar lewat RESET

    case RECOVERY:
      if (sensorFault)                                     changeState(FAULT, "sensor invalid saat recovery");
      else if (warningCond())                              changeState(TRIP, "kondisi memburuk saat recovery");
      else if (heldFor(safeCond(), safeTimer, SAFE_DELAY)) changeState(mode == AUTO ? RUNNING : IDLE, "recovery selesai");
      break;
  }
}

// ===== OUTPUT =====
void updateOutputs() {
  unsigned long now = millis();
  bool hijau = false, kuning = false, merah = false, motor = false;
  int buzz = 0;

  switch (state) {
    case IDLE:     hijau = (now / 1000) % 2; break;
    case RUNNING:  hijau = true; motor = true; break;
    case WARNING:  hijau = true; kuning = true; motor = true;
                   if (!alarmAck && (now / 500) % 2) buzz = 1800; break;
    case TRIP:     merah = true;
                   if (!alarmAck) buzz = 2500; break;
    case FAULT:    merah = (now / 200) % 2;
                   if (!alarmAck && merah) buzz = 3000; break;
    case RECOVERY: kuning = (now / 500) % 2; break;
  }
  if (buzz == 0 && now < chirpUntil) buzz = 1000;   // bunyi singkat saat Firebase gagal

  digitalWrite(LED_HIJAU, hijau);
  digitalWrite(LED_KUNING, kuning);
  digitalWrite(LED_MERAH, merah);
  digitalWrite(RELAY_PIN, motor);   // fail-safe: motor hanya jalan di RUNNING/WARNING
  relayOn = motor;

  static int lastBuzz = -1;
  if (buzz != lastBuzz) {
    if (buzz) tone(BUZZER_PIN, buzz); else noTone(BUZZER_PIN);
    lastBuzz = buzz;
  }
}

// ===== MONITOR KONEKSI CLOUD =====
void checkCloud() {
  uint32_t last = lastCloudOk;
  bool online = !simFirebaseFail && last != 0 && millis() - last < CLOUD_TIMEOUT;
  if (online == cloudOnline) return;
  cloudOnline = online;
  if (online) {
    logEvent("FIREBASE_OK", "komunikasi Firebase tersambung");
  } else {
    logEvent("FIREBASE_FAIL", simFirebaseFail ? "komunikasi diputus (SIMULASI)" : "tidak ada respons > 30 detik");
    chirpUntil = millis() + 300;
  }
}

void printStatus() {
  if (millis() - lastPrint < 1000) return;
  lastPrint = millis();
  Serial.printf("State: %s | Mode: %s | Suhu: %.1f C | Getaran: %.2f | Motor: %s | Sensor: %s | Cloud: %s\n",
                stateName(state), mode == AUTO ? "AUTO" : "MANUAL", temperature, vibration,
                relayOn ? "ON" : "OFF", sensorFault ? "FAULT" : "OK", cloudOnline ? "ONLINE" : "OFFLINE");
}

// ===== FIREBASE (task terpisah) =====
WiFiClientSecure authClient;   // koneksi untuk login
WiFiClientSecure dbClient;     // koneksi untuk database, dipakai ulang
HTTPClient dbHttp;
String idToken = "";
unsigned long tokenTime = 0;
long lastCmdId = -1;           // -1 = belum pernah membaca
String lastModeStr = "";

int firebase(const char* method, String path, String body, String* resp) {
  dbHttp.setReuse(true);            // koneksi TLS dibiarkan terbuka untuk request berikutnya
  dbHttp.setConnectTimeout(10000);  // batas waktu, tidak menunggu tanpa batas
  dbHttp.setTimeout(10000);
  if (!dbHttp.begin(dbClient, String(DATABASE_URL) + path + ".json?auth=" + idToken)) return -1;
  dbHttp.addHeader("Content-Type", "application/json");
  int code = dbHttp.sendRequest(method, body);
  String r = (code > 0) ? dbHttp.getString() : "";
  if (resp != nullptr) *resp = r;
  dbHttp.end();

  if (code == 200) {
    lastCloudOk = millis();
  } else {
    Serial.printf("[NET] %s %s -> HTTP %d\n", method, path.c_str(), code);
    if (r.length() > 0) Serial.println("[NET] Pesan server: " + r);
    if (code < 0)    dbClient.stop();   // koneksi rusak -> buka baru di request berikutnya
    if (code == 401) idToken = "";      // token ditolak -> login ulang
  }
  return code;
}

bool signIn() {
  // Cek 1: DNS, apakah nama server bisa diterjemahkan ke alamat IP
  IPAddress ip;
  if (WiFi.hostByName("identitytoolkit.googleapis.com", ip)) {
    Serial.println("[NET] DNS OK, IP server: " + ip.toString());
  } else {
    Serial.println("[NET] DNS GAGAL: nama server tidak ditemukan");
    return false;
  }

  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  http.begin(authClient, String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") + API_KEY);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(String("{\"email\":\"") + USER_EMAIL + "\",\"password\":\"" + USER_PASSWORD +
                       "\",\"returnSecureToken\":true}");
  String r = (code > 0) ? http.getString() : "";
  if (code == 200) {
    JsonDocument doc;
    deserializeJson(doc, r);
    idToken = doc["idToken"].as<String>();
    tokenTime = millis();
  }

  // Cek 2: pesan error TLS dari ESP32 (hanya jika gagal terhubung)
  if (code < 0) {
    char err[120];
    authClient.lastError(err, sizeof(err));
    Serial.println("[NET] Error koneksi: " + http.errorToString(code));
    Serial.println("[NET] Error TLS: " + String(err));
  }
  http.end();

  Serial.printf("[NET] Login Firebase: %s (HTTP %d)\n", code == 200 ? "OK" : "GAGAL", code);
  if (code != 200 && r.length() > 0) Serial.println("[NET] Pesan server: " + r);
  return code == 200;
}

void netTask(void* pv) {
  authClient.setInsecure();          // simulasi: sertifikat tidak diverifikasi
  dbClient.setInsecure();
  authClient.setHandshakeTimeout(60);  // handshake TLS di simulator lambat
  dbClient.setHandshakeTimeout(60);
  WiFi.begin(WIFI_SSID, "", 6);
  bool wifiShown = false;

  for (;;) {
    if (simFirebaseFail || WiFi.status() != WL_CONNECTED) {   // [FAULT INJECTION] atau WiFi belum siap
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }
    if (!wifiShown) {
      Serial.println("[NET] WiFi tersambung, IP: " + WiFi.localIP().toString());
      wifiShown = true;
    }

    if (idToken == "" || millis() - tokenTime > 3000000UL) {   // token berlaku 1 jam, perbarui tiap 50 menit
      Serial.println("[NET] Mencoba login ke Firebase...");
      unsigned long t0 = millis();
      bool ok = signIn();
      Serial.printf("[NET] Proses login selesai dalam %lu ms\n", millis() - t0);
      if (!ok) { vTaskDelay(pdMS_TO_TICKS(3000)); continue; }
    }

    // 1) ESP32 -> Firebase: status terkini
    String status = String("{\"timestamp\":{\".sv\":\"timestamp\"}") +
      ",\"temperature\":" + (isnan(temperature) ? String("null") : String(temperature, 1)) +
      ",\"vibration\":"   + (isnan(vibration)   ? String("null") : String(vibration, 2)) +
      ",\"state\":\"" + stateName(state) + "\"" +
      ",\"mode\":\"" + (mode == AUTO ? "AUTO" : "MANUAL") + "\"" +
      ",\"relay\":\"" + (relayOn ? "ON" : "OFF") + "\"" +
      ",\"sensorFault\":" + (sensorFault ? "true" : "false") + "}";
    firebase("PUT", "/mesin6/status", status, nullptr);

    // 2) Firebase -> ESP32: mode, perintah, fault injection
    String resp;
    if (firebase("GET", "/mesin6/control", "", &resp) == 200) {
      JsonDocument doc;
      if (resp == "null") {
        firebase("PUT", "/mesin6/control", "{\"mode\":\"AUTO\",\"cmd\":\"NONE\",\"cmdId\":0,\"simSensorFault\":false}", nullptr);
      } else if (!deserializeJson(doc, resp)) {
        String m = doc["mode"] | "AUTO";
        if (m != lastModeStr) { lastModeStr = m; cloudMode = (m == "MANUAL") ? MANUAL : AUTO; }

        long id = doc["cmdId"] | 0L;
        if (lastCmdId < 0) {
          lastCmdId = id;   // abaikan perintah lama saat boot
        } else if (id != lastCmdId) {
          lastCmdId = id;
          String c = doc["cmd"] | "NONE";
          if      (c == "START") cloudCmd = CMD_START;
          else if (c == "STOP")  cloudCmd = CMD_STOP;
          else if (c == "RESET") cloudCmd = CMD_RESET;
          else if (c == "ACK")   cloudCmd = CMD_ACK;
        }
        cloudSimFault = doc["simSensorFault"] | false;
      }
    }

    // 3) ESP32 -> Firebase: event log (maksimal 5 per siklus)
    EventMsg e;
    for (int i = 0; i < 5 && xQueuePeek(eventQueue, &e, 0) == pdTRUE; i++) {
      String body = String("{\"timestamp\":{\".sv\":\"timestamp\"},\"uptime_ms\":") + e.ms +
                    ",\"type\":\"" + e.type + "\",\"message\":\"" + e.msg +
                    "\",\"state\":\"" + e.state + "\"}";
      if (firebase("POST", "/mesin6/events", body, nullptr) != 200) break;
      xQueueReceive(eventQueue, &e, 0);   // hapus dari antrean setelah terkirim
    }

    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}

// ===== SETUP & LOOP =====
void setup() {
  Serial.begin(115200);
  pinMode(LED_HIJAU, OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_MERAH, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN_HIJAU, INPUT_PULLUP);
  pinMode(BTN_MERAH, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, LOW);   // kondisi awal aman: motor mati

  eventQueue = xQueueCreate(40, sizeof(EventMsg));

  Wire.begin(SDA_PIN, SCL_PIN);
  dht.begin();
  mpuOK = mpu.begin();
  if (mpuOK) mpu.setAccelerometerRange(MPU6050_RANGE_8_G);

  logEvent("BOOT", mpuOK ? "MPU6050 OK" : "MPU6050 GAGAL");
  Serial.println("Hijau = START/RESET | Merah = ACK (singkat) / STOP (tahan 1 dtk)");
  Serial.println("Serial: 1=START 2=STOP 3=RESET 4=ACK a=AUTO m=MANUAL s=sensor rusak f=Firebase gagal");

  esp_task_wdt_config_t wdtConfig = {
    .timeout_ms = 60000,           // batas 60 detik
    .idle_core_mask = (1 << 0),    // awasi IDLE core 0
    .trigger_panic = false         // jika terpicu: hanya peringatan, tidak restart
  };
  esp_task_wdt_reconfigure(&wdtConfig);
  // Task jaringan di core 1 bersama loop(). Keduanya digilirkan scheduler FreeRTOS,
  // sehingga loop() tetap berjalan walaupun handshake TLS sedang lambat.
  xTaskCreatePinnedToCore(netTask, "netTask", 16384, NULL, 1, NULL, 0);
}

void loop() {
  readSerial();
  readSensors();
  readButtons();

  // Perintah dan mode dari Firebase tetap melewati interlock yang sama
  if (cloudCmd != CMD_NONE) { Cmd c = cloudCmd; cloudCmd = CMD_NONE; command(c, "FIREBASE"); }
  if (cloudMode >= 0)       { Mode m = (Mode)cloudMode; cloudMode = -1; setMode(m, "FIREBASE"); }

  checkCloud();
  runStateMachine();
  updateOutputs();
  printStatus();
  delay(10);
}
