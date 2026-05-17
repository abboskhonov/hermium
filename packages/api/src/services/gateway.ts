import { config } from '../config.js'
import { logger } from '../lib/logger.js'

/**
 * GatewayManager — resolves upstream Hermes Gateway URLs per profile.
 * Mirrors hermes-web-ui GatewayManager behavior.
 */

class GatewayManager {
  private upstreamMap = new Map<string, string>()
  private apiKeyMap = new Map<string, string>()

  getUpstream(profile?: string): string {
    const p = profile || 'default'
    const cached = this.upstreamMap.get(p)
    if (cached) return cached
    const url = `http://${config.gatewayHost}:8642`
    this.upstreamMap.set(p, url)
    return url
  }

  getApiKey(profile?: string): string | undefined {
    const p = profile || 'default'
    return this.apiKeyMap.get(p)
  }

  setUpstream(profile: string, url: string) {
    this.upstreamMap.set(profile, url)
    logger.info(`Gateway upstream set for profile ${profile}: ${url}`)
  }

  setApiKey(profile: string, key: string) {
    this.apiKeyMap.set(profile, key)
  }
}

let instance: GatewayManager | null = null

export function initGatewayManager(): GatewayManager {
  if (!instance) {
    instance = new GatewayManager()
  }
  return instance
}

export function getGatewayManagerInstance(): GatewayManager {
  if (!instance) {
    throw new Error('GatewayManager not initialized')
  }
  return instance
}
