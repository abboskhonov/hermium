import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/jobs', (c) => c.json({ jobs: [] }))
app.post('/api/hermes/jobs', (c) => c.json({ ok: true }))
app.patch('/api/hermes/jobs/:id', (c) => c.json({ ok: true }))
app.delete('/api/hermes/jobs/:id', (c) => c.json({ ok: true }))
app.post('/api/hermes/jobs/:id/run', (c) => c.json({ ok: true }))

export { app as jobRoutes }
