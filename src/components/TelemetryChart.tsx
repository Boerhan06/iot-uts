import React, { useState, useEffect } from "react";
import { TelemetryData } from "../types";

interface TelemetryChartProps {
  telemetry: TelemetryData;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  telemetry,
}) => {
  const [activePeriod, setActivePeriod] = useState<
    "Day" | "Week" | "Month" | "Live"
  >("Live");
  const [history, setHistory] = useState<number[]>([
    35, 42, 38, 55, 48, 62, 58, 45, 52, 60, 48, 50,
  ]);

  // Append telemetry value periodically for Live chart view
  useEffect(() => {
    if (activePeriod === "Live" && !isNaN(telemetry.temperature)) {
      setHistory((prev) => {
        const next = [...prev.slice(1), Math.round(telemetry.temperature)];
        return next;
      });
    }
  }, [telemetry.temperature, activePeriod]);

  // Compute SVG spline points
  const width = 320;
  const height = 110;
  const maxVal = Math.max(...history, 90);
  const minVal = Math.min(...history, 20);

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const y =
      height - ((val - minVal) / (maxVal - minVal || 1)) * (height - 24) - 12;
    return { x, y, val };
  });

  // Generate SVG path string with smooth curves
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, "");

  // Highlight active point (near end)
  const activePt = points[points.length - 3] || points[points.length - 1];

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-100 shadow-soft flex flex-col justify-between">
      {/* Header with Title & Big Value */}
      <div>
        <p className="text-xs font-semibold text-slate-400">
          Live Trend Riwayat
        </p>
        <div className="flex items-baseline justify-between mt-1">
          <p className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
            {isNaN(telemetry.temperature)
              ? "--.-"
              : telemetry.temperature.toFixed(1)}
            <span className="text-sm font-semibold text-slate-400">°C</span>
            <span className="text-xs font-normal text-slate-300 mx-1.5">|</span>
            <span className="text-lg font-bold text-slate-700">
              {isNaN(telemetry.vibration_g)
                ? "-.--"
                : telemetry.vibration_g.toFixed(2)}
              g
            </span>
          </p>

          {/* Period Selectors */}
          <div className="flex items-center gap-3 text-xs">
            {(["Day", "Week", "Month", "Live"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`font-semibold transition-all relative ${
                  activePeriod === p
                    ? "text-slate-900 font-bold"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {p}
                {activePeriod === p && (
                  <span className="block h-0.5 bg-blue-600 rounded-full mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Smooth Curve Waveform matching Peymen design */}
      <div className="relative my-4 w-full h-28">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          {/* Vertical guideline */}
          <line
            x1={activePt.x}
            y1={0}
            x2={activePt.x}
            y2={height + 15}
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Smooth spline curve line */}
          <path
            d={pathD}
            fill="none"
            stroke="#0a1931"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Active Data Circle marker */}
          <circle
            cx={activePt.x}
            cy={activePt.y}
            r="6"
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth="2.5"
            className="shadow-sm"
          />
        </svg>
      </div>

      {/* Bottom Timeline Labels */}
      <div className="flex justify-between text-[11px] font-semibold text-slate-400 font-mono-numbers pt-1 border-t border-slate-100">
        <span>-60s</span>
        <span>-45s</span>
        <span className="text-blue-600 font-bold">Now</span>
        <span>Peak</span>
        <span>Stable</span>
      </div>
    </div>
  );
};
