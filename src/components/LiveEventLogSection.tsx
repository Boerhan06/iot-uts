import React, { useState } from "react";
import { ScrollText, Maximize2 } from "lucide-react";
import { EventLog } from "../types";

interface LiveEventLogSectionProps {
  logs: EventLog[];
  onOpenFullModal: () => void;
}

export const LiveEventLogSection: React.FC<LiveEventLogSectionProps> = ({
  logs,
  onOpenFullModal
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredLogs = logs.filter((log) => {
    if (filterType === "ALL") return true;
    return log.type === filterType;
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.02)]">
      
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <ScrollText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Real-Time Event Logs (/machine_monitor/event_logs)
            </h3>
            <p className="text-[11px] text-slate-400">
              Merekam transisi state machine, alarm trip, & penolakan interlock
            </p>
          </div>
        </div>

        {/* Filter Pills & Full Modal Trigger */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200/50 text-[11px]">
            {(["ALL", "INTERLOCK_REJECT", "STATE", "ALARM", "FAULT"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filterType === f
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>

          <button
            onClick={onOpenFullModal}
            title="Buka tampilan penuh"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Log Rows */}
      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl bg-slate-50/50">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-500 font-semibold sticky top-0 border-b border-slate-200/60">
            <tr>
              <th className="py-2 px-3 w-28 font-mono-numbers">Waktu</th>
              <th className="py-2 px-3 w-36">Kategori</th>
              <th className="py-2 px-3">Pesan Detail Kejadian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 font-mono-numbers">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-400 font-sans">
                  Menunggu data log kejadian dari Firebase Realtime Database...
                </td>
              </tr>
            ) : (
              [...filteredLogs].reverse().map((log) => {
                let badge = "bg-slate-200/70 text-slate-700 border-slate-300";
                if (log.type === "INTERLOCK_REJECT")
                  badge = "bg-rose-100 text-rose-700 font-bold border-rose-300";
                else if (log.type === "ALARM")
                  badge = "bg-amber-100 text-amber-800 font-bold border-amber-300";
                else if (log.type === "STATE")
                  badge = "bg-blue-100 text-blue-800 border-blue-200";
                else if (log.type === "FAULT")
                  badge = "bg-purple-100 text-purple-800 font-bold border-purple-200";

                return (
                  <tr key={log.id} className="hover:bg-white transition">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${badge}`}
                      >
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-800 font-sans text-xs">
                      {log.message}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
