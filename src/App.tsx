import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MetricCards } from "./components/MetricCards";
import { MainBanner } from "./components/MainBanner";
import { TelemetryChart } from "./components/TelemetryChart";
import { MachineOperations } from "./components/MachineOperations";
import { FaultAndModeCard } from "./components/FaultAndModeCard";
import { StateRadialCard } from "./components/StateRadialCard";
import { InterlockAlert } from "./components/InterlockAlert";
import { EventLogModal } from "./components/EventLogModal";
import { SettingsModal } from "./components/SettingsModal";
import { firebaseService } from "./services/firebase";
import { TelemetryData, ControlParameters, EventLog } from "./types";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [telemetry, setTelemetry] = useState<TelemetryData>(
    firebaseService.telemetry
  );
  const [controls, setControls] = useState<ControlParameters>(
    firebaseService.controls
  );
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("SIMULATOR ACTIVE");
  const [interlockMessage, setInterlockMessage] = useState<string | null>(null);

  // Modals state
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Initialize Firebase or Simulator
    firebaseService.init();

    // Attach subscriptions
    firebaseService.onTelemetry((data) => setTelemetry({ ...data }));
    firebaseService.onControls((data) => setControls({ ...data }));
    firebaseService.onLogs((logs) => {
      setEventLogs([...logs]);
      // Detect latest rejection for interlock banner
      if (logs.length > 0) {
        const latest = logs[logs.length - 1];
        if (latest.type === "INTERLOCK_REJECT") {
          setInterlockMessage(latest.message);
        }
      }
    });

    firebaseService.onConnection((conn, status) => {
      setIsConnected(conn);
      setConnectionStatus(status);
    });
  }, []);

  // Handlers
  const handleStartMotor = () => firebaseService.sendCommand("START");
  const handleStopMotor = () => firebaseService.sendCommand("STOP");
  const handleResetTrip = () => firebaseService.sendCommand("RESET");
  const handleSetMode = (mode: "AUTO" | "MANUAL") =>
    firebaseService.setMode(mode);
  const handleToggleSensorFault = (active: boolean) =>
    firebaseService.toggleFaultSensor(active);
  const handleToggleFirebaseFault = (active: boolean) =>
    firebaseService.toggleFaultFirebase(active);
  const handleSaveParameters = (params: Partial<ControlParameters>) =>
    firebaseService.updateParameters(params);
  const handleConnectFirebase = (url: string) => firebaseService.init(url);
  const handleStartSimulator = () => firebaseService.startSimulator();

  return (
    <div className="min-h-screen bg-[#f3f6fc] flex flex-col justify-center items-center p-3 lg:p-6 font-sans">
      {/* Interlock Rejection Toast (Framer Motion) */}
      <InterlockAlert
        message={interlockMessage}
        onDismiss={() => setInterlockMessage(null)}
      />

      {/* Main Centered App Container matching Peymen style */}
      <div className="w-full max-w-[1440px] bg-[#fbfcfe] rounded-[2.5rem] shadow-card border border-slate-200/60 overflow-hidden flex flex-col md:flex-row min-h-[92vh]">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenLogs={() => setIsLogsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Right Main Dashboard Area */}
        <main className="flex-1 bg-[#f3f6fc] p-5 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          <div>
            {/* Header */}
            <Header
              connectionStatus={connectionStatus}
              isConnected={isConnected}
              unreadCount={
                eventLogs.filter(
                  (l) => l.type === "ALARM" || l.type === "INTERLOCK_REJECT"
                ).length
              }
              onOpenLogs={() => setIsLogsOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Row 1: Top 3 Metric Cards */}
            <MetricCards telemetry={telemetry} controls={controls} />

            {/* Row 2: Middle Hero Banner & Spline Waveform Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
              <div className="lg:col-span-7">
                <MainBanner
                  telemetry={telemetry}
                  onEmergencyStop={handleStopMotor}
                />
              </div>
              <div className="lg:col-span-5">
                <TelemetryChart telemetry={telemetry} />
              </div>
            </div>

            {/* Row 3: Bottom Operations, Safety Interlock, and Dark Radial Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <MachineOperations
                motorRunning={telemetry.motor_led}
                onStart={handleStartMotor}
                onStop={handleStopMotor}
                onReset={handleResetTrip}
              />

              <FaultAndModeCard
                controls={controls}
                onSetMode={handleSetMode}
                onToggleSensorFault={handleToggleSensorFault}
                onToggleFirebaseFault={handleToggleFirebaseFault}
              />

              <StateRadialCard
                state={telemetry.state}
                healthPercent={
                  telemetry.state === "NORMAL"
                    ? 100
                    : telemetry.state === "WARNING"
                      ? 65
                      : 0
                }
              />
            </div>
          </div>

          {/* Clean minimal footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span>
              UTS Internet of Things — Topik 6 (Monitoring Kondisi Mesin)
            </span>
            <span className="font-mono-numbers">
              ESP32 DevKit • Firebase Realtime Database • Wokwi
            </span>
          </footer>
        </main>
      </div>

      {/* Modals */}
      <EventLogModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={eventLogs}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        controls={controls}
        onSaveParameters={handleSaveParameters}
        onConnectFirebase={handleConnectFirebase}
        onStartSimulator={handleStartSimulator}
      />
    </div>
  );
};

export default App;
