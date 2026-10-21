/**
 * Machine Condition Monitoring & Protection System (Topic 6)
 * Real-time Dashboard Controller
 */

// Application State Store
const state = {
  isSimulated: false,
  firebaseApp: null,
  database: null,
  dbRef: null,
  lastTelemetryTime: 0,
  activeFilter: "ALL",
  faultInjection: {
    sensorCorrupt: false,
    firebaseOffline: false,
  },
  // Active telemetry cache
  telemetry: {
    temperature: 42.0,
    vibration_g: 0.85,
    state: "IDLE",
    motor_led: false,
    buzzer: false,
    fault_duration_sec: 0.0,
    timestamp: Date.now() / 1000,
  },
  // Active control parameter cache
  controls: {
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
  },
  eventLogs: [],
};

// DOM Selectors
const DOM = {
  // Status Header
  stateBadgeContainer: document.getElementById("state-badge-container"),
  stateLed: document.getElementById("state-led"),
  machineStateText: document.getElementById("machine-state-text"),
  commLed: document.getElementById("comm-led"),
  commStatusText: document.getElementById("comm-status-text"),
  lastSeenText: document.getElementById("last-seen-text"),
  telemetryTimestamp: document.getElementById("telemetry-timestamp"),

  // Sensor Telemetry Cards
  valTemperature: document.getElementById("val-temperature"),
  barTemperature: document.getElementById("bar-temperature"),
  badgeTempZone: document.getElementById("badge-temp-zone"),
  labelTempWarn: document.getElementById("label-temp-warn"),
  labelTempTrip: document.getElementById("label-temp-trip"),
  hysteresisDesc: document.getElementById("hysteresis-desc"),

  valVibration: document.getElementById("val-vibration"),
  barVibration: document.getElementById("bar-vibration"),
  badgeVibZone: document.getElementById("badge-vib-zone"),
  labelVibWarn: document.getElementById("label-vib-warn"),
  labelVibTrip: document.getElementById("label-vib-trip"),

  valFaultDuration: document.getElementById("val-fault-duration"),
  labelFaultLimit: document.getElementById("label-fault-limit"),
  barFaultDuration: document.getElementById("bar-fault-duration"),
  badgeTimerState: document.getElementById("badge-timer-state"),

  ledMotorDot: document.getElementById("led-motor-dot"),
  textMotorStatus: document.getElementById("text-motor-status"),
  ledBuzzerDot: document.getElementById("led-buzzer-dot"),
  textBuzzerStatus: document.getElementById("text-buzzer-status"),

  // Control Panel
  currentModeLabel: document.getElementById("current-mode-label"),
  btnModeAuto: document.getElementById("btn-mode-auto"),
  btnModeManual: document.getElementById("btn-mode-manual"),
  btnCmdStart: document.getElementById("btn-cmd-start"),
  btnCmdStop: document.getElementById("btn-cmd-stop"),
  btnCmdReset: document.getElementById("btn-cmd-reset"),

  // Banner
  interlockBanner: document.getElementById("interlock-banner"),
  interlockBannerMsg: document.getElementById("interlock-banner-msg"),
  btnCloseInterlockBanner: document.getElementById(
    "btn-close-interlock-banner"
  ),

  // Parameter Inputs
  inputTempWarn: document.getElementById("input-temp-warn"),
  inputTempTrip: document.getElementById("input-temp-trip"),
  inputTempHyst: document.getElementById("input-temp-hyst"),
  inputVibWarn: document.getElementById("input-vib-warn"),
  inputVibTrip: document.getElementById("input-vib-trip"),
  inputFaultTime: document.getElementById("input-fault-time"),
  btnSaveParams: document.getElementById("btn-save-params"),

  // Fault Injection Buttons
  btnToggleFaultSensor: document.getElementById("btn-toggle-fault-sensor"),
  btnToggleFaultFirebase: document.getElementById("btn-toggle-fault-firebase"),

  // Logs
  logTableBody: document.getElementById("log-table-body"),
  selectLogFilter: document.getElementById("select-log-filter"),
  btnClearLogView: document.getElementById("btn-clear-log-view"),

  // Modal
  modalFirebaseConfig: document.getElementById("modal-firebase-config"),
  btnOpenConfig: document.getElementById("btn-open-config"),
  btnCloseModal: document.getElementById("btn-close-modal"),
  cfgDatabaseUrl: document.getElementById("cfg-database-url"),
  cfgAuthToken: document.getElementById("cfg-auth-token"),
  btnSaveFirebaseCfg: document.getElementById("btn-save-firebase-cfg"),
  btnUseSimulator: document.getElementById("btn-use-simulator"),
};

