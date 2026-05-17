import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/gateways', (c) => c.json({ gateways: [] }))
app.post('/api/hermes/gateways/:profile/start', (c) => c.json({ ok: true }))
app.post('/api/hermes/gateways/:profile/stop', (c) => c.json({ ok: true }))

export { app as gatewayRoutes }
