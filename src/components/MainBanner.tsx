import React from "react";
import { ShieldCheck, AlertOctagon } from "lucide-react";
import { TelemetryData } from "../types";
import { motion } from "framer-motion";

interface MainBannerProps {
  telemetry: TelemetryData;
  onEmergencyStop: () => void;
}

export const MainBanner: React.FC<MainBannerProps> = ({
  telemetry,
  onEmergencyStop,
}) => {
  const isTrip = telemetry.state === "TRIP";
  const isWarning = telemetry.state === "WARNING";

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-100 shadow-soft flex flex-col lg:flex-row items-center justify-between gap-6">
      {/* Left Text & CTA */}
      <div className="space-y-4 max-w-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Proteksi Operasi Aktif</span>
        </div>

        <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
          Machine condition & safety interlock
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed">
          Sistem otomatis memantau vibrasi spindle dan suhu bearing secara
          real-time. Jika gangguan melebihi toleransi waktu, motor dipadamkan ke
          Safe State.
        </p>

        <button
          onClick={onEmergencyStop}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-blueGlow transition-all active:scale-95"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Stop Spindle Darurat</span>
        </button>
      </div>

      {/* Right: Virtual Card Graphic matching Peymen reference */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-full lg:w-72 h-44 rounded-2xl p-5 bg-gradient-to-tr from-indigo-500 via-blue-500 to-indigo-400 text-white shadow-card flex flex-col justify-between relative overflow-hidden select-none"
      >
        {/* Subtle background glow circle */}
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <span className="text-[11px] font-bold tracking-wider text-white/90">
            SPINDLE UNIT #06
          </span>
          <div className="flex -space-x-2">
            <span className="w-5 h-5 rounded-full bg-white/40 backdrop-blur-sm block"></span>
            <span className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm block"></span>
          </div>
        </div>

        {/* Card Number / State */}
        <div className="relative z-10 my-auto">
          <span className="text-xs text-white/70 block font-mono">
            STATUS STATE MACHINE
          </span>
          <p className="text-base font-extrabold tracking-wider font-mono-numbers mt-0.5">
            {isTrip
              ? "TRIP (FAULT LOCK)"
              : isWarning
                ? "WARNING (TIMER RUN)"
                : telemetry.state}
          </p>
        </div>

        {/* Card Footer details */}
        <div className="flex items-end justify-between relative z-10 text-[10px] text-white/80">
          <div>
            <span className="text-white/60 block text-[9px]">OPERATOR</span>
            <span className="font-semibold text-white">UTS IoT Team</span>
          </div>
          <div>
            <span className="text-white/60 block text-[9px]">MOTOR RELAI</span>
            <span className="font-semibold text-white">
              {telemetry.motor_led ? "RUNNING (ON)" : "STOPPED (OFF)"}
            </span>
          </div>
          <div>
            <span className="text-white/60 block text-[9px]">EXPIRES</span>
            <span className="font-semibold text-white">10/26</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
