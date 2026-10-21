import React from "react";
import {
  LayoutDashboard,
  Activity,
  Sliders,
  Settings,
  ScrollText,
  LineChart,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogs,
  onOpenSettings,
}) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "telemetry", label: "Telemetry", icon: Activity },
    { id: "controls", label: "Controls", icon: Sliders },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      action: onOpenSettings,
    },
    { id: "logs", label: "Event Logs", icon: ScrollText, action: onOpenLogs },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "support", label: "Wokwi Docs", icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between py-6 px-4 shrink-0 shadow-soft select-none">
      <div>
        {/* Logo matching Peymen style */}
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-blueGlow">
            P
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              peymen
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5"></span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? "text-slate-950 font-bold bg-slate-50/60"
                    : "text-slate-400 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {/* Active Indicator Bar on the left */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="absolute left-0 top-2 bottom-2 w-1.5 bg-slate-950 rounded-r-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-slate-950" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo Card matching the reference image */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-indigo-300/80 via-blue-400 to-indigo-500 text-white shadow-card">
        {/* Decorative circular pattern */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border-4 border-white/20 pointer-events-none" />
        <div className="absolute -left-4 -top-4 w-20 h-20 rounded-full border-4 border-white/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-bold leading-tight mb-1 text-white">
            ESP32 DevKit V1
          </p>
          <p className="text-[11px] text-white/80 mb-3">
            Topik 6 Hardware Monitor
          </p>
          <a
            href="https://wokwi.com"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition text-center"
          >
            Buka Wokwi
          </a>
        </div>
      </div>
    </aside>
  );
};
