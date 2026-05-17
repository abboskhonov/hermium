import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/models', (c) => c.json({ models: [] }))
app.get('/api/hermes/models/discover', (c) => c.json({ models: [] }))

export { app as modelRoutes }
