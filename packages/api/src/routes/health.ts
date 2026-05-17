import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok', version: process.env.APP_VERSION || 'dev' })
})

export { app as healthRoutes }
