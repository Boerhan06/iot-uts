import React from "react";
import { Bell, Search, Settings2, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

interface HeaderProps {
  connectionStatus: string;
  isConnected: boolean;
  unreadCount: number;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isConnected,
  unreadCount,
  onOpenLogs,
  onOpenSettings,
}) => {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      {/* Left: Greeting matching Peymen reference */}
      <div>
        <p className="text-xs font-semibold text-slate-400">Hi Operator,</p>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Welcome to SpindleM6
        </h1>
      </div>

      {/* Right: Actions, Notifications, Avatar, Search */}
      <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
        {/* Connection Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="font-mono-numbers text-[11px]">
            {connectionStatus}
          </span>
        </div>

        {/* Firebase Config Trigger */}
        <button
          onClick={onOpenSettings}
          title="Pengaturan Firebase"
          className="p-2.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Bell Notification Icon matching Peymen */}
        <button
          onClick={onOpenLogs}
          title="Buka Catatan Log Kejadian"
          className="p-2.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute 0 top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"
            />
          )}
        </button>

        {/* Avatar matching Peymen */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-sm">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            <span className="font-mono">OP</span>
          </div>
        </div>

        {/* Search Bar matching Peymen */}
        <div className="relative w-48 lg:w-56">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search parameter..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm transition"
          />
        </div>
      </div>
    </header>
  );
};