// Application Initialization
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadSavedConfig();
  startHeartbeatMonitor();
});

// Event Listeners Registration
function setupEventListeners() {
  // Modal handlers
  DOM.btnOpenConfig.addEventListener("click", () => toggleModal(true));
  DOM.btnCloseModal.addEventListener("click", () => toggleModal(false));
  DOM.btnSaveFirebaseCfg.addEventListener("click", handleSaveFirebaseConfig);
  DOM.btnUseSimulator.addEventListener("click", startSimulatorMode);

  // Interlock Banner Dismiss
  DOM.btnCloseInterlockBanner.addEventListener("click", () => {
    DOM.interlockBanner.classList.add("hidden");
  });

  // Machine Mode Control
  DOM.btnModeAuto.addEventListener("click", () => setMachineMode("AUTO"));
  DOM.btnModeManual.addEventListener("click", () => setMachineMode("MANUAL"));

  // Machine Command Actions
  DOM.btnCmdStart.addEventListener("click", () => sendCommand("START"));
  DOM.btnCmdStop.addEventListener("click", () => sendCommand("STOP"));
  DOM.btnCmdReset.addEventListener("click", () => sendCommand("RESET"));

  // Parameters Update
  DOM.btnSaveParams.addEventListener("click", handleSaveParameters);

  // Fault Injections
  DOM.btnToggleFaultSensor.addEventListener("click", toggleFaultSensor);
  DOM.btnToggleFaultFirebase.addEventListener("click", toggleFaultFirebase);

  // Event Logs Actions
  DOM.selectLogFilter.addEventListener("change", (e) => {
    state.activeFilter = e.target.value;
    renderEventLogs();
  });
  DOM.btnClearLogView.addEventListener("click", () => {
    state.eventLogs = [];
    renderEventLogs();
  });
}

function toggleModal(open) {
  if (open) {
    DOM.modalFirebaseConfig.classList.remove("hidden");
  } else {
    DOM.modalFirebaseConfig.classList.add("hidden");
  }
}

// Config Persistence
function loadSavedConfig() {
  const savedUrl = localStorage.getItem("fb_database_url");
  const savedToken = localStorage.getItem("fb_auth_token");

  if (savedUrl) {
    DOM.cfgDatabaseUrl.value = savedUrl;
    if (savedToken) DOM.cfgAuthToken.value = savedToken;
    initFirebase(savedUrl, savedToken);
  } else {
    // Default to Simulator mode if no configuration provided yet
    startSimulatorMode();
  }
}

function handleSaveFirebaseConfig() {
  const url = DOM.cfgDatabaseUrl.value.trim();
  const token = DOM.cfgAuthToken.value.trim();

  if (!url) {
    alert("Silakan masukkan Database URL Firebase Anda.");
    return;
  }

  localStorage.setItem("fb_database_url", url);
  localStorage.setItem("fb_auth_token", token);
  toggleModal(false);
  initFirebase(url, token);
}

// Firebase Realtime Database Integration
function initFirebase(databaseURL, authToken) {
  state.isSimulated = false;
  if (window.simInterval) clearInterval(window.simInterval);

  try {
    const config = { databaseURL };
    if (!firebase.apps.length) {
      state.firebaseApp = firebase.initializeApp(config);
    } else {
      state.firebaseApp = firebase.app();
    }

    state.database = firebase.database();
    state.dbRef = state.database.ref("machine_monitor");

    setConnectionStatus(
      "ONLINE (FIREBASE)",
      "bg-emerald-500",
      "text-emerald-400"
    );

    // Listen to Telemetry Node
    state.dbRef.child("telemetry").on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        state.telemetry = { ...state.telemetry, ...data };
        state.lastTelemetryTime = Date.now();
        renderTelemetry();
      }
    });

    // Listen to Controls Node
    state.dbRef.child("controls").on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        state.controls = { ...state.controls, ...data };
        renderControls();
      }
    });

    // Listen to Event Logs Node
    state.dbRef
      .child("event_logs")
      .limitToLast(60)
      .on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
          state.eventLogs = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          renderEventLogs();
          checkForRecentRejection();
        }
      });

    logLocalEvent(
      "INFO",
      "Terhubung ke Firebase Realtime Database: " + databaseURL
    );
  } catch (err) {
    console.error("Firebase init error:", err);
    setConnectionStatus("FIREBASE_FAIL", "bg-rose-500", "text-rose-400");
    alert("Koneksi Firebase gagal: " + err.message);
  }
}

