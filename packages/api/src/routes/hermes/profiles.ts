import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/profiles', (c) => c.json({ profiles: [], active: 'default' }))
app.post('/api/hermes/profiles', (c) => c.json({ ok: true }))
app.post('/api/hermes/profiles/:name/activate', (c) => c.json({ ok: true }))
app.delete('/api/hermes/profiles/:name', (c) => c.json({ ok: true }))

export { app as profileRoutes }
