import React from "react";
import { Thermometer, Activity, Clock, Cpu, Volume2, Power } from "lucide-react";
import { TelemetryData, ControlParameters } from "../types";

interface MetricCardsProps {
  telemetry: TelemetryData;
  controls: ControlParameters;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  telemetry,
  controls
}) => {
  const isTempValid = !isNaN(telemetry.temperature);
  const isVibValid = !isNaN(telemetry.vibration_g);

  // Status badges
  const getTempStatus = () => {
    if (!isTempValid)
      return { text: "CORRUPT", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (telemetry.temperature >= controls.temp_trip_limit)
      return { text: "CRITICAL TRIP", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (telemetry.temperature >= controls.temp_warn_limit)
      return { text: "WARNING", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { text: "SAFE", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  };

  const getVibStatus = () => {
    if (!isVibValid)
      return { text: "CORRUPT", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (telemetry.vibration_g >= controls.vib_trip_limit)
      return { text: "CRITICAL TRIP", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (telemetry.vibration_g >= controls.vib_warn_limit)
      return { text: "WARNING", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { text: "STABLE", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  };

  const tempStatus = getTempStatus();
  const vibStatus = getVibStatus();

  const tempPct = isTempValid
    ? Math.min(100, Math.max(0, (telemetry.temperature / (controls.temp_trip_limit * 1.15)) * 100))
    : 100;
  const vibPct = isVibValid
    ? Math.min(100, Math.max(0, (telemetry.vibration_g / (controls.vib_trip_limit * 1.2)) * 100))
    : 100;
  const timerPct = Math.min(
    100,
    (telemetry.fault_duration_sec / controls.fault_time_limit_sec) * 100
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Metric 1: Temperature */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Thermometer className="w-4 h-4 text-rose-500" />
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tempStatus.color}`}
          >
            {tempStatus.text}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Suhu Spindle Mesin
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-numbers tracking-tight">
              {isTempValid ? telemetry.temperature.toFixed(1) : "NaN"}
            </span>
            <span className="text-sm font-semibold text-slate-400">°C</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-300 ${
                !isTempValid
                  ? "bg-rose-500"
                  : telemetry.temperature >= controls.temp_trip_limit
                  ? "bg-rose-500"
                  : telemetry.temperature >= controls.temp_warn_limit
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${tempPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1.5">
            <span>Warn {controls.temp_warn_limit}°C</span>
            <span>Trip {controls.temp_trip_limit}°C</span>
          </div>
        </div>
      </div>

      {/* Metric 2: Vibration */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${vibStatus.color}`}
          >
            {vibStatus.text}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Vibrasi Resultan (MPU6050)
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-numbers tracking-tight">
              {isVibValid ? telemetry.vibration_g.toFixed(2) : "NaN"}
            </span>
            <span className="text-sm font-semibold text-slate-400">g</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-300 ${
                !isVibValid
                  ? "bg-rose-500"
                  : telemetry.vibration_g >= controls.vib_trip_limit
                  ? "bg-rose-500"
                  : telemetry.vibration_g >= controls.vib_warn_limit
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${vibPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1.5">
            <span>Warn {controls.vib_warn_limit}g</span>
            <span>Trip {controls.vib_trip_limit}g</span>
          </div>
        </div>
      </div>

      {/* Metric 3: Fault Duration Timer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              telemetry.fault_duration_sec > 0
                ? "text-amber-600 bg-amber-50 border-amber-200 animate-pulse"
                : "text-slate-500 bg-slate-50 border-slate-200"
            }`}
          >
            {telemetry.fault_duration_sec > 0 ? "COUNTDOWN" : "STANDBY"}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Durasi Toleransi Gangguan
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-numbers tracking-tight">
              {telemetry.fault_duration_sec.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-400 font-mono-numbers">
              / {controls.fault_time_limit_sec}.0s
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-amber-500 h-full transition-all duration-200"
              style={{ width: `${timerPct}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-400 mt-1.5">
            Trip jika getaran/suhu bertahan &gt; {controls.fault_time_limit_sec}s
          </p>
        </div>
      </div>

      {/* Metric 4: Hardware Actuators (Motor & Buzzer) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            GPIO OUTPUT
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* Motor Status */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <Power className="w-3.5 h-3.5 text-slate-400" />
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.motor_led ? "bg-emerald-500 shadow-sm" : "bg-slate-300"
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Motor LED</span>
            <span
              className={`text-xs font-bold font-mono-numbers mt-0.5 ${
                telemetry.motor_led ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {telemetry.motor_led ? "RUNNING" : "STOPPED"}
            </span>
          </div>

          {/* Buzzer Status */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.buzzer ? "bg-rose-500 animate-ping" : "bg-slate-300"
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Sirene Alarm</span>
            <span
              className={`text-xs font-bold font-mono-numbers mt-0.5 ${
                telemetry.buzzer ? "text-rose-600 font-bold" : "text-slate-500"
              }`}
            >
              {telemetry.buzzer ? "ACTIVE" : "SILENT"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
