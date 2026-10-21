import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  limitToLast,
  query,
  Database
} from "firebase/database";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  Auth
} from "firebase/auth";
import {
  MachineState,
  TelemetryData,
  ControlParameters,
  EventLog,
  AuthUserInfo
} from "../types";

export const defaultFirebaseConfig = {
  apiKey: "AIzaSyDRqBoh11BuZHcqYkOPHrqbtkudrbKbyD4",
  authDomain: "iot-uts-264a9.firebaseapp.com",
  databaseURL: "https://iot-uts-264a9-default-rtdb.firebaseio.com",
  projectId: "iot-uts-264a9",
  storageBucket: "iot-uts-264a9.firebasestorage.app",
  messagingSenderId: "604382295790",
  appId: "1:604382295790:web:bdf60dcb3dfe89d289a5ff",
  measurementId: "G-77J35ZD73W"
};

export const defaultAuthCredentials = {
  email: "esp32.kelompok6@gmail.com",
  password: "Mkbsehat",
  uid: "DJOtoRAtJqQOgBNzDBgkP2pTtY83"
};

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private auth: Auth | null = null;
  private isSimulated = false;
  private simInterval: number | null = null;

  private isConnected = true;
  private currentConnectionStatus = "ONLINE (FIREBASE)";

  // Active state caches matching Firebase RTDB
  public telemetry: TelemetryData = {
    temperature: 26.7,
    vibration_g: 0.0,
    state: "RUNNING",
    motor_led: true,
    buzzer: false,
    fault_duration_sec: 0.0,
    timestamp: Date.now() / 1000
  };

  public controls: ControlParameters = {
    mode: "AUTO",
    command: "NONE",
    temp_warn_limit: 35.0,
    temp_trip_limit: 45.0,
    temp_hysteresis: 3.0,
    vib_warn_limit: 2.0,
    vib_trip_limit: 4.0,
    fault_time_limit_sec: 5,
    fault_sensor_corrupt: false,
    fault_firebase_offline: false
  };

  public eventLogs: EventLog[] = [];
  public authInfo: AuthUserInfo = {
    email: defaultAuthCredentials.email,
    uid: defaultAuthCredentials.uid,
    isAuthenticated: false
  };

  // Listeners
  private telemetryCallbacks: ((data: TelemetryData) => void)[] = [];
  private controlsCallbacks: ((data: ControlParameters) => void)[] = [];
  private logsCallbacks: ((logs: EventLog[]) => void)[] = [];
  private connectionCallbacks: ((
    connected: boolean,
    status: string
  ) => void)[] = [];
  private authCallbacks: ((info: AuthUserInfo) => void)[] = [];

  public async init(databaseURL?: string) {
    const targetUrl =
      databaseURL && databaseURL.trim().length > 0
        ? databaseURL.trim().replace(/\/+$/, "")
        : defaultFirebaseConfig.databaseURL;

    localStorage.setItem("fb_database_url", targetUrl);

    try {
      const cfg = {
        ...defaultFirebaseConfig,
        databaseURL: targetUrl
      };

      if (!getApps().length) {
        this.app = initializeApp(cfg);
      } else {
        this.app = getApp();
      }

      this.db = getDatabase(this.app);
      this.auth = getAuth(this.app);
      this.isSimulated = false;
      if (this.simInterval) {
        clearInterval(this.simInterval);
        this.simInterval = null;
      }

      this.notifyConnection(true, "ONLINE (FIREBASE)");

      // Firebase Authentication with user credentials first
      await this.setupAuthentication();
      this.attachFirebaseListeners();

      this.logEvent(
        "STATE",
        "Terhubung ke Firebase Realtime Database: " + targetUrl
      );
    } catch (err: any) {
      console.error("Firebase init failed:", err);
      this.notifyConnection(false, "FIREBASE_FAIL");
      this.startSimulator();
    }
  }

  private async setupAuthentication() {
    if (!this.auth) return;

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.authInfo = {
          email: user.email || defaultAuthCredentials.email,
          uid: user.uid,
          isAuthenticated: true
        };
        this.notifyAuth(this.authInfo);
        this.notifyConnection(true, "ONLINE (FIREBASE)");
        this.logEvent(
          "STATE",
          `Firebase Auth aktif: ${user.email} (UID: ${user.uid.substring(0, 8)}...)`
        );
      } else {
        this.authInfo = {
          email: null,
          uid: null,
          isAuthenticated: false
        };
        this.notifyAuth(this.authInfo);
      }
    });

    try {
      const cred = await signInWithEmailAndPassword(
        this.auth,
        defaultAuthCredentials.email,
        defaultAuthCredentials.password
      );
      console.log("[Firebase Auth] Sukses login:", cred.user.email, cred.user.uid);
      this.authInfo = {
        email: cred.user.email,
        uid: cred.user.uid,
        isAuthenticated: true
      };
      this.notifyAuth(this.authInfo);
      this.notifyConnection(true, "ONLINE (FIREBASE)");
    } catch (authErr: any) {
      console.error("[Firebase Auth Login Error]:", authErr.message);
      this.authInfo = {
        email: defaultAuthCredentials.email,
        uid: defaultAuthCredentials.uid,
        isAuthenticated: true
      };
      this.notifyAuth(this.authInfo);
    }
  }

  public async signOutUser() {
    if (this.auth) {
      await signOut(this.auth);
    }
    this.authInfo = { email: null, uid: null, isAuthenticated: false };
    this.notifyAuth(this.authInfo);
  }

  public async signInUser(email?: string, pass?: string) {
    if (!this.auth) return;
    try {
      await signInWithEmailAndPassword(
        this.auth,
        email || defaultAuthCredentials.email,
        pass || defaultAuthCredentials.password
      );
    } catch (err: any) {
      alert("Login gagal: " + err.message);
    }
  }

  public startSimulator() {
    this.isSimulated = true;
    this.notifyConnection(true, "SIMULATOR ACTIVE");
    this.authInfo = {
      email: defaultAuthCredentials.email,
      uid: defaultAuthCredentials.uid,
      isAuthenticated: true
    };
    this.notifyAuth(this.authInfo);

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

    // Helper: update telemetry state
    const applyTelemetry = (val: any) => {
      if (!val) return;
      this.isSimulated = false;
      if (this.simInterval) {
        clearInterval(this.simInterval);
        this.simInterval = null;
      }

      const temp =
        val.temperature !== undefined
          ? Number(val.temperature)
          : val.temp !== undefined
          ? Number(val.temp)
          : this.telemetry.temperature;

      const vib =
        val.vibration !== undefined
          ? Number(val.vibration)
          : val.vibration_g !== undefined
          ? Number(val.vibration_g)
          : this.telemetry.vibration_g;

      let st = (val.state || this.telemetry.state) as MachineState;
      if (st === "RUNNING") {
        st = "NORMAL";
      }

      const relayOn =
        val.relay === "ON" ||
        val.relay === true ||
        val.motor_led === true ||
        val.motorRunning === true ||
        val.state === "RUNNING";
      const buzzOn =
        val.buzzer === true || val.buzzerActive === true || st === "TRIP";
      const faultDur =
        val.fault_duration_sec !== undefined
          ? Number(val.fault_duration_sec)
          : val.faultDurationSec !== undefined
          ? Number(val.faultDurationSec)
          : this.telemetry.fault_duration_sec;

      let ts = Date.now() / 1000;
      if (typeof val.timestamp === "number") {
        ts =
          val.timestamp > 1000000000000 ? val.timestamp / 1000 : val.timestamp;
      }

      this.telemetry = {
        temperature: temp,
        vibration_g: vib,
        state: st,
        motor_led: relayOn,
        buzzer: buzzOn,
        fault_duration_sec: faultDur,
        timestamp: ts
      };
      this.telemetryCallbacks.forEach((cb) => cb(this.telemetry));
      this.notifyConnection(true, "ONLINE (FIREBASE)");
    };

    // 1A. Listen to mesin6/status (Actual Realtime Database schema from ESP32 Wokwi)
    const mesin6StatusRef = ref(this.db, "mesin6/status");
    onValue(mesin6StatusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyTelemetry(val);
    });

    // 1B. Listen to /status (Fallback)
    const statusRef = ref(this.db, "status");
    onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyTelemetry(val);
    });

    // 1C. Listen to /machine_monitor/telemetry (Fallback)
    const telemetryRef = ref(this.db, "machine_monitor/telemetry");
    onValue(telemetryRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyTelemetry(val);
    });

    // Helper: update controls state
    const applyControls = (val: any) => {
      if (!val) return;
      this.controls = {
        ...this.controls,
        mode: (val.mode || this.controls.mode) as "AUTO" | "MANUAL",
        command: val.command || val.cmd || this.controls.command,
        temp_warn_limit:
          val.tempWarning !== undefined
            ? Number(val.tempWarning)
            : val.temp_warn_limit !== undefined
            ? Number(val.temp_warn_limit)
            : this.controls.temp_warn_limit,
        temp_trip_limit:
          val.tempTrip !== undefined
            ? Number(val.tempTrip)
            : val.temp_trip_limit !== undefined
            ? Number(val.temp_trip_limit)
            : this.controls.temp_trip_limit,
        temp_hysteresis:
          val.tempHysteresis !== undefined
            ? Number(val.tempHysteresis)
            : val.temp_hysteresis !== undefined
            ? Number(val.temp_hysteresis)
            : this.controls.temp_hysteresis,
        vib_warn_limit:
          val.vibWarning !== undefined
            ? Number(val.vibWarning)
            : val.vib_warn_limit !== undefined
            ? Number(val.vib_warn_limit)
            : this.controls.vib_warn_limit,
        vib_trip_limit:
          val.vibTrip !== undefined
            ? Number(val.vibTrip)
            : val.vib_trip_limit !== undefined
            ? Number(val.vib_trip_limit)
            : this.controls.vib_trip_limit,
        fault_time_limit_sec:
          val.faultTimeLimitSec !== undefined
            ? Number(val.faultTimeLimitSec)
            : val.fault_time_limit_sec !== undefined
            ? Number(val.fault_time_limit_sec)
            : this.controls.fault_time_limit_sec,
        fault_sensor_corrupt:
          val.simSensorFault !== undefined
            ? Boolean(val.simSensorFault)
            : val.fault_sensor_corrupt !== undefined
            ? Boolean(val.fault_sensor_corrupt)
            : this.controls.fault_sensor_corrupt,
        fault_firebase_offline:
          val.simFirebaseFailure !== undefined
            ? Boolean(val.simFirebaseFailure)
            : val.fault_firebase_offline !== undefined
            ? Boolean(val.fault_firebase_offline)
            : this.controls.fault_firebase_offline
      };
      this.controlsCallbacks.forEach((cb) => cb(this.controls));
    };

    // 2A. Listen to mesin6/control
    const mesin6ControlRef = ref(this.db, "mesin6/control");
    onValue(mesin6ControlRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyControls(val);
    });

    // 2B. Listen to root for controls
    const rootRef = ref(this.db);
    onValue(rootRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val.mesin6 && val.mesin6.control) {
        applyControls(val.mesin6.control);
      } else if (val) {
        applyControls(val);
      }
    });

    // 2C. Listen to machine_monitor/controls
    const controlsRef = ref(this.db, "machine_monitor/controls");
    onValue(controlsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyControls(val);
    });

    // Helper: update event logs
    const applyEvents = (val: any) => {
      if (!val) return;
      const loaded: EventLog[] = Object.keys(val).map((k) => {
        const item = val[k];
        let timestamp = new Date().toLocaleTimeString("id-ID");
        if (typeof item === "string") {
          return { id: k, timestamp, type: "STATE", message: item };
        }
        if (typeof item.timestamp === "number") {
          timestamp = new Date(
            item.timestamp > 1000000000000 ? item.timestamp : item.timestamp * 1000
          ).toLocaleTimeString("id-ID");
        } else if (item.timestamp) {
          timestamp = String(item.timestamp);
        } else if (item.time) {
          timestamp = String(item.time);
        }
        const msg =
          item.message ||
          item.msg ||
          item.event ||
          item.description ||
          JSON.stringify(item);
        const upper = msg.toUpperCase();
        const rawType = (item.type || "").toUpperCase();
        let type: EventLog["type"] = "STATE";

        if (
          rawType === "CMD_REJECTED" ||
          upper.includes("DITOLAK") ||
          upper.includes("REJECT")
        ) {
          type = "INTERLOCK_REJECT";
        } else if (
          rawType === "ALARM" ||
          rawType === "ALARM_ACK" ||
          upper.includes("TRIP") ||
          upper.includes("ALARM")
        ) {
          type = "ALARM";
        } else if (
          rawType === "FAULT" ||
          upper.includes("FAULT") ||
          upper.includes("NAN")
        ) {
          type = "FAULT";
        } else if (rawType === "MODE" || upper.includes("MODE")) {
          type = "MODE";
        } else {
          type = "STATE";
        }

        return { id: k, timestamp, type, message: msg };
      });
      this.eventLogs = loaded;
      this.logsCallbacks.forEach((cb) => cb(this.eventLogs));
    };

    // 3A. Listen to mesin6/events
    const mesin6EventsRef = query(ref(this.db, "mesin6/events"), limitToLast(60));
    onValue(mesin6EventsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyEvents(val);
    });

    // 3B. Listen to /events
    const eventsRef = query(ref(this.db, "events"), limitToLast(60));
    onValue(eventsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyEvents(val);
    });

    // 3C. Listen to /machine_monitor/event_logs
    const logsRef = query(
      ref(this.db, "machine_monitor/event_logs"),
      limitToLast(60)
    );
    onValue(logsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) applyEvents(val);
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
      set(ref(this.db, "mesin6/control/mode"), mode);
      update(ref(this.db), { mode });
      set(ref(this.db, "status/mode"), mode);
      set(ref(this.db, "machine_monitor/controls/mode"), mode);
      this.logEvent("MODE", `Mode operasi diubah menjadi ${mode}`);
    }
  }

  public sendCommand(cmd: "START" | "STOP" | "RESET") {
    if (this.isSimulated) {
      this.processSimulatedCommand(cmd);
      return;
    }

    if (this.db) {
      const cmdId = Date.now();
      update(ref(this.db, "mesin6/control"), {
        cmdId: cmdId,
        cmd: cmd,
        command: cmd
      });
      update(ref(this.db), {
        cmdId: cmdId,
        command: cmd
      });
      set(ref(this.db, "status/command"), cmd);
      set(ref(this.db, "machine_monitor/controls/command"), cmd);
      this.logEvent("STATE", `Perintah ${cmd} dikirim ke ESP32 (cmdId: ${cmdId})`);
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
      const updates: any = {};
      if (params.temp_warn_limit !== undefined) {
        updates.tempWarning = params.temp_warn_limit;
      }
      if (params.temp_trip_limit !== undefined) {
        updates.tempTrip = params.temp_trip_limit;
      }
      if (params.vib_warn_limit !== undefined) {
        updates.vibWarning = params.vib_warn_limit;
      }
      if (params.vib_trip_limit !== undefined) {
        updates.vibTrip = params.vib_trip_limit;
      }
      update(ref(this.db, "mesin6/control"), updates);
      update(ref(this.db), updates);
      update(ref(this.db, "machine_monitor/controls"), params);
      this.logEvent("PARAM", "Parameter ambang batas disimpan ke Firebase");
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
      set(ref(this.db, "mesin6/control/simSensorFault"), active);
      update(ref(this.db), { simSensorFault: active });
      set(ref(this.db, "status/sensorFault"), active);
      set(ref(this.db, "machine_monitor/controls/fault_sensor_corrupt"), active);
      this.logEvent(
        "FAULT",
        active
          ? "Fault Injection Skenario 4: Sensor Suhu rusak diaktifkan"
          : "Fault Injection Skenario 4: Sensor dinormalkan"
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
      update(ref(this.db), { simFirebaseFailure: active });
      set(
        ref(this.db, "machine_monitor/controls/fault_firebase_offline"),
        active
      );
      this.logEvent(
        "FAULT",
        active
          ? "Fault Injection Skenario 5: Koneksi Firebase disimulasikan gagal"
          : "Fault Injection Skenario 5: Koneksi Firebase dinormalkan"
      );
    }
    this.controlsCallbacks.forEach((cb) => cb(this.controls));
  }

  // Simulator Engine
  private runSimulatorTick() {
    if (this.controls.fault_firebase_offline) return;

    const t = this.telemetry;
    const c = this.controls;

    // 1. Sensor fluctuations
    if (c.fault_sensor_corrupt) {
      t.temperature = NaN;
      t.vibration_g = NaN;
    } else if (t.state === "NORMAL" || t.state === "WARNING") {
      t.temperature += (Math.random() - 0.48) * 0.4;
      t.vibration_g = Math.max(0.2, t.vibration_g + (Math.random() - 0.48) * 0.1);
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
        this.logEvent("ALARM", "TRIP! Data sensor tidak valid / NaN (Safe State aktif).");
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
        t.temperature >= c.temp_warn_limit ||
        t.vibration_g >= c.vib_warn_limit;

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
      if (t.state === "TRIP") {
        this.logEvent(
          "INTERLOCK_REJECT",
          "Perintah START ditolak! Mesin dalam status TRIP. Lakukan RESET TRIP terlebih dahulu."
        );
        return;
      }

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
      this.logEvent("STATE", "Perintah STOP dieksekusi. Mesin masuk status IDLE.");
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
      this.logEvent("STATE", "Status TRIP berhasil di-reset. Mesin kembali ke IDLE.");
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
      message
    };

    this.eventLogs.push(item);
    this.logsCallbacks.forEach((cb) => cb([...this.eventLogs]));
  }

  private notifyConnection(connected: boolean, status: string) {
    this.isConnected = connected;
    this.currentConnectionStatus = status;
    this.connectionCallbacks.forEach((cb) => cb(connected, status));
  }

  private notifyAuth(info: AuthUserInfo) {
    this.authCallbacks.forEach((cb) => cb(info));
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
    cb(this.isConnected, this.currentConnectionStatus);
  }

  public onAuth(cb: (info: AuthUserInfo) => void) {
    this.authCallbacks.push(cb);
    cb(this.authInfo);
  }
}

export const firebaseService = new FirebaseService();
