import { Hono } from 'hono'
import { ensureToken, getToken } from '../services/auth.js'

const publicApp = new Hono()

publicApp.post('/api/auth/token', async (c) => {
  const token = await ensureToken()
  return c.json({ token })
})

publicApp.get('/api/auth/status', async (c) => {
  const token = await getToken()
  return c.json({ enabled: !!token })
})

const protectedApp = new Hono()

protectedApp.post('/api/auth/logout', async (c) => {
  return c.json({ ok: true })
})

export { publicApp as authPublicRoutes, protectedApp as authProtectedRoutes }
