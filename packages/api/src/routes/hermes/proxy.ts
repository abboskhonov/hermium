import { Hono } from 'hono'
import { proxyToGateway } from '../../controllers/hermes/proxy.js'

const app = new Hono()

// Proxy ONLY /api/hermes/v1/* to the Hermes Gateway.
// Internal BFF routes (/api/hermes/chat, /api/hermes/sessions, etc.)
// are handled by explicit route modules and must NOT be caught here.
app.all('/api/hermes/v1/*', proxyToGateway)

export { app as proxyRoutes, proxyToGateway as proxyMiddleware }
