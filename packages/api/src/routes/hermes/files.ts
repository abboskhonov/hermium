import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/files/*', (c) => c.json({ files: [] }))
app.post('/api/hermes/files/upload', (c) => c.json({ ok: true }))
app.delete('/api/hermes/files/*', (c) => c.json({ ok: true }))

export { app as fileRoutes }
