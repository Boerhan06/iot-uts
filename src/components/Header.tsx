import React from "react";
import {
  Bell,
  Settings2,
  Wifi,
  WifiOff,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { AuthUserInfo } from "../types";

interface HeaderProps {
  connectionStatus: string;
  isConnected: boolean;
  unreadCount: number;
  authInfo: AuthUserInfo;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isConnected,
  unreadCount,
  authInfo,
  onOpenLogs,
  onOpenSettings
}) => {
  return (
    <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
      {/* Left: System Title & Model */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Sistem Monitoring Kondisi Mesin • Topik 6
          </span>
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200/70 text-slate-700">
            ESP32 + Wokwi
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Heavy Milling Spindle #06</span>
        </h1>
      </div>

      {/* Right: Badges, Auth & Controls */}
      <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
        
        {/* Firebase Authentication Pill (User UID & Email) */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-xs">
          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-1">
              {authInfo.email || "es32.kelompok6@gmail.com"}
              <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />
            </span>
            <span className="text-[9px] font-mono-numbers text-slate-400">
              UID: {authInfo.uid ? `${authInfo.uid.substring(0, 12)}...` : "DJOtoRAtJqQO..."}
            </span>
          </div>
        </div>

        {/* Live Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-xs font-semibold">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-[11px] font-mono-numbers text-slate-700">
            {connectionStatus}
          </span>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Pengaturan Parameter & Database"
          className="p-2 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-95"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Notification / Logs Drawer Trigger */}
        <button
          onClick={onOpenLogs}
          title="Buka Catatan Log Lengkap"
          className="p-2 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative active:scale-95"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>

      </div>
    </header>
  );
};
