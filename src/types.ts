export type MachineState = "IDLE" | "NORMAL" | "WARNING" | "TRIP" | "RUNNING" | "RECOVERY";

export interface TelemetryData {
  temperature: number;
  vibration_g: number;
  state: MachineState;
  motor_led: boolean;
  buzzer: boolean;
  fault_duration_sec: number;
  timestamp: number;
}

export interface ControlParameters {
  mode: "AUTO" | "MANUAL";
  command: "NONE" | "START" | "STOP" | "RESET";
  temp_warn_limit: number;
  temp_trip_limit: number;
  temp_hysteresis: number;
  vib_warn_limit: number;
  vib_trip_limit: number;
  fault_time_limit_sec: number;
  fault_sensor_corrupt: boolean;
  fault_firebase_offline: boolean;
}

export interface EventLog {
  id: string;
  timestamp: string;
  type: "STATE" | "ALARM" | "INTERLOCK_REJECT" | "FAULT" | "MODE" | "PARAM";
  message: string;
}

export interface AuthUserInfo {
  email: string | null;
  uid: string | null;
  isAuthenticated: boolean;
}

export interface SystemStats {
  healthScore: number;
  totalUptimeSec: number;
  totalTrips: number;
  lastTripReason: string;
}
