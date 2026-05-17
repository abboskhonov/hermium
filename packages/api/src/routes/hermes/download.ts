import { Hono } from 'hono'

const app = new Hono()

app.get('/api/hermes/download/*', (c) => c.text('Not implemented', 501))

export { app as downloadRoutes }
