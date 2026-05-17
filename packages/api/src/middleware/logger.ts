import { createMiddleware } from 'hono/factory'
import { logger } from '../lib/logger.js'

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  logger.info(`${c.req.method} ${c.req.path} — ${c.res.status} (${duration}ms)`, {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  })
})
