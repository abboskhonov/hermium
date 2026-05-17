import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { config } from '../config.js'
import { getToken } from '../services/auth.js'

export const authMiddleware = createMiddleware(async (c, next) => {
  if (config.authDisabled) {
    return next()
  }

  const authHeader = c.req.header('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const serverToken = await getToken()

  if (serverToken && token !== serverToken) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  return next()
})

export const optionalAuth = createMiddleware(async (c, next) => {
  if (config.authDisabled) {
    return next()
  }
  return next()
})
