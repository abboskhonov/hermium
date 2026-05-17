import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/providers', (c) => c.json({ providers: [] }))
app.post('/api/hermes/providers', (c) => c.json({ ok: true }))
app.patch('/api/hermes/providers/:id', (c) => c.json({ ok: true }))
app.delete('/api/hermes/providers/:id', (c) => c.json({ ok: true }))

export { app as providerRoutes }
