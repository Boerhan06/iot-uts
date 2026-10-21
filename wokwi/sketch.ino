/**
 * PANDUAN TUGAS UTS - INTERNET OF THINGS (ITO)
 * Topik 6: Monitoring Kondisi Mesin dengan Proteksi Operasi
 * Platform: Wokwi ESP32 + Firebase Realtime Database (HTTPS REST API)
 *
 * Komponen:
 * - ESP32 DevKit V1
 * - MPU6050 (I2C: SDA=21, SCL=22) -> Getaran Spindle Mesin
 * - DHT22 (GPIO 4) -> Sensor Suhu Mesin
 * - Push Button Start (GPIO 18, INPUT_PULLUP)
 * - Push Button Stop / E-Stop (GPIO 19, INPUT_PULLUP)
 * - LED Status Motor (GPIO 2) -> Representasi Kontaktor Motor
 * - Buzzer Alarm (GPIO 15) -> Representasi Sirene Alarm
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <Wire.h>

// -------------------------------------------------------------
// KONFIGURASI WIFI & FIREBASE
// -------------------------------------------------------------
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// URL Realtime Database Project Firebase Anda
String FIREBASE_HOST = "https://iot-uts-264a9-default-rtdb.asia-southeast1.firebasedatabase.app";
String FIREBASE_AUTH = ""; // Kosongkan jika Security Rules diatur read/write

// -------------------------------------------------------------
// DEFINISI PIN PERANGKAT KERAS
// -------------------------------------------------------------
#define PIN_DHT 4
#define PIN_BTN_START 18
#define PIN_BTN_STOP 19
#define PIN_LED_MOTOR 2
#define PIN_BUZZER 15

#define DHTTYPE DHT22
DHT dht(PIN_DHT, DHTTYPE);
Adafruit_MPU6050 mpu;

// -------------------------------------------------------------
// DEFINISI STATE MACHINE SISTEM
// -------------------------------------------------------------
enum MachineState {
  STATE_IDLE,     // Mesin mati / siaga
  STATE_NORMAL,   // Mesin beroperasi dalam batas aman
  STATE_WARNING,  // Ambang peringatan terlampaui, hitung durasi gangguan
  STATE_TRIP      // Safe State: Motor dipadamkan paksa, buzzer aktif
};

MachineState currentState = STATE_IDLE;

// -------------------------------------------------------------
// PARAMETER KONTROL & AMBANG BATAS
// -------------------------------------------------------------
String currentMode = "AUTO"; // AUTO atau MANUAL
float tempWarnLimit = 70.0;
float tempTripLimit = 85.0;
float tempHysteresis = 3.0;
float vibWarnLimit = 2.5;
float vibTripLimit = 4.0;
int faultTimeLimitSec = 5;

// Status Telemetri Terkini
float currentTemperature = 25.0;
float currentVibrationG = 0.0;
float faultDurationSec = 0.0;
bool motorRunning = false;
bool buzzerActive = false;

// Fault Injection Flags (Skenario 4 & Skenario 5)
bool simulateSensorFault = false;
bool simulateFirebaseFailure = false;

// Timer Loop Non-Blocking (millis)
unsigned long lastControlTick = 0;
unsigned long lastFirebaseSync = 0;
const unsigned long CONTROL_INTERVAL_MS = 100;    // 100 ms loop lokal
const unsigned long FIREBASE_INTERVAL_MS = 1200;  // 1200 ms sync cloud

// Forward Declarations
void readSensors();
void updateStateMachine();
void checkPhysicalButtons();
void applyActuatorStates();
void syncFirebaseTelemetry();
void syncFirebaseControls();
void pushEventLog(const String& type, const String& message);
String getStateString(MachineState st);

// -------------------------------------------------------------
// SETUP UTAMA
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== INISIALISASI MONITORING KONDISI MESIN (TOPIK 6) ===");

  // Inisialisasi GPIO
  pinMode(PIN_BTN_START, INPUT_PULLUP);
  pinMode(PIN_BTN_STOP, INPUT_PULLUP);
  pinMode(PIN_LED_MOTOR, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED_MOTOR, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Inisialisasi Sensor DHT22
  dht.begin();
  Serial.println("[OK] Sensor DHT22 Siap.");

  // Inisialisasi MPU6050
  Wire.begin(21, 22);
  if (!mpu.begin()) {
    Serial.println("[WARN] MPU6050 tidak terdeteksi via I2C, memakai pembacaan fallback.");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[OK] MPU6050 Siap.");
  }

  // Koneksi ke WiFi Simulator Wokwi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Menghubungkan ke Wi-Fi Wokwi");
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(250);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] Terhubung ke Wi-Fi. IP: " + WiFi.localIP().toString());
    pushEventLog("STATE", "ESP32 berhasil boot & terhubung ke jaringan.");
  } else {
    Serial.println("\n[WARN] Wi-Fi belum tersambung. Kontrol lokal tetap berjalan.");
  }

  currentState = STATE_IDLE;
  applyActuatorStates();
}

// -------------------------------------------------------------
// LOOP UTAMA (NON-BLOCKING)
// -------------------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // 1. Eksekusi Kontrol Lokal & Proteksi setiap 100 ms
  if (currentMillis - lastControlTick >= CONTROL_INTERVAL_MS) {
    lastControlTick = currentMillis;

    checkPhysicalButtons();
    readSensors();
    updateStateMachine();
    applyActuatorStates();
  }

  // 2. Eksekusi Komunikasi Cloud Firebase setiap 1200 ms
  if (currentMillis - lastFirebaseSync >= FIREBASE_INTERVAL_MS) {
    lastFirebaseSync = currentMillis;

    // Periksa Skenario 5: Fault Injection Jaringan
    if (!simulateFirebaseFailure && WiFi.status() == WL_CONNECTED) {
      syncFirebaseTelemetry();
      syncFirebaseControls();
    } else if (simulateFirebaseFailure) {
      Serial.println("[SKENARIO 5] Fault Injection Jaringan Aktif: Komunikasi cloud dilewati.");
    }
  }
}

// -------------------------------------------------------------
// PEMBACAAN SENSOR & PERHITUNGAN BESARAN
// -------------------------------------------------------------
void readSensors() {
  // Cek Skenario 4: Simulasi Sensor Rusak
  if (simulateSensorFault) {
    currentTemperature = NAN;
    currentVibrationG = NAN;
    return;
  }

  // Pembacaan DHT22
  float t = dht.readTemperature();
  if (!isnan(t) && t >= -20 && t <= 120) {
    currentTemperature = t;
  }

  // Pembacaan MPU6050
  sensors_event_t a, g, temp;
  if (mpu.getEvent(&a, &g, &temp)) {
    // Hitung resultan akselerasi: a_total = sqrt(ax^2 + ay^2 + az^2) dalam satuan g
    float ax = a.acceleration.x / 9.80665;
    float ay = a.acceleration.y / 9.80665;
    float az = a.acceleration.z / 9.80665;
    currentVibrationG = sqrt(ax * ax + ay * ay + az * az);
  } else {
    // Nilai default jika simulasi I2C tidak membaca MPU
    currentVibrationG = 0.5;
  }
}

// -------------------------------------------------------------
// LOGIKA STATE MACHINE & PROTEKSI KESELAMATAN
// -------------------------------------------------------------
void updateStateMachine() {
  // Skenario 4: Validasi Integritas Data Sensor
  bool isSensorInvalid = isnan(currentTemperature) || isnan(currentVibrationG) ||
                         currentTemperature < -20.0 || currentTemperature > 120.0;

  if (isSensorInvalid) {
    if (currentState != STATE_TRIP) {
      currentState = STATE_TRIP;
      faultDurationSec = 0.0;
      pushEventLog("ALARM", "TRIP! Data sensor tidak valid / rusak (Safe State aktif).");
    }
    return;
  }

  switch (currentState) {
    case STATE_IDLE:
      faultDurationSec = 0.0;
      // Di mode AUTO, mesin dapat otomatis bersiaga dinyalakan
      break;

    case STATE_NORMAL:
      faultDurationSec = 0.0;
      // Periksa apakah kondisi melewati batas warning
      if (currentTemperature >= tempWarnLimit || currentVibrationG >= vibWarnLimit) {
        currentState = STATE_WARNING;
        faultDurationSec = 0.1;
        pushEventLog("STATE", "NORMAL -> WARNING: Ambang batas getaran atau suhu terlampaui.");
      }
      break;

    case STATE_WARNING: {
      bool isExceeded = (currentTemperature >= tempWarnLimit || currentVibrationG >= vibWarnLimit);

      if (isExceeded) {
        faultDurationSec += (CONTROL_INTERVAL_MS / 1000.0);

        // Trip langsung jika mencapai batas kritis Trip Limit
        bool directTrip = (currentTemperature >= tempTripLimit || currentVibrationG >= vibTripLimit);

        // Trip jika gangguan bertahan melampaui batas toleransi waktu
        bool durationTrip = (faultDurationSec >= faultTimeLimitSec);

        if (directTrip || durationTrip) {
          currentState = STATE_TRIP;
          String reason = directTrip ? "Batas Kritis TRIP terlampaui!" : "Gangguan melebihi durasi toleransi " + String(faultTimeLimitSec) + "s!";
          pushEventLog("ALARM", "TRIP! Motor dipadamkan: " + reason);
        }
      } else {
        // Skenario 2: Hysteresis Ambang Batas
        // Mesin hanya kembali ke NORMAL jika suhu turun di bawah (tempWarnLimit - tempHysteresis)
        float safeThreshold = tempWarnLimit - tempHysteresis;
        if (currentTemperature < safeThreshold && currentVibrationG < vibWarnLimit) {
          currentState = STATE_NORMAL;
          faultDurationSec = 0.0;
          pushEventLog("STATE", "WARNING -> NORMAL: Suhu pulih di bawah batas hysteresis (" + String(safeThreshold, 1) + " C).");
        }
      }
      break;
    }

    case STATE_TRIP:
      // Mesin terkunci dalam Safe State hingga prosedur RESET dieksekusi dengan aman
      faultDurationSec = 0.0;
      break;
  }
}

// -------------------------------------------------------------
// PENERAPAN STATUS PADA AKTUATOR FISIK
// -------------------------------------------------------------
void applyActuatorStates() {
  if (currentState == STATE_NORMAL || currentState == STATE_WARNING) {
    motorRunning = true;
    digitalWrite(PIN_LED_MOTOR, HIGH);
  } else {
    motorRunning = false;
    digitalWrite(PIN_LED_MOTOR, LOW);
  }

  if (currentState == STATE_TRIP) {
    buzzerActive = true;
    digitalWrite(PIN_BUZZER, HIGH);
  } else if (currentState == STATE_WARNING) {
    // Buzzer berkedip sesekali sebagai indikasi warning
    buzzerActive = ((millis() / 500) % 2 == 0);
    digitalWrite(PIN_BUZZER, buzzerActive ? HIGH : LOW);
  } else {
    buzzerActive = false;
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// -------------------------------------------------------------
// INTERLOCK KESELAMATAN & TOMBOL FISIK (SKENARIO 3)
// -------------------------------------------------------------
void checkPhysicalButtons() {
  static bool lastStartBtn = HIGH;
  static bool lastStopBtn = HIGH;

  bool curStart = digitalRead(PIN_BTN_START);
  bool curStop = digitalRead(PIN_BTN_STOP);

  // Deteksi Tekan Tombol START
  if (lastStartBtn == HIGH && curStart == LOW) {
    delay(20); // Debounce
    executeStartCommand("TOMBOL_FISIK");
  }

  // Deteksi Tekan Tombol STOP
  if (lastStopBtn == HIGH && curStop == LOW) {
    delay(20); // Debounce
    executeStopCommand("TOMBOL_FISIK");
  }

  lastStartBtn = curStart;
  lastStopBtn = curStop;
}

void executeStartCommand(const String& source) {
  // INTERLOCK 1: Dilarang menyala jika mesin sedang dalam kondisi TRIP
  if (currentState == STATE_TRIP) {
    String msg = "Perintah START (" + source + ") DITOLAK! Mesin dalam status TRIP. Lakukan RESET terlebih dahulu.";
    Serial.println("[INTERLOCK REJECT] " + msg);
    pushEventLog("INTERLOCK_REJECT", msg);
    return;
  }

  // INTERLOCK 2: Dilarang menyala jika kondisi suhu masih belum di bawah hysteresis aman
  float safeThreshold = tempWarnLimit - tempHysteresis;
  if (currentTemperature >= safeThreshold || currentVibrationG >= vibWarnLimit) {
    String msg = "Perintah START (" + source + ") DITOLAK! Suhu/Vibrasi masih di atas batas aman (" + String(currentTemperature, 1) + " C).";
    Serial.println("[INTERLOCK REJECT] " + msg);
    pushEventLog("INTERLOCK_REJECT", msg);
    return;
  }

  // Jika semua interlock lolos -> Nyalakan Mesin
  currentState = STATE_NORMAL;
  pushEventLog("STATE", "Mesin dinyalakan ke status NORMAL via " + source);
}

void executeStopCommand(const String& source) {
  currentState = STATE_IDLE;
  pushEventLog("STATE", "Mesin dimatikan ke status IDLE via " + source);
}

void executeResetCommand(const String& source) {
  // INTERLOCK RESET: Hanya boleh di-reset jika kondisi fisik mesin sudah dingin dan sensor valid
  float safeThreshold = tempWarnLimit - tempHysteresis;
  if (currentTemperature >= safeThreshold || isnan(currentTemperature) || currentVibrationG >= vibWarnLimit) {
    String msg = "Perintah RESET (" + source + ") DITOLAK! Kondisi mesin masih bahaya/panas (" + String(currentTemperature, 1) + " C).";
    Serial.println("[INTERLOCK REJECT] " + msg);
    pushEventLog("INTERLOCK_REJECT", msg);
    return;
  }

  currentState = STATE_IDLE;
  pushEventLog("STATE", "Status TRIP berhasil di-RESET via " + source + ". Mesin kembali ke IDLE.");
}

// -------------------------------------------------------------
// KOMUNIKASI FIREBASE REST API (HTTPS)
// -------------------------------------------------------------
void syncFirebaseTelemetry() {
  WiFiClientSecure client;
  client.setInsecure(); // Mengabaikan validasi SSL certificate untuk Wokwi

  HTTPClient http;
  String url = FIREBASE_HOST + "/machine_monitor/telemetry.json";
  if (FIREBASE_AUTH.length() > 0) url += "?auth=" + FIREBASE_AUTH;

  http.begin(client, url);
  http.setTimeout(1500); // 1.5 detik timeout (tidak memblokir loop lokal)
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["temperature"] = isnan(currentTemperature) ? -999.0 : currentTemperature;
  doc["vibration_g"] = isnan(currentVibrationG) ? -999.0 : currentVibrationG;
  doc["state"] = getStateString(currentState);
  doc["motor_led"] = motorRunning;
  doc["buzzer"] = buzzerActive;
  doc["fault_duration_sec"] = faultDurationSec;
  doc["timestamp"] = (unsigned long)(millis() / 1000);

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.PUT(payload);
  if (httpCode > 0 && httpCode < 300) {
    // Berhasil kirim telemetri
  } else {
    Serial.printf("[REST] Gagal PUT Telemetry, error: %d\n", httpCode);
  }
  http.end();
}

void syncFirebaseControls() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = FIREBASE_HOST + "/machine_monitor/controls.json";
  if (FIREBASE_AUTH.length() > 0) url += "?auth=" + FIREBASE_AUTH;

  http.begin(client, url);
  http.setTimeout(1500);

  int httpCode = http.GET();
  if (httpCode > 0 && httpCode < 300) {
    String resp = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, resp);

    if (!err && !doc.isNull()) {
      if (doc.containsKey("mode")) currentMode = doc["mode"].as<String>();
      if (doc.containsKey("temp_warn_limit")) tempWarnLimit = doc["temp_warn_limit"];
      if (doc.containsKey("temp_trip_limit")) tempTripLimit = doc["temp_trip_limit"];
      if (doc.containsKey("temp_hysteresis")) tempHysteresis = doc["temp_hysteresis"];
      if (doc.containsKey("vib_warn_limit")) vibWarnLimit = doc["vib_warn_limit"];
      if (doc.containsKey("vib_trip_limit")) vibTripLimit = doc["vib_trip_limit"];
      if (doc.containsKey("fault_time_limit_sec")) faultTimeLimitSec = doc["fault_time_limit_sec"];

      // Fault injection flags dari Dashboard
      if (doc.containsKey("fault_sensor_corrupt")) {
        simulateSensorFault = doc["fault_sensor_corrupt"];
      }
      if (doc.containsKey("fault_firebase_offline")) {
        simulateFirebaseFailure = doc["fault_firebase_offline"];
      }

      // Proses Command dari Dashboard
      if (doc.containsKey("command")) {
        String cmd = doc["command"].as<String>();
        if (cmd != "NONE") {
          Serial.println("[CMD] Perintah diterima dari Cloud: " + cmd);

          if (cmd == "START") {
            executeStartCommand("CLOUD_DASHBOARD");
          } else if (cmd == "STOP") {
            executeStopCommand("CLOUD_DASHBOARD");
          } else if (cmd == "RESET") {
            executeResetCommand("CLOUD_DASHBOARD");
          }

          // Kembalikan command ke NONE agar tidak tereksekusi ganda
          resetFirebaseCommand();
        }
      }
    }
  }
  http.end();
}

void resetFirebaseCommand() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = FIREBASE_HOST + "/machine_monitor/controls/command.json";
  if (FIREBASE_AUTH.length() > 0) url += "?auth=" + FIREBASE_AUTH;

  http.begin(client, url);
  http.setTimeout(1200);
  http.PUT("\"NONE\"");
  http.end();
}

void pushEventLog(const String& type, const String& message) {
  if (simulateFirebaseFailure || WiFi.status() != WL_CONNECTED) {
    Serial.printf("[LOCAL LOG] [%s] %s\n", type.c_str(), message.c_str());
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = FIREBASE_HOST + "/machine_monitor/event_logs.json";
  if (FIREBASE_AUTH.length() > 0) url += "?auth=" + FIREBASE_AUTH;

  http.begin(client, url);
  http.setTimeout(1500);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["type"] = type;
  doc["message"] = message;
  doc["timestamp"] = String(millis() / 1000) + "s";

  String payload;
  serializeJson(doc, payload);

  http.POST(payload);
  http.end();
}

String getStateString(MachineState st) {
  switch (st) {
    case STATE_NORMAL: return "NORMAL";
    case STATE_WARNING: return "WARNING";
    case STATE_TRIP: return "TRIP";
    case STATE_IDLE:
    default: return "IDLE";
  }
}
