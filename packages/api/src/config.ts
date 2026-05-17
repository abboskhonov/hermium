import { join, resolve } from 'path'
import { homedir } from 'os'

/**
 * API / BFF environment configuration.
 * Mirrors hermes-web-ui server config but adapted for Hono + Bun.
 */

function getWebUiHome(): string {
  const envHome = process.env.HERMES_WEB_UI_HOME?.trim() || process.env.HERMES_WEBUI_STATE_DIR?.trim()
  return envHome ? resolve(envHome) : join(homedir(), '.hermium-web-ui')
}

export const appHome = getWebUiHome()

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.BIND_HOST?.trim() || '0.0.0.0',
  appHome,
  uploadDir: process.env.UPLOAD_DIR || join(appHome, 'upload'),
  dataDir: join(appHome, 'data'),
  dbPath: join(appHome, 'data', 'web-ui.db'),
  corsOrigins: process.env.CORS_ORIGINS || '*',
  authDisabled: process.env.AUTH_DISABLED === '1' || process.env.AUTH_DISABLED === 'true',
  authToken: process.env.AUTH_TOKEN || undefined,
  profile: process.env.PROFILE || 'default',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxDownloadSize: process.env.MAX_DOWNLOAD_SIZE || '200MB',
  maxEditSize: process.env.MAX_EDIT_SIZE || '10MB',
  workspaceBase: process.env.WORKSPACE_BASE || '/opt/data/workspace',
  gatewayHost: process.env.GATEWAY_HOST || '127.0.0.1',
  stopGatewaysOnShutdown: process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN,
} as const
