import React from "react";
import { Play, Square, RotateCcw, ShieldAlert } from "lucide-react";
import { ControlParameters } from "../types";
import { motion } from "framer-motion";

interface MachineOperationsProps {
  controls: ControlParameters;
  motorRunning: boolean;
  onSetMode: (mode: "AUTO" | "MANUAL") => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const MachineOperations: React.FC<MachineOperationsProps> = ({
  controls,
  motorRunning,
  onSetMode,
  onStart,
  onStop,
  onReset
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        {/* Title & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Kontrol Dua Arah & Urutan Operasi
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  motorRunning
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {motorRunning ? "MOTOR ACTIVE" : "MOTOR OFF"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Perintah dikirim ke ESP32 via Firebase REST API
            </p>
          </div>

          {/* Apple-style Segmented Control for Mode */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/50 self-start sm:self-auto">
            <button
              onClick={() => onSetMode("AUTO")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all relative ${
                controls.mode === "AUTO"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => onSetMode("MANUAL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all relative ${
                controls.mode === "MANUAL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              MANUAL
            </button>
          </div>
        </div>

        {/* 3 Main Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          
          {/* Start Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#34c759] hover:bg-[#30b753] text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>START MOTOR</span>
          </motion.button>

          {/* Stop Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStop}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>STOP MOTOR</span>
          </motion.button>

          {/* Reset Trip Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#ff9500] hover:bg-[#e68600] text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET TRIP</span>
          </motion.button>

        </div>
      </div>

      {/* Safety Interlock principle reminder */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-[11px] text-slate-600 mt-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Interlock Keselamatan (Skenario 3):</strong> Tombol sengaja tidak di-disable di UI saat kondisi bahaya atau status TRIP. Saat diklik, <strong>ESP32 menolak perintah</strong> dan mencatat penolakan ke Event Log demi membuktikan logika proteksi berjalan di mikroprosesor.
        </p>
      </div>
    </div>
  );
};
