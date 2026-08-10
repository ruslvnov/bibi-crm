import { maskPhone } from './phone'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function maskSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj
  const masked = { ...(obj as Record<string, unknown>) }
  for (const key of Object.keys(masked)) {
    const val = masked[key]
    if (typeof val === 'string') {
      if (/api[_-]?key|secret|password|token/i.test(key)) {
        masked[key] = '***REDACTED***'
      } else if (/phone|whatsapp/i.test(key) && val.startsWith('+')) {
        masked[key] = maskPhone(val)
      }
    } else if (typeof val === 'object') {
      masked[key] = maskSensitive(val)
    }
  }
  return masked
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? (maskSensitive(meta) as Record<string, unknown>) : {}),
  }
  const output = JSON.stringify(entry)
  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') log('debug', message, meta)
  },
}
