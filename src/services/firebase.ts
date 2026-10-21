import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  limitToLast,
  query,
  Database,
} from "firebase/database";
import { TelemetryData, ControlParameters, EventLog } from "../types";

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private isSimulated = false;
  private simInterval: number | null = null;

  // Active state caches
  public telemetry: TelemetryData = {
    temperature: 42.5,
    vibration_g: 0.85,
    state: "IDLE",
    motor_led: false,
    buzzer: false,
    fault_duration_sec: 0.0,
    timestamp: Date.now() / 1000,
  };

  public controls: ControlParameters = {
    mode: "AUTO",
    command: "NONE",
    temp_warn_limit: 70.0,
    temp_trip_limit: 85.0,
    temp_hysteresis: 3.0,
    vib_warn_limit: 2.5,
    vib_trip_limit: 4.0,
    fault_time_limit_sec: 5,
    fault_sensor_corrupt: false,
    fault_firebase_offline: false,
  };

  public eventLogs: EventLog[] = [];

  // Listeners
  private telemetryCallbacks: ((data: TelemetryData) => void)[] = [];
  private controlsCallbacks: ((data: ControlParameters) => void)[] = [];
  private logsCallbacks: ((logs: EventLog[]) => void)[] = [];
  private connectionCallbacks: ((
    connected: boolean,
    status: string
  ) => void)[] = [];

  public init(databaseURL?: string) {
    const savedUrl = databaseURL || localStorage.getItem("fb_database_url");

    if (!savedUrl) {
      this.startSimulator();
      return;
    }

    try {
      if (!getApps().length) {
        this.app = initializeApp({ databaseURL: savedUrl });
      } else {
        this.app = getApp();
      }

      this.db = getDatabase(this.app);
      this.isSimulated = false;
      if (this.simInterval) clearInterval(this.simInterval);

      this.notifyConnection(true, "ONLINE (FIREBASE)");
      this.attachFirebaseListeners();
      this.logEvent(
        "STATE",
        "Terhubung ke Firebase Realtime Database: " + savedUrl
      );
    } catch (err: any) {
      console.error("Firebase init failed:", err);
      this.notifyConnection(false, "FIREBASE_FAIL");
      this.startSimulator();
    }
  }

  public startSimulator() {
    this.isSimulated = true;
    this.notifyConnection(true, "SIMULATOR ACTIVE");
    this.logEvent(
      "STATE",
      "Sistem beroperasi dalam mode Simulator Lokal (Full Interactive)"
    );

    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = window.setInterval(() => {
      this.runSimulatorTick();
    }, 500);
  }

  private attachFirebaseListeners() {
    if (!this.db) return;

    // 1. Telemetry
    const telemetryRef = ref(this.db, "machine_monitor/telemetry");
    onValue(telemetryRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        this.telemetry = { ...this.telemetry, ...val };
        this.telemetryCallbacks.forEach((cb) => cb(this.telemetry));
      }
    });

    // 2. Controls
    const controlsRef = ref(this.db, "machine_monitor/controls");
    onValue(controlsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        this.controls = { ...this.controls, ...val };
        this.controlsCallbacks.forEach((cb) => cb(this.controls));
      }
    });

    // 3. Event Logs
    const logsRef = query(
      ref(this.db, "machine_monitor/event_logs"),
      limitToLast(50)
    );
    onValue(logsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const loaded: EventLog[] = Object.keys(val).map((k) => ({
          id: k,
          ...val[k],
        }));
        this.eventLogs = loaded;
        this.logsCallbacks.forEach((cb) => cb(this.eventLogs));
      }
    });
  }

  // Two-way control methods
  public setMode(mode: "AUTO" | "MANUAL") {
    if (this.isSimulated) {
      this.controls.mode = mode;
      this.controlsCallbacks.forEach((cb) => cb(this.controls));
      this.logEvent("MODE", `Mode operasi diubah menjadi ${mode}`);
      return;
    }

    if (this.db) {
      set(ref(this.db, "machine_monitor/controls/mode"), mode);
    }
  }

  public sendCommand(cmd: "START" | "STOP" | "RESET") {
    if (this.isSimulated) {
      this.processSimulatedCommand(cmd);
      return;
    }

    if (this.db) {
      set(ref(this.db, "machine_monitor/controls/command"), cmd);
    }
  }

  public updateParameters(params: Partial<ControlParameters>) {
    if (this.isSimulated) {
      this.controls = { ...this.controls, ...params };
      this.controlsCallbacks.forEach((cb) => cb(this.controls));
      this.logEvent("PARAM", "Parameter ambang batas diperbarui di simulator");
      return;
    }

    if (this.db) {
      update(ref(this.db, "machine_monitor/controls"), params);
    }
  }

  public toggleFaultSensor(active: boolean) {
    this.controls.fault_sensor_corrupt = active;
    if (this.isSimulated) {
      this.logEvent(
        "FAULT",
        active
          ? "Fault Injection Skenario 4: Sensor Suhu rusak (NaN terdeteksi)"
          : "Fault Injection Skenario 4: Sensor dinormalkan"
      );
    } else if (this.db) {
      set(
        ref(this.db, "machine_monitor/controls/fault_sensor_corrupt"),
        active
      );
    }
    this.controlsCallbacks.forEach((cb) => cb(this.controls));
  }

  public toggleFaultFirebase(active: boolean) {
    this.controls.fault_firebase_offline = active;
    if (this.isSimulated) {
      this.logEvent(
        "FAULT",
        active
          ? "Fault Injection Skenario 5: Simulasi koneksi Firebase offline"
          : "Fault Injection Skenario 5: Simulasi koneksi Firebase pulih"
      );
      this.notifyConnection(
        !active,
        active ? "SIM_FAIL (OFFLINE)" : "SIMULATOR ACTIVE"
      );
    } else if (this.db) {
      set(
        ref(this.db, "machine_monitor/controls/fault_firebase_offline"),
        active
      );
    }
    this.controlsCallbacks.forEach((cb) => cb(this.controls));
  }

  // Simulator Engine
  private runSimulatorTick() {
    if (this.controls.fault_firebase_offline) return;

    const t = this.telemetry;
    const c = this.controls;

    // 1. Simulate sensor fluctuations
    if (c.fault_sensor_corrupt) {
      t.temperature = NaN;
      t.vibration_g = NaN;
    } else if (t.state === "NORMAL" || t.state === "WARNING") {
      t.temperature += (Math.random() - 0.48) * 0.4;
      t.vibration_g = Math.max(
        0.2,
        t.vibration_g + (Math.random() - 0.48) * 0.1
      );
    } else if (t.state === "IDLE" || t.state === "TRIP") {
      if (t.temperature > 30.0) t.temperature -= 0.6;
      if (t.vibration_g > 0.05) t.vibration_g -= 0.15;
    }

    // 2. Protections & State transitions
    const sensorBroken = isNaN(t.temperature) || isNaN(t.vibration_g);

    if (sensorBroken) {
      if (t.state !== "TRIP") {
        t.state = "TRIP";
        t.motor_led = false;
        t.buzzer = true;
        this.logEvent(
          "ALARM",
          "TRIP! Data sensor tidak valid / NaN (Safe State aktif)."
        );
      }
    } else if (t.state === "NORMAL") {
      if (
        t.temperature >= c.temp_warn_limit ||
        t.vibration_g >= c.vib_warn_limit
      ) {
        t.state = "WARNING";
        t.fault_duration_sec = 0.5;
        this.logEvent(
          "STATE",
          `NORMAL -> WARNING (Suhu: ${t.temperature.toFixed(1)}°C, Vibrasi: ${t.vibration_g.toFixed(2)}g)`
        );
      }
    } else if (t.state === "WARNING") {
      const isExceeded =
        t.temperature >= c.temp_warn_limit || t.vibration_g >= c.vib_warn_limit;

      if (isExceeded) {
        t.fault_duration_sec += 0.5;
        const directTrip =
          t.temperature >= c.temp_trip_limit ||
          t.vibration_g >= c.vib_trip_limit;
        const durationTrip = t.fault_duration_sec >= c.fault_time_limit_sec;

        if (directTrip || durationTrip) {
          t.state = "TRIP";
          t.motor_led = false;
          t.buzzer = true;
          const reason = directTrip
            ? "Ambang Trip Terlampaui!"
            : `Gangguan melebihi toleransi ${c.fault_time_limit_sec} detik!`;
          this.logEvent("ALARM", `TRIP! Motor dipadamkan: ${reason}`);
        }
      } else {
        const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
        if (t.temperature < safeTemp && t.vibration_g < c.vib_warn_limit) {
          t.state = "NORMAL";
          t.fault_duration_sec = 0;
          this.logEvent(
            "STATE",
            `WARNING -> NORMAL (Suhu turun di bawah hysteresis ${safeTemp.toFixed(1)}°C)`
          );
        }
      }
    }

    t.timestamp = Date.now() / 1000;
    this.telemetryCallbacks.forEach((cb) => cb({ ...t }));
  }

  // Interlock verification
  private processSimulatedCommand(cmd: "START" | "STOP" | "RESET") {
    const t = this.telemetry;
    const c = this.controls;

    if (cmd === "START") {
      // INTERLOCK CHECK 1: Machine in TRIP state?
      if (t.state === "TRIP") {
        this.logEvent(
          "INTERLOCK_REJECT",
          "Perintah START ditolak! Mesin dalam status TRIP. Lakukan RESET TRIP terlebih dahulu."
        );
        return;
      }

      // INTERLOCK CHECK 2: Temperature / vibration still hazardous?
      const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
      if (t.temperature >= safeTemp || t.vibration_g >= c.vib_warn_limit) {
        this.logEvent(
          "INTERLOCK_REJECT",
          `Perintah START ditolak! Suhu (${t.temperature.toFixed(1)}°C) belum di bawah hysteresis (${safeTemp.toFixed(1)}°C).`
        );
        return;
      }

      t.state = "NORMAL";
      t.motor_led = true;
      t.buzzer = false;
      this.logEvent("STATE", "IDLE -> NORMAL (Motor dinyalakan berhasil)");
    } else if (cmd === "STOP") {
      t.state = "IDLE";
      t.motor_led = false;
      t.buzzer = false;
      t.fault_duration_sec = 0;
      this.logEvent(
        "STATE",
        "Perintah STOP dieksekusi. Mesin masuk status IDLE."
      );
    } else if (cmd === "RESET") {
      const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
      if (t.temperature >= safeTemp || isNaN(t.temperature)) {
        this.logEvent(
          "INTERLOCK_REJECT",
          `Perintah RESET ditolak! Suhu masih terlalu panas (${t.temperature.toFixed(1)}°C >= ${safeTemp.toFixed(1)}°C) atau sensor invalid.`
        );
        return;
      }

      t.state = "IDLE";
      t.motor_led = false;
      t.buzzer = false;
      t.fault_duration_sec = 0;
      this.logEvent(
        "STATE",
        "Status TRIP berhasil di-reset. Mesin kembali ke IDLE."
      );
    }

    this.telemetryCallbacks.forEach((cb) => cb({ ...t }));
  }

  private logEvent(type: EventLog["type"], message: string) {
    const d = new Date();
    const timeStr = d.toLocaleTimeString("id-ID");
    const item: EventLog = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: timeStr,
      type,
      message,
    };

    this.eventLogs.push(item);
    this.logsCallbacks.forEach((cb) => cb([...this.eventLogs]));
  }

  private notifyConnection(connected: boolean, status: string) {
    this.connectionCallbacks.forEach((cb) => cb(connected, status));
  }

  // Subscription registers
  public onTelemetry(cb: (data: TelemetryData) => void) {
    this.telemetryCallbacks.push(cb);
    cb(this.telemetry);
  }

  public onControls(cb: (data: ControlParameters) => void) {
    this.controlsCallbacks.push(cb);
    cb(this.controls);
  }

  public onLogs(cb: (logs: EventLog[]) => void) {
    this.logsCallbacks.push(cb);
    cb(this.eventLogs);
  }

  public onConnection(cb: (connected: boolean, status: string) => void) {
    this.connectionCallbacks.push(cb);
  }
}

export const firebaseService = new FirebaseService();