// Machine Controls Dispatcher
function setMachineMode(mode) {
  if (state.isSimulated) {
    state.controls.mode = mode;
    renderControls();
    logLocalEvent("MODE", `Mode operasi diubah menjadi ${mode}`);
    return;
  }

  if (state.dbRef) {
    state.dbRef.child("controls/mode").set(mode);
  }
}

function sendCommand(cmd) {
  if (state.isSimulated) {
    processSimulatedCommand(cmd);
    return;
  }

  if (state.dbRef) {
    state.dbRef
      .child("controls/command")
      .set(cmd)
      .catch((err) => {
        console.error("Gagal mengirim perintah:", err);
      });
  }
}

function handleSaveParameters() {
  const params = {
    temp_warn_limit: parseFloat(DOM.inputTempWarn.value) || 70.0,
    temp_trip_limit: parseFloat(DOM.inputTempTrip.value) || 85.0,
    temp_hysteresis: parseFloat(DOM.inputTempHyst.value) || 3.0,
    vib_warn_limit: parseFloat(DOM.inputVibWarn.value) || 2.5,
    vib_trip_limit: parseFloat(DOM.inputVibTrip.value) || 4.0,
    fault_time_limit_sec: parseInt(DOM.inputFaultTime.value, 10) || 5,
  };

  if (state.isSimulated) {
    state.controls = { ...state.controls, ...params };
    renderControls();
    logLocalEvent("PARAM", "Parameter ambang batas diperbarui di simulator");
    alert("Parameter berhasil diperbarui di memori lokal.");
    return;
  }

  if (state.dbRef) {
    state.dbRef
      .child("controls")
      .update(params)
      .then(() => {
        alert("Parameter berhasil disimpan ke Firebase.");
      })
      .catch((err) => {
        alert("Gagal menyimpan ke Firebase: " + err.message);
      });
  }
}

function toggleFaultSensor() {
  state.faultInjection.sensorCorrupt = !state.faultInjection.sensorCorrupt;
  const active = state.faultInjection.sensorCorrupt;

  DOM.btnToggleFaultSensor.textContent = active
    ? "Pemicu: Sensor Rusak (AKTIF!)"
    : "Pemicu: Sensor Rusak (OFF)";
  DOM.btnToggleFaultSensor.className = active
    ? "w-full mt-3 py-1.5 text-xs font-bold rounded border border-rose-500 bg-rose-600 text-white transition animate-pulse"
    : "w-full mt-3 py-1.5 text-xs font-bold rounded border border-rose-700 bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition";

  if (state.isSimulated) {
    logLocalEvent(
      "FAULT",
      active
        ? "Fault Injection Skenario 4: Sensor Suhu rusak (NaN terdeteksi)"
        : "Fault Injection Skenario 4: Sensor dinormalkan"
    );
    return;
  }

  if (state.dbRef) {
    state.dbRef.child("controls/fault_sensor_corrupt").set(active);
  }
}

function toggleFaultFirebase() {
  state.faultInjection.firebaseOffline = !state.faultInjection.firebaseOffline;
  const active = state.faultInjection.firebaseOffline;

  DOM.btnToggleFaultFirebase.textContent = active
    ? "Pemicu: Jaringan Putus (AKTIF!)"
    : "Pemicu: Jaringan Putus (OFF)";
  DOM.btnToggleFaultFirebase.className = active
    ? "w-full mt-3 py-1.5 text-xs font-bold rounded border border-amber-500 bg-amber-600 text-white transition animate-pulse"
    : "w-full mt-3 py-1.5 text-xs font-bold rounded border border-amber-700 bg-amber-950/60 hover:bg-amber-900 text-amber-300 transition";

  if (state.isSimulated) {
    logLocalEvent(
      "FAULT",
      active
        ? "Fault Injection Skenario 5: Simulasi koneksi Firebase gagal"
        : "Fault Injection Skenario 5: Simulasi koneksi pulih"
    );
    return;
  }

  if (state.dbRef) {
    state.dbRef.child("controls/fault_firebase_offline").set(active);
  }
}

