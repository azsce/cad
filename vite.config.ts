import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ViteDevServer, Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface LogEntry {
  sessionId: string
  level: string
  message: string
  timestamp: string
  caller?: string
  sequence: number
}

// Logger middleware plugin
function loggerPlugin(): Plugin {
  return {
    name: 'vite-logger-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/logs', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })

        req.on('end', () => {
          void (async () => {
            try {
              const { logs } = JSON.parse(body) as { logs: LogEntry[] }

              if (!logs || !Array.isArray(logs)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid request format' }))
                return
              }

              // Group by session
              const logsBySession = new Map<string, LogEntry[]>()
              for (const log of logs) {
                const existingLogs = logsBySession.get(log.sessionId)
                if (existingLogs) {
                  existingLogs.push(log)
                } else {
                  logsBySession.set(log.sessionId, [log])
                }
              }

              // Write logs
              const logsDir = join(process.cwd(), 'logs')
              await mkdir(logsDir, { recursive: true })

              for (const [sessionId, sessionLogs] of logsBySession) {
                const logFileName = `client_${sessionId}.log`
                const logFilePath = join(logsDir, logFileName)

                // Sort by sequence
                sessionLogs.sort((a, b) => a.sequence - b.sequence)

                const logLines = sessionLogs
                  .map(
                    (entry) =>
                      `[${entry.timestamp}] [${entry.level.toUpperCase()}] [SEQ:${entry.sequence.toString()}] [${entry.caller || 'unknown'}] ${entry.message}\n`,
                  )
                  .join('')

                await writeFile(logFilePath, logLines, { flag: 'a' })
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, count: logs.length }))
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to write logs' }))
            }
          })()
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    loggerPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.gitpod.dev', '.gitpod.io'],
  },
})
