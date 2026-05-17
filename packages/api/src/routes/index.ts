import { Hono } from 'hono'
import { corsMiddleware } from '../middleware/cors.js'
import { requestLogger } from '../middleware/logger.js'
import { authMiddleware } from '../middleware/auth.js'
import { healthRoutes } from './health.js'
import { authPublicRoutes, authProtectedRoutes } from './auth.js'
import { sessionRoutes } from './hermes/sessions.js'
import { chatRoutes } from './hermes/chat.js'
import { fileRoutes } from './hermes/files.js'
import { downloadRoutes } from './hermes/download.js'
import { modelRoutes } from './hermes/models.js'
import { providerRoutes } from './hermes/providers.js'
import { profileRoutes } from './hermes/profiles.js'
import { gatewayRoutes } from './hermes/gateways.js'
import { jobRoutes } from './hermes/jobs.js'
import { logRoutes } from './hermes/logs.js'
import { configRoutes } from './hermes/config.js'
import { proxyRoutes } from './hermes/proxy.js'
import { memoryRoutes } from './hermes/memory.js'
import { usageRoutes } from './hermes/usage.js'

export function createApp(): Hono {
  const app = new Hono()

  // Global middleware
  app.use(corsMiddleware)
  app.use(requestLogger)

  // Public routes
  app.route('/', healthRoutes)
  app.route('/', authPublicRoutes)

  // Auth middleware
  app.use(authMiddleware)

  // Protected routes
  app.route('/', authProtectedRoutes)
  app.route('/', sessionRoutes)
  app.route('/', chatRoutes)
  app.route('/', fileRoutes)
  app.route('/', downloadRoutes)
  app.route('/', modelRoutes)
  app.route('/', providerRoutes)
  app.route('/', profileRoutes)
  app.route('/', gatewayRoutes)
  app.route('/', jobRoutes)
  app.route('/', logRoutes)
  app.route('/', configRoutes)
  app.route('/', memoryRoutes)
  app.route('/', usageRoutes)

  // Proxy catch-all (must be last)
  app.route('/', proxyRoutes)

  // JSON 404 for anything that truly isn't matched
  app.notFound((c) => c.json({ error: { message: `Not Found: ${c.req.method} ${c.req.path}` } }, 404))

  return app
}