// UI Telemetry Rendering
function renderTelemetry() {
  const {
    temperature,
    vibration_g,
    state: machineState,
    motor_led,
    buzzer,
    fault_duration_sec,
    timestamp,
  } = state.telemetry;
  const {
    temp_warn_limit,
    temp_trip_limit,
    temp_hysteresis,
    vib_warn_limit,
    vib_trip_limit,
    fault_time_limit_sec,
  } = state.controls;

  // 1. State Machine Header Badge
  updateStateBadge(machineState);

  // 2. Temperature Metric & Bar
  const isTempValid =
    !isNaN(temperature) && temperature >= -20 && temperature <= 150;
  if (!isTempValid) {
    DOM.valTemperature.innerHTML = `ERR <span class="text-sm font-normal text-rose-400">NaN</span>`;
    DOM.badgeTempZone.textContent = "CORRUPT";
    DOM.badgeTempZone.className =
      "px-2 py-1 text-[11px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-700";
    DOM.barTemperature.style.width = "100%";
    DOM.barTemperature.className = "bg-rose-600 h-full";
  } else {
    DOM.valTemperature.innerHTML = `${temperature.toFixed(1)} <span class="text-sm font-normal text-slate-400">°C</span>`;

    // Zone evaluation
    let tempPct = Math.min(
      100,
      Math.max(0, (temperature / (temp_trip_limit * 1.15)) * 100)
    );
    DOM.barTemperature.style.width = `${tempPct}%`;

    if (temperature >= temp_trip_limit) {
      DOM.badgeTempZone.textContent = "TRIP ZONE";
      DOM.badgeTempZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-rose-950 text-rose-400 border border-rose-700";
      DOM.barTemperature.className = "bg-rose-500 h-full";
    } else if (temperature >= temp_warn_limit) {
      DOM.badgeTempZone.textContent = "WARNING";
      DOM.badgeTempZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-amber-950 text-amber-400 border border-amber-700";
      DOM.barTemperature.className = "bg-amber-500 h-full";
    } else {
      DOM.badgeTempZone.textContent = "NORMAL";
      DOM.badgeTempZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-slate-800 text-emerald-400 border border-slate-700";
      DOM.barTemperature.className = "bg-emerald-500 h-full";
    }
  }

  DOM.labelTempWarn.textContent = `Warn: ${temp_warn_limit.toFixed(1)}°C`;
  DOM.labelTempTrip.textContent = `Trip: ${temp_trip_limit.toFixed(1)}°C`;
  DOM.hysteresisDesc.textContent = `Hysteresis: Turun ${(temp_warn_limit - temp_hysteresis).toFixed(1)}°C untuk pulih`;

  // 3. Vibration Metric & Bar
  const isVibValid = !isNaN(vibration_g) && vibration_g >= 0;
  if (!isVibValid) {
    DOM.valVibration.innerHTML = `ERR <span class="text-sm font-normal text-rose-400">NaN</span>`;
    DOM.badgeVibZone.textContent = "CORRUPT";
    DOM.badgeVibZone.className =
      "px-2 py-1 text-[11px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-700";
    DOM.barVibration.style.width = "100%";
    DOM.barVibration.className = "bg-rose-600 h-full";
  } else {
    DOM.valVibration.innerHTML = `${vibration_g.toFixed(2)} <span class="text-sm font-normal text-slate-400">g</span>`;
    let vibPct = Math.min(
      100,
      Math.max(0, (vibration_g / (vib_trip_limit * 1.2)) * 100)
    );
    DOM.barVibration.style.width = `${vibPct}%`;

    if (vibration_g >= vib_trip_limit) {
      DOM.badgeVibZone.textContent = "TRIP ZONE";
      DOM.badgeVibZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-rose-950 text-rose-400 border border-rose-700";
      DOM.barVibration.className = "bg-rose-500 h-full";
    } else if (vibration_g >= vib_warn_limit) {
      DOM.badgeVibZone.textContent = "WARNING";
      DOM.badgeVibZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-amber-950 text-amber-400 border border-amber-700";
      DOM.barVibration.className = "bg-amber-500 h-full";
    } else {
      DOM.badgeVibZone.textContent = "NORMAL";
      DOM.badgeVibZone.className =
        "px-2 py-1 text-[11px] font-bold rounded bg-slate-800 text-emerald-400 border border-slate-700";
      DOM.barVibration.className = "bg-emerald-500 h-full";
    }
  }

  DOM.labelVibWarn.textContent = `Warn: ${vib_warn_limit.toFixed(1)}g`;
  DOM.labelVibTrip.textContent = `Trip: ${vib_trip_limit.toFixed(1)}g`;

  // 4. Fault Duration Timer
  DOM.valFaultDuration.textContent = fault_duration_sec.toFixed(1);
  DOM.labelFaultLimit.textContent = fault_time_limit_sec;
  const durationPct = Math.min(
    100,
    (fault_duration_sec / fault_time_limit_sec) * 100
  );
  DOM.barFaultDuration.style.width = `${durationPct}%`;

  if (fault_duration_sec > 0) {
    DOM.badgeTimerState.textContent = "COUNTING DOWN";
    DOM.badgeTimerState.className =
      "text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700 animate-pulse";
    DOM.barFaultDuration.className = "bg-amber-500 h-full";
  } else {
    DOM.badgeTimerState.textContent = "INACTIVE";
    DOM.badgeTimerState.className =
      "text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400";
  }

  // 5. Actuator Representations
  if (motor_led) {
    DOM.ledMotorDot.className =
      "w-4 h-4 rounded-full mb-1.5 led-indicator led-motor-active";
    DOM.textMotorStatus.textContent = "RUNNING (ON)";
    DOM.textMotorStatus.className =
      "text-xs font-bold font-mono-numbers text-emerald-400 mt-0.5";
  } else {
    DOM.ledMotorDot.className =
      "w-4 h-4 rounded-full bg-slate-700 mb-1.5 led-indicator";
    DOM.textMotorStatus.textContent = "STOPPED (OFF)";
    DOM.textMotorStatus.className =
      "text-xs font-bold font-mono-numbers text-slate-400 mt-0.5";
  }

  if (buzzer) {
    DOM.ledBuzzerDot.className =
      "w-4 h-4 rounded-full mb-1.5 led-indicator led-buzzer-active";
    DOM.textBuzzerStatus.textContent = "ACTIVE (ALARM)";
    DOM.textBuzzerStatus.className =
      "text-xs font-bold font-mono-numbers text-rose-400 mt-0.5";
  } else {
    DOM.ledBuzzerDot.className =
      "w-4 h-4 rounded-full bg-slate-700 mb-1.5 led-indicator";
    DOM.textBuzzerStatus.textContent = "SILENT";
    DOM.textBuzzerStatus.className =
      "text-xs font-bold font-mono-numbers text-slate-400 mt-0.5";
  }

  // Telemetry Timestamp
  if (timestamp) {
    const d = new Date(timestamp * (timestamp > 10000000000 ? 1 : 1000));
    DOM.telemetryTimestamp.textContent = `Updated: ${d.toLocaleTimeString()}`;
  }
}

