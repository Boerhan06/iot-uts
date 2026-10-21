import React, { useState } from "react";
import { ScrollText, X, Filter, Trash2 } from "lucide-react";
import { EventLog } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface EventLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: EventLog[];
  onClearLogs?: () => void;
}

export const EventLogModal: React.FC<EventLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterType === "ALL" || log.type === filterType;
    const matchesSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Real-Time Event Logs (/machine_monitor/event_logs)
                </h3>
                <p className="text-xs text-slate-400">
                  Total {logs.length} catatan kejadian terekam di cloud
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  title="Hapus tampilan log"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls / Filter Bar */}
          <div className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="INTERLOCK_REJECT">INTERLOCK_REJECT</option>
                <option value="STATE">STATE</option>
                <option value="ALARM">ALARM</option>
                <option value="FAULT">FAULT</option>
                <option value="MODE">MODE</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Cari pesan log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 outline-none w-48"
            />
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 w-28">Waktu</th>
                  <th className="py-2.5 px-4 w-36">Tipe</th>
                  <th className="py-2.5 px-4">Pesan Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-slate-400 font-sans"
                    >
                      Tidak ada catatan log kejadian yang cocok.
                    </td>
                  </tr>
                ) : (
                  [...filteredLogs].reverse().map((log) => {
                    let badge = "bg-slate-100 text-slate-600";
                    if (log.type === "INTERLOCK_REJECT")
                      badge = "bg-rose-100 text-rose-700 font-bold";
                    else if (log.type === "ALARM")
                      badge = "bg-amber-100 text-amber-700 font-bold";
                    else if (log.type === "STATE")
                      badge = "bg-blue-100 text-blue-700";
                    else if (log.type === "FAULT")
                      badge = "bg-purple-100 text-purple-700 font-bold";

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/60 transition"
                      >
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] ${badge}`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-sans">
                          {log.message}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>
              Menampilkan data log real-time dari Firebase Realtime Database.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
