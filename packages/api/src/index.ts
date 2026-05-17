import { mkdir } from 'fs/promises'
import { config } from './config.js'
import { ensureToken } from './services/auth.js'
import { initGatewayManager } from './services/gateway.js'
import { initAllStores } from './db/init.js'
import { closeDb } from './db/index.js'
import { logger } from './lib/logger.js'
import { createApp } from './routes/index.js'

const APP_VERSION = process.env.APP_VERSION || 'dev'

async function bootstrap() {
  console.log(`hermium-api v${APP_VERSION} starting...`)
  logger.info(`hermium-api v${APP_VERSION} starting...`)

  // Ensure directories
  await mkdir(config.uploadDir, { recursive: true })
  await mkdir(config.dataDir, { recursive: true })

  // Auth token
  const token = await ensureToken()
  if (token) {
    console.log(`Auth enabled — token: ${token}`)
    logger.info('Auth enabled')
  }

  // Gateway manager
  initGatewayManager()
  logger.info('Gateway manager initialized')

  // Database
  initAllStores()
  logger.info('Database initialized')

  // Create app
  const staticDir = process.env.WEB_STATIC_DIR
  const app = createApp(staticDir)

  // Start server
  const server = Bun.serve({
    hostname: config.host,
    port: config.port,
    fetch: app.fetch,
  })

  const localUrl = `http://localhost:${config.port}`
  console.log(`Server running at ${localUrl}`)
  logger.info(`Server running at ${localUrl}`)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`)
    logger.info(`Received ${signal}, shutting down...`)
    server.stop()
    closeDb()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

bootstrap().catch((err) => {
  console.error('FATAL: Failed to start API server', err)
  logger.fatal('Failed to start API server', { error: err.message })
  process.exit(1)
})