// State Machine Badge Helper
function updateStateBadge(machineState) {
  DOM.machineStateText.textContent = machineState || "IDLE / STOPPED";
  DOM.stateBadgeContainer.className =
    "flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-950";

  switch (machineState) {
    case "NORMAL":
      DOM.stateLed.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
      DOM.machineStateText.className =
        "text-xs sm:text-sm font-bold tracking-wider font-mono-numbers text-emerald-400";
      DOM.stateBadgeContainer.classList.add("border-emerald-800");
      break;
    case "WARNING":
      DOM.stateLed.className =
        "w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping";
      DOM.machineStateText.className =
        "text-xs sm:text-sm font-bold tracking-wider font-mono-numbers text-amber-400";
      DOM.stateBadgeContainer.classList.add(
        "border-amber-600",
        "animate-warning-pulse"
      );
      break;
    case "TRIP":
      DOM.stateLed.className =
        "w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping";
      DOM.machineStateText.className =
        "text-xs sm:text-sm font-bold tracking-wider font-mono-numbers text-rose-400";
      DOM.stateBadgeContainer.classList.add(
        "border-rose-600",
        "animate-trip-pulse"
      );
      break;
    case "IDLE":
    default:
      DOM.stateLed.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
      DOM.machineStateText.className =
        "text-xs sm:text-sm font-bold tracking-wider font-mono-numbers text-slate-400";
      DOM.stateBadgeContainer.classList.add("border-slate-800");
      break;
  }
}

