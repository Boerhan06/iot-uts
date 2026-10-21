import React from "react";
import { MachineState } from "../types";
import { motion } from "framer-motion";

interface StateRadialCardProps {
  state: MachineState;
  healthPercent?: number;
}

export const StateRadialCard: React.FC<StateRadialCardProps> = ({
  state,
  healthPercent,
}) => {
  const isTrip = state === "TRIP";
  const isWarning = state === "WARNING";
  const isNormal = state === "NORMAL" || state === "RUNNING";

  const percent =
    healthPercent ?? (isTrip ? 0 : isWarning ? 65 : isNormal ? 100 : 90);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const ringColor = isTrip
    ? "#ef4444"
    : isWarning
      ? "#f59e0b"
      : isNormal
        ? "#60a5fa"
        : "#94a3b8";

  return (
    <div className="relative flex flex-col justify-end pt-3">
      {/* Translucent stacked card effect behind it matching Peymen */}
      <div className="absolute top-0 inset-x-4 h-8 bg-slate-800/40 rounded-3xl -z-10" />
      <div className="absolute top-1.5 inset-x-2 h-8 bg-slate-900/60 rounded-3xl -z-10" />

      {/* Main Dark Navy Card */}
      <div className="bg-[#0a1931] rounded-3xl p-6 text-white shadow-card flex items-center justify-between relative overflow-hidden select-none">
        {/* Left State Description */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Machine State
          </p>
          <p className="text-lg lg:text-xl font-extrabold text-white tracking-tight">
            {isTrip
              ? "TRIP / FAULT"
              : isWarning
                ? "WARNING"
                : isNormal
                  ? "RUNNING"
                  : "IDLE / STOP"}
          </p>
          <p className="text-[11px] text-slate-400">
            {isTrip
              ? "Safe State: Motor Locked"
              : isWarning
                ? "Fault duration counting"
                : isNormal
                  ? "Optimal operating zone"
                  : "Ready for Start command"}
          </p>
        </div>

        {/* Right Radial Ring Progress matching Peymen */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg
            className="w-full h-full -rotate-90 transform"
            viewBox="0 0 80 80"
          >
            {/* Background Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Progress Bar with Animation */}
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              stroke={ringColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Percentage */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-sm font-extrabold text-white font-mono-numbers">
              {percent}%
            </span>
            <span className="text-[9px] text-slate-400 font-semibold uppercase">
              Health
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
