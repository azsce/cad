import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ViteDevServer, Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

interface LogEntry {
  sessionId: string;
  level: string;
  message: string;
  timestamp: string;
  caller?: string;
  sequence: number;
}

// Helper to group logs by session
function groupLogsBySession(logs: LogEntry[]): Map<string, LogEntry[]> {
  const logsBySession = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const existingLogs = logsBySession.get(log.sessionId);
    if (existingLogs) {
      existingLogs.push(log);
    } else {
      logsBySession.set(log.sessionId, [log]);
    }
  }
  return logsBySession;
}

// Helper to format log entry
function formatLogEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [SEQ:${entry.sequence.toString()}] [${entry.caller || "unknown"}] ${entry.message}\n`;
}

// Helper to write session logs
async function writeSessionLogs(sessionId: string, sessionLogs: LogEntry[], logsDir: string): Promise<void> {
  const logFileName = `client_${sessionId}.log`;
  const logFilePath = join(logsDir, logFileName);

  // Sort by sequence
  sessionLogs.sort((a, b) => a.sequence - b.sequence);

  const logLines = sessionLogs.map(formatLogEntry).join("");

  await writeFile(logFilePath, logLines, { flag: "a" });
}

// Helper to handle log request
async function handleLogRequest(logs: LogEntry[]): Promise<void> {
  const logsBySession = groupLogsBySession(logs);

  // Write logs
  const logsDir = join(process.cwd(), "logs");
  await mkdir(logsDir, { recursive: true });

  for (const [sessionId, sessionLogs] of logsBySession) {
    await writeSessionLogs(sessionId, sessionLogs, logsDir);
  }
}

// Helper to handle request body parsing
function handleRequestData(req: IncomingMessage, onComplete: (body: string) => void): void {
  let body = "";
  req.on("data", (chunk: Buffer) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    onComplete(body);
  });
}

// Helper to process log request
async function processLogRequest(body: string, res: ServerResponse): Promise<void> {
  try {
    const { logs } = JSON.parse(body) as { logs: LogEntry[] };

    if (!logs || !Array.isArray(logs)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid request format" }));
      return;
    }

    await handleLogRequest(logs);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, count: logs.length }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Failed to write logs" }));
  }
}

// Helper to handle log endpoint
function handleLogEndpoint(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  handleRequestData(req, (body: string) => {
    processLogRequest(body, res).catch(() => {
      // Handle any unhandled promise rejections
    });
  });
}

// Logger middleware plugin
function loggerPlugin(): Plugin {
  return {
    name: "vite-logger-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/logs", handleLogEndpoint);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/cad/" : "/",
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    loggerPlugin(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".gitpod.dev", ".gitpod.io"],
  },
  logLevel: "info",
});
