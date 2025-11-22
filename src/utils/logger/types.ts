export interface LogEntry {
  sessionId: string;
  level: string;
  message: string;
  timestamp: string;
  caller: string;
  sequence: number;
}

export interface ApiLogOptions {
  caller: string;
  level: LogLevel;
  sequence: number;
}

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LoggerConfig {
  enabled: boolean;
  apiEndpoint: string;
  sessionId: string;
  batchInterval: number; // milliseconds
}
