import type { LogEntry, LogLevel, LoggerConfig, ApiLogOptions } from "./types";

type LogOptions = {
  caller: string;
};

class ClientLogger {
  private readonly config: LoggerConfig;
  private readonly sessionId: string;
  private sequenceNumber: number;
  private logQueue: LogEntry[];
  private batchTimer: ReturnType<typeof setTimeout> | null;

  constructor() {
    // Only enable in development
    const enabled = import.meta.env.DEV;
    this.sessionId = this.generateSessionId();
    this.sequenceNumber = 0;
    this.logQueue = [];
    this.batchTimer = null;

    this.config = {
      enabled,
      apiEndpoint: "/api/logs",
      sessionId: this.sessionId,
      batchInterval: 2000, // 2s
    };
  }

  private padZero(num: number, length: number = 2): string {
    return String(num).padStart(length, "0");
  }

  private formatDateParts(date: Date): {
    year: string;
    month: string;
    day: string;
    hours: string;
    minutes: string;
    seconds: string;
    milliseconds: string;
  } {
    return {
      year: date.getFullYear().toString(),
      month: this.padZero(date.getMonth() + 1),
      day: this.padZero(date.getDate()),
      hours: this.padZero(date.getHours()),
      minutes: this.padZero(date.getMinutes()),
      seconds: this.padZero(date.getSeconds()),
      milliseconds: this.padZero(date.getMilliseconds(), 3),
    };
  }

  private generateSessionId(): string {
    const parts = this.formatDateParts(new Date());
    return `${parts.year}-${parts.month}-${parts.day}_${parts.hours}-${parts.minutes}-${parts.seconds}`;
  }

  private getColorCode(level: LogLevel): string {
    const colors = {
      log: "#888",
      info: "#2196F3",
      warn: "#FF9800",
      error: "#F44336",
      debug: "#9C27B0",
    };
    return colors[level] || "#888";
  }

  private formatTimestamp(): string {
    const parts = this.formatDateParts(new Date());
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hours}:${parts.minutes}:${parts.seconds}.${parts.milliseconds}`;
  }

  private serializeForAPI(...args: unknown[]): string {
    // Convert args to a string for API logging only
    return args
      .map(arg => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");
  }

  private queueLogEntry(options: ApiLogOptions, ...args: unknown[]): void {
    if (!this.config.enabled) return;

    const message = this.serializeForAPI(...args);
    const logEntry: LogEntry = {
      sessionId: this.sessionId,
      level: options.level,
      message,
      timestamp: this.formatTimestamp(),
      caller: options.caller,
      sequence: options.sequence,
    };

    this.logQueue.push(logEntry);
    this.scheduleBatchSend();
  }

  private scheduleBatchSend(): void {
    if (this.batchTimer !== null) return;

    this.batchTimer = globalThis.setTimeout(() => {
      void this.flushLogs();
    }, this.config.batchInterval);
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    this.batchTimer = null;

    try {
      await fetch(this.config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch {
      // Silently fail - don't log errors to avoid infinite loops
    }
  }

  private logToConsole(options: ApiLogOptions, ...args: unknown[]): void {
    if (!this.config.enabled) return;

    const timestamp = this.formatTimestamp();
    const color = this.getColorCode(options.level);

    // Console output with colors - let browser handle formatting naturally
    const consoleArgs = [
      `%c[${timestamp}] [${options.level.toUpperCase()}] [${options.caller || "unknown"}]`,
      `color: ${color}; font-weight: bold;`,
      ...args,
    ];

    switch (options.level) {
      case "log":
        console.log(...consoleArgs);
        break;
      case "info":
        console.info(...consoleArgs);
        break;
      case "warn":
        console.warn(...consoleArgs);
        break;
      case "error":
        console.error(...consoleArgs);
        break;
      case "debug":
        console.debug(...consoleArgs);
        break;
    }

    // Queue for batch send
    this.queueLogEntry(options, ...args);
  }

  public log(options: LogOptions, ...args: unknown[]): void {
    const apiOptions: ApiLogOptions = {
      caller: options.caller,
      level: "log",
      sequence: ++this.sequenceNumber,
    };
    this.logToConsole(apiOptions, ...args);
  }

  public info(options: LogOptions, ...args: unknown[]): void {
    const apiOptions: ApiLogOptions = {
      caller: options.caller,
      level: "info",
      sequence: ++this.sequenceNumber,
    };
    this.logToConsole(apiOptions, ...args);
  }

  public warn(options: LogOptions, ...args: unknown[]): void {
    const apiOptions: ApiLogOptions = {
      caller: options.caller,
      level: "warn",
      sequence: ++this.sequenceNumber,
    };
    this.logToConsole(apiOptions, ...args);
  }

  public error(options: LogOptions, ...args: unknown[]): void {
    const apiOptions: ApiLogOptions = {
      caller: options.caller,
      level: "error",
      sequence: ++this.sequenceNumber,
    };
    this.logToConsole(apiOptions, ...args);
  }

  public debug(options: LogOptions, ...args: unknown[]): void {
    const apiOptions: ApiLogOptions = {
      caller: options.caller,
      level: "debug",
      sequence: ++this.sequenceNumber,
    };
    this.logToConsole(apiOptions, ...args);
  }
}

// Create singleton instance
export const logger = new ClientLogger();
export default logger;
