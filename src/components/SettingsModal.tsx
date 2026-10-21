import React, { useState } from "react";
import { Settings, X, Database, Save, PlayCircle } from "lucide-react";
import { ControlParameters } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  controls: ControlParameters;
  onSaveParameters: (params: Partial<ControlParameters>) => void;
  onConnectFirebase: (url: string) => void;
  onStartSimulator: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  controls,
  onSaveParameters,
  onConnectFirebase,
  onStartSimulator,
}) => {
  const [dbUrl, setDbUrl] = useState(
    localStorage.getItem("fb_database_url") ||
      "https://uts-iot-topik6-default-rtdb.firebaseio.com"
  );

  const [params, setParams] = useState({
    temp_warn_limit: controls.temp_warn_limit,
    temp_trip_limit: controls.temp_trip_limit,
    temp_hysteresis: controls.temp_hysteresis,
    vib_warn_limit: controls.vib_warn_limit,
    vib_trip_limit: controls.vib_trip_limit,
    fault_time_limit_sec: controls.fault_time_limit_sec,
  });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveParameters(params);
    if (dbUrl.trim()) {
      localStorage.setItem("fb_database_url", dbUrl.trim());
      onConnectFirebase(dbUrl.trim());
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan Sistem & Firebase
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Database URL */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Firebase Realtime Database URL
              </label>
              <input
                type="url"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="https://<project-id>-default-rtdb.firebaseio.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers focus:border-blue-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Data disimpan di localStorage browser untuk kemudahan
                demonstrasi video.
              </span>
            </div>

            {/* Threshold parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Suhu Warning (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={params.temp_warn_limit}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      temp_warn_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Suhu Trip (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={params.temp_trip_limit}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      temp_trip_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Hysteresis Suhu (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={params.temp_hysteresis}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      temp_hysteresis: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Vibrasi Warning (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={params.vib_warn_limit}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      vib_warn_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Vibrasi Trip (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={params.vib_trip_limit}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      vib_trip_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Toleransi Durasi (detik)
                </label>
                <input
                  type="number"
                  step="1"
                  value={params.fault_time_limit_sec}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      fault_time_limit_sec: parseInt(e.target.value, 10) || 5,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono-numbers outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-blueGlow transition"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Parameter</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onStartSimulator();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <PlayCircle className="w-4 h-4 text-purple-600" />
                <span>Mode Mock</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
