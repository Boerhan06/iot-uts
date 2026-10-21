import React from "react";
import { Thermometer, Activity, Clock } from "lucide-react";
import { TelemetryData, ControlParameters } from "../types";
import { motion } from "framer-motion";

interface MetricCardsProps {
  telemetry: TelemetryData;
  controls: ControlParameters;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  telemetry,
  controls,
}) => {
  const isTempValid = !isNaN(telemetry.temperature);
  const isVibValid = !isNaN(telemetry.vibration_g);

  // Status badges
  const getTempStatus = () => {
    if (!isTempValid)
      return { text: "CORRUPT", color: "text-rose-600 bg-rose-50" };
    if (telemetry.temperature >= controls.temp_trip_limit)
      return { text: "CRITICAL TRIP", color: "text-rose-600 bg-rose-50" };
    if (telemetry.temperature >= controls.temp_warn_limit)
      return { text: "WARNING", color: "text-amber-600 bg-amber-50" };
    return { text: "NORMAL", color: "text-emerald-600 bg-emerald-50" };
  };

  const getVibStatus = () => {
    if (!isVibValid)
      return { text: "CORRUPT", color: "text-rose-600 bg-rose-50" };
    if (telemetry.vibration_g >= controls.vib_trip_limit)
      return { text: "CRITICAL TRIP", color: "text-rose-600 bg-rose-50" };
    if (telemetry.vibration_g >= controls.vib_warn_limit)
      return { text: "WARNING", color: "text-amber-600 bg-amber-50" };
    return { text: "SMOOTH", color: "text-emerald-600 bg-emerald-50" };
  };

  const tempStatus = getTempStatus();
  const vibStatus = getVibStatus();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Metric 1: Temperature */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Thermometer className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${tempStatus.color}`}
          >
            {tempStatus.text}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400">
            Suhu Spindle Mesin
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
              {isTempValid ? telemetry.temperature.toFixed(1) : "NaN"}
            </span>
            <span className="text-sm font-semibold text-slate-400">°C</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono-numbers">
            Batas: Warn {controls.temp_warn_limit}°C / Trip{" "}
            {controls.temp_trip_limit}°C
          </p>
        </div>
      </motion.div>

      {/* Metric 2: Vibration */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${vibStatus.color}`}
          >
            {vibStatus.text}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400">
            Vibrasi Resultan (a_total)
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
              {isVibValid ? telemetry.vibration_g.toFixed(2) : "NaN"}
            </span>
            <span className="text-sm font-semibold text-slate-400">g</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono-numbers">
            Batas: Warn {controls.vib_warn_limit}g / Trip{" "}
            {controls.vib_trip_limit}g
          </p>
        </div>
      </motion.div>

      {/* Metric 3: Fault Duration Timer */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              telemetry.fault_duration_sec > 0
                ? "text-amber-600 bg-amber-50 animate-pulse"
                : "text-slate-500 bg-slate-100"
            }`}
          >
            {telemetry.fault_duration_sec > 0 ? "COUNTDOWN" : "STANDBY"}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400">
            Durasi Gangguan Aktif
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
              {telemetry.fault_duration_sec.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-400 font-mono-numbers">
              / {controls.fault_time_limit_sec}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Otomatis TRIP jika durasi gangguan &gt;{" "}
            {controls.fault_time_limit_sec} detik
          </p>
        </div>
      </motion.div>
    </div>
  );
};
