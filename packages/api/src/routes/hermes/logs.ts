import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/logs', (c) => c.json({ logs: [] }))

export { app as logRoutes }
