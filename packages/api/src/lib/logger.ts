/**
 * Simple structured logger.
 * In production, swap for pino or similar.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

const LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
}

const currentLevel = LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info']

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel) return
  const ts = new Date().toISOString()
  const payload = meta ? ` ${JSON.stringify(meta)}` : ''
  const output = `[${ts}] [${level.toUpperCase()}] ${message}${payload}`
  if (level === 'error' || level === 'fatal') {
    console.error(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  trace: (msg: string, meta?: Record<string, unknown>) => log('trace', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  fatal: (msg: string, meta?: Record<string, unknown>) => log('fatal', msg, meta),
} as const