// UI Controls Rendering
function renderControls() {
  const mode = state.controls.mode;
  DOM.currentModeLabel.textContent = `MODE: ${mode}`;

  if (mode === "AUTO") {
    DOM.btnModeAuto.className =
      "py-2 text-xs font-bold rounded-md bg-sky-600 text-white transition";
    DOM.btnModeManual.className =
      "py-2 text-xs font-bold rounded-md text-slate-400 hover:text-white transition";
  } else {
    DOM.btnModeAuto.className =
      "py-2 text-xs font-bold rounded-md text-slate-400 hover:text-white transition";
    DOM.btnModeManual.className =
      "py-2 text-xs font-bold rounded-md bg-sky-600 text-white transition";
  }

  // Update Input Form Fields if not actively being edited
  if (document.activeElement !== DOM.inputTempWarn) {
    DOM.inputTempWarn.value = state.controls.temp_warn_limit;
  }
  if (document.activeElement !== DOM.inputTempTrip) {
    DOM.inputTempTrip.value = state.controls.temp_trip_limit;
  }
  if (document.activeElement !== DOM.inputTempHyst) {
    DOM.inputTempHyst.value = state.controls.temp_hysteresis;
  }
  if (document.activeElement !== DOM.inputVibWarn) {
    DOM.inputVibWarn.value = state.controls.vib_warn_limit;
  }
  if (document.activeElement !== DOM.inputVibTrip) {
    DOM.inputVibTrip.value = state.controls.vib_trip_limit;
  }
  if (document.activeElement !== DOM.inputFaultTime) {
    DOM.inputFaultTime.value = state.controls.fault_time_limit_sec;
  }
}

