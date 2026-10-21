import React from "react";
import { AlertTriangle, WifiOff, Cpu } from "lucide-react";
import { ControlParameters } from "../types";
import { motion } from "framer-motion";

interface FaultAndModeCardProps {
  controls: ControlParameters;
  onSetMode: (mode: "AUTO" | "MANUAL") => void;
  onToggleSensorFault: (active: boolean) => void;
  onToggleFirebaseFault: (active: boolean) => void;
}

export const FaultAndModeCard: React.FC<FaultAndModeCardProps> = ({
  controls,
  onSetMode,
  onToggleSensorFault,
  onToggleFirebaseFault,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Safety & Fault Injection
          </h3>

          {/* Mode Switch Pill */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60 text-xs">
            <button
              onClick={() => onSetMode("AUTO")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                controls.mode === "AUTO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => onSetMode("MANUAL")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                controls.mode === "MANUAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              MANUAL
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Item 1: Fault Sensor NaN (Scenario 4) */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800">
                    Sensor Rusak (NaN)
                  </p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-500">
                    Skenario 4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Picu Trip Otomatis (Safe State)
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onToggleSensorFault(!controls.fault_sensor_corrupt)
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                controls.fault_sensor_corrupt
                  ? "bg-rose-600 text-white shadow-sm animate-pulse"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {controls.fault_sensor_corrupt ? "INJECTED" : "OFF"}
            </motion.button>
          </div>

          {/* Item 2: Fault Network Offline (Scenario 5) */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800">
                    Jaringan Putus
                  </p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-500">
                    Skenario 5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Buktikan Kontrol Lokal Non-blocking
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onToggleFirebaseFault(!controls.fault_firebase_offline)
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                controls.fault_firebase_offline
                  ? "bg-amber-600 text-white shadow-sm animate-pulse"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {controls.fault_firebase_offline ? "OFFLINE" : "OFF"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
        <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Diuji pada firmware ESP32 Wokwi secara langsung.</span>
      </div>
    </div>
  );
};
