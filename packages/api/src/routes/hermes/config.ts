import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/config', (c) => c.json({ config: {} }))
app.put('/api/hermes/config', (c) => c.json({ ok: true }))

export { app as configRoutes }