// Event Logs Rendering
function renderEventLogs() {
  const filtered = state.eventLogs.filter((item) => {
    if (state.activeFilter === "ALL") return true;
    return item.type === state.activeFilter;
  });

  if (filtered.length === 0) {
    DOM.logTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="py-4 text-center text-slate-500 font-sans">
          Tidak ada catatan log kejadian yang cocok dengan filter "${state.activeFilter}".
        </td>
      </tr>
    `;
    return;
  }

  const rows = [...filtered].reverse().map((log) => {
    let badgeClass = "bg-slate-800 text-slate-300 border-slate-700";
    if (log.type === "INTERLOCK_REJECT") {
      badgeClass = "bg-rose-950 text-rose-300 border-rose-700 font-bold";
    } else if (log.type === "ALARM") {
      badgeClass = "bg-amber-950 text-amber-300 border-amber-700 font-bold";
    } else if (log.type === "STATE") {
      badgeClass = "bg-sky-950 text-sky-300 border-sky-800";
    } else if (log.type === "FAULT") {
      badgeClass = "bg-red-950 text-red-300 border-red-800";
    } else if (log.type === "MODE") {
      badgeClass = "bg-teal-950 text-teal-300 border-teal-800";
    }

    return `
      <tr class="hover:bg-slate-900/60 transition">
        <td class="py-2 px-4 text-slate-400 whitespace-nowrap">${log.timestamp || "-"}</td>
        <td class="py-2 px-4">
          <span class="px-2 py-0.5 rounded border text-[11px] ${badgeClass}">
            ${log.type || "INFO"}
          </span>
        </td>
        <td class="py-2 px-4 text-slate-200 font-sans">${escapeHtml(log.message || "-")}</td>
      </tr>
    `;
  });

  DOM.logTableBody.innerHTML = rows.join("");
}

function checkForRecentRejection() {
  if (state.eventLogs.length > 0) {
    const latest = state.eventLogs[state.eventLogs.length - 1];
    if (latest.type === "INTERLOCK_REJECT") {
      showInterlockBanner(latest.message);
    }
  }
}

function showInterlockBanner(msg) {
  DOM.interlockBannerMsg.textContent = msg;
  DOM.interlockBanner.classList.remove("hidden");
  // Auto hide after 8s
  setTimeout(() => {
    DOM.interlockBanner.classList.add("hidden");
  }, 8000);
}

// Connection & Heartbeat Monitor (Scenario 5 Evaluation)
function startHeartbeatMonitor() {
  setInterval(() => {
    if (state.isSimulated) {
      if (state.faultInjection.firebaseOffline) {
        setConnectionStatus(
          "SIM_FAIL (OFFLINE)",
          "bg-rose-500",
          "text-rose-400"
        );
        DOM.lastSeenText.textContent = "Offline (Simulated)";
      } else {
        setConnectionStatus("SIMULATOR ACTIVE", "bg-sky-500", "text-sky-400");
        DOM.lastSeenText.textContent = "Live Mock";
      }
      return;
    }

    if (state.lastTelemetryTime === 0) {
      setConnectionStatus("CONNECTING...", "bg-amber-500", "text-amber-400");
      DOM.lastSeenText.textContent = "Waiting sync";
      return;
    }

    const diffSec = Math.floor((Date.now() - state.lastTelemetryTime) / 1000);
    DOM.lastSeenText.textContent = `${diffSec}s ago`;

    if (diffSec > 5 || state.faultInjection.firebaseOffline) {
      setConnectionStatus(
        "FIREBASE_FAIL / TIMEOUT",
        "bg-rose-500",
        "text-rose-400"
      );
    } else {
      setConnectionStatus(
        "ONLINE (ESP32 OK)",
        "bg-emerald-500",
        "text-emerald-400"
      );
    }
  }, 1000);
}

function setConnectionStatus(text, dotColor, textColor) {
  DOM.commStatusText.textContent = text;
  DOM.commStatusText.className = `text-xs font-medium ${textColor}`;
  DOM.commLed.className = `w-2.5 h-2.5 rounded-full ${dotColor}`;
}

// Local Event Logger
function logLocalEvent(type, message) {
  const d = new Date();
  const timeStr = d.toLocaleTimeString("id-ID");
  const logItem = {
    id: `local_${Date.now()}`,
    timestamp: timeStr,
    type,
    message,
  };

  state.eventLogs.push(logItem);
  renderEventLogs();

  if (type === "INTERLOCK_REJECT") {
    showInterlockBanner(message);
  }
}

function escapeHtml(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag
  );
}

// -------------------------------------------------------------
// IN-BROWSER SIMULATOR ENGINE (FOR INSTANT ZERO-SETUP DEMOS)
// -------------------------------------------------------------
function startSimulatorMode() {
  state.isSimulated = true;
  toggleModal(false);

  logLocalEvent("STATE", "Sistem beroperasi di Simulator Mode (Local Testbed)");

  if (window.simInterval) clearInterval(window.simInterval);

  window.simInterval = setInterval(() => {
    runSimulatorTick();
  }, 500);
}

function runSimulatorTick() {
  if (state.faultInjection.firebaseOffline) {
    // Suppress telemetry update tick to simulate dropped connection
    return;
  }

  const t = state.telemetry;
  const c = state.controls;

  // 1. Simulate Sensor Fluctuations or Faults
  if (state.faultInjection.sensorCorrupt) {
    t.temperature = NaN;
    t.vibration_g = NaN;
  } else if (t.state === "NORMAL" || t.state === "WARNING") {
    // Add subtle industrial fluctuation
    t.temperature += (Math.random() - 0.48) * 0.4;
    t.vibration_g = Math.max(0.2, t.vibration_g + (Math.random() - 0.48) * 0.1);
  } else if (t.state === "IDLE" || t.state === "TRIP") {
    // Natural cooling down towards ambient
    if (t.temperature > 30.0) t.temperature -= 0.6;
    if (t.vibration_g > 0.05) t.vibration_g -= 0.15;
  }

  // 2. Evaluate State Machine & Protections
  const sensorBroken = isNaN(t.temperature) || isNaN(t.vibration_g);

  if (sensorBroken) {
    if (t.state !== "TRIP") {
      t.state = "TRIP";
      t.motor_led = false;
      t.buzzer = true;
      logLocalEvent(
        "ALARM",
        "TRIP! Sensor rusak / nilai tidak valid (Safe State diaktifkan)."
      );
    }
  } else if (t.state === "NORMAL") {
    if (
      t.temperature >= c.temp_warn_limit ||
      t.vibration_g >= c.vib_warn_limit
    ) {
      t.state = "WARNING";
      t.fault_duration_sec = 0.5;
      logLocalEvent(
        "STATE",
        `NORMAL -> WARNING (Suhu: ${t.temperature.toFixed(1)}°C, Vibrasi: ${t.vibration_g.toFixed(2)}g)`
      );
    }
  } else if (t.state === "WARNING") {
    const isExceeded =
      t.temperature >= c.temp_warn_limit || t.vibration_g >= c.vib_warn_limit;

    if (isExceeded) {
      t.fault_duration_sec += 0.5;
      // Immediate trip condition or duration timeout condition
      const directTrip =
        t.temperature >= c.temp_trip_limit || t.vibration_g >= c.vib_trip_limit;
      const durationTrip = t.fault_duration_sec >= c.fault_time_limit_sec;

      if (directTrip || durationTrip) {
        t.state = "TRIP";
        t.motor_led = false;
        t.buzzer = true;
        const reason = directTrip
          ? "Ambang Trip terlampaui"
          : `Gangguan melebihi ${c.fault_time_limit_sec} detik`;
        logLocalEvent("ALARM", `TRIP! Motor dipadamkan: ${reason}`);
      }
    } else {
      // Return to NORMAL if cooled down below hysteresis
      const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
      if (t.temperature < safeTemp && t.vibration_g < c.vib_warn_limit) {
        t.state = "NORMAL";
        t.fault_duration_sec = 0;
        logLocalEvent(
          "STATE",
          `WARNING -> NORMAL (Suhu turun di bawah ambang hysteresis ${safeTemp.toFixed(1)}°C)`
        );
      }
    }
  }

  t.timestamp = Date.now() / 1000;
  state.lastTelemetryTime = Date.now();
  renderTelemetry();
}

function processSimulatedCommand(cmd) {
  const t = state.telemetry;
  const c = state.controls;

  if (cmd === "START") {
    // SAFETY INTERLOCK CHECK 1: Is the machine in TRIP state?
    if (t.state === "TRIP") {
      logLocalEvent(
        "INTERLOCK_REJECT",
        "Perintah START ditolak! Mesin dalam status TRIP. Lakukan RESET TRIP terlebih dahulu."
      );
      return;
    }

    // SAFETY INTERLOCK CHECK 2: Is temperature or vibration still hazardous?
    const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
    if (t.temperature >= safeTemp || t.vibration_g >= c.vib_warn_limit) {
      logLocalEvent(
        "INTERLOCK_REJECT",
        `Perintah START ditolak! Suhu (${t.temperature.toFixed(1)}°C) belum di bawah hysteresis (${safeTemp.toFixed(1)}°C).`
      );
      return;
    }

    // Interlock Passed -> Start Machine
    t.state = "NORMAL";
    t.motor_led = true;
    t.buzzer = false;
    logLocalEvent("STATE", "IDLE -> NORMAL (Motor dinyalakan berhasil)");
  } else if (cmd === "STOP") {
    t.state = "IDLE";
    t.motor_led = false;
    t.buzzer = false;
    t.fault_duration_sec = 0;
    logLocalEvent(
      "STATE",
      "Perintah STOP dieksekusi. Mesin masuk status IDLE."
    );
  } else if (cmd === "RESET") {
    // SAFETY INTERLOCK CHECK: Can only reset if physical conditions are safe!
    const safeTemp = c.temp_warn_limit - c.temp_hysteresis;
    if (t.temperature >= safeTemp || isNaN(t.temperature)) {
      logLocalEvent(
        "INTERLOCK_REJECT",
        `Perintah RESET ditolak! Suhu masih terlalu panas (${t.temperature.toFixed(1)}°C >= ${safeTemp.toFixed(1)}°C) atau sensor invalid.`
      );
      return;
    }

    t.state = "IDLE";
    t.motor_led = false;
    t.buzzer = false;
    t.fault_duration_sec = 0;
    logLocalEvent(
      "STATE",
      "Status TRIP berhasil di-reset. Mesin kembali ke status IDLE (Aman)."
    );
  }

  renderTelemetry();
}
