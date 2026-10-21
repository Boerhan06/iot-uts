import React from "react";
import { AlertTriangle, WifiOff, Sliders } from "lucide-react";
import { ControlParameters } from "../types";
import { motion } from "framer-motion";

interface FaultAndModeCardProps {
  controls: ControlParameters;
  onToggleSensorFault: (active: boolean) => void;
  onToggleFirebaseFault: (active: boolean) => void;
  onOpenSettings: () => void;
}

export const FaultAndModeCard: React.FC<FaultAndModeCardProps> = ({
  controls,
  onToggleSensorFault,
  onToggleFirebaseFault,
  onOpenSettings
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Injeksi Gangguan & Parameter
            </h3>
            <p className="text-[11px] text-slate-400">
              Pengujian Skenario 4 & Skenario 5
            </p>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ubah Batas</span>
          </button>
        </div>

        <div className="space-y-3">
          
          {/* Fault 1: Sensor Error NaN (Skenario 4) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800">Sensor Rusak (NaN)</p>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-mono">
                    Skenario 4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Transisi ESP32 ke Safe State (TRIP)
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleSensorFault(!controls.fault_sensor_corrupt)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                controls.fault_sensor_corrupt
                  ? "bg-[#ff3b30] text-white animate-pulse"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {controls.fault_sensor_corrupt ? "INJECTED" : "OFF"}
            </motion.button>
          </div>

          {/* Fault 2: Firebase Offline (Skenario 5) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800">Simulasi Jaringan Putus</p>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-mono">
                    Skenario 5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Buktikan Loop ESP32 Non-blocking
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleFirebaseFault(!controls.fault_firebase_offline)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                controls.fault_firebase_offline
                  ? "bg-[#ff9500] text-white animate-pulse"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {controls.fault_firebase_offline ? "OFFLINE" : "OFF"}
            </motion.button>
          </div>

        </div>
      </div>

      {/* Threshold tags preview */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono-numbers">
        <span>Suhu: {controls.temp_warn_limit}°C / {controls.temp_trip_limit}°C (Hyst: -{controls.temp_hysteresis}°C)</span>
        <span>Vibrasi: {controls.vib_warn_limit}g / {controls.vib_trip_limit}g</span>
      </div>
    </div>
  );
};
