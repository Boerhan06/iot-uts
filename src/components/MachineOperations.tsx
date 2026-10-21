import React from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface MachineOperationsProps {
  motorRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const MachineOperations: React.FC<MachineOperationsProps> = ({
  motorRunning,
  onStart,
  onStop,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
          Machine Operations
        </h3>

        <div className="space-y-3">
          {/* Operation 1: Start Motor */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 fill-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Start Spindle
                </p>
                <p className="text-[11px] text-slate-400">
                  {motorRunning ? "Motor Sedang Berjalan" : "Siap Dinyalakan"}
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              START
            </motion.button>
          </div>

          {/* Operation 2: Stop Motor */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Square className="w-4 h-4 fill-slate-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Stop Spindle</p>
                <p className="text-[11px] text-slate-400">
                  Masuk Status Standby IDLE
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onStop}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition"
            >
              STOP
            </motion.button>
          </div>

          {/* Operation 3: Reset Trip */}
          <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Reset Proteksi Trip
                </p>
                <p className="text-[11px] text-slate-400">
                  Kembalikan Safe State ke IDLE
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onReset}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition"
            >
              RESET
            </motion.button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
        🛡️ <strong>Safety Interlock:</strong> Tombol tetap aktif saat bahaya
        agar penolakan oleh ESP32 dapat dibuktikan di demo (Skenario 3).
      </p>
    </div>
  );
};
