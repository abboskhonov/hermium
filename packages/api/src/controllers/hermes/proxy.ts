import type { Context, Next } from 'hono'
import { getGatewayManagerInstance } from '../../services/gateway.js'
import { logger } from '../../lib/logger.js'

function resolveProfile(c: Context): string {
  return c.req.header('x-hermes-profile') || c.req.query('profile') || 'default'
}

function buildProxyHeaders(c: Context, upstream: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const skip = new Set(['host', 'origin', 'referer', 'connection', 'authorization'])
  c.req.raw.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'host') {
      headers['host'] = new URL(upstream).host
    } else if (!skip.has(lower)) {
      headers[key] = value
    }
  })

  const mgr = getGatewayManagerInstance()
  const apiKey = mgr.getApiKey(resolveProfile(c))
  if (apiKey) {
    headers['authorization'] = `Bearer ${apiKey}`
  }

  return headers
}

export async function proxyToGateway(c: Context, next: Next) {
  const profile = resolveProfile(c)
  const mgr = getGatewayManagerInstance()
  const upstream = mgr.getUpstream(profile)

  const originalPath = c.req.path
  const upstreamPath = originalPath.replace(/^\/api\/hermes\/v1/, '/v1').replace(/^\/api\/hermes/, '/api')
  const url = new URL(upstreamPath, upstream)

  // Forward query params except token
  const originalQuery = new URL(c.req.url).searchParams
  originalQuery.forEach((value, key) => {
    if (key !== 'token') {
      url.searchParams.append(key, value)
    }
  })

  const headers = buildProxyHeaders(c, upstream)
  const method = c.req.method

  let body: BodyInit | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const cloned = c.req.raw.clone()
    if (cloned.body) {
      body = cloned.body
    }
  }

  try {
    logger.info(`Proxy ${method} ${originalPath} → ${url.toString()}`)
    const res = await fetch(url.toString(), { method, headers, body })

    c.status(res.status as unknown as Parameters<typeof c.status>[0])
    res.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower !== 'transfer-encoding' && lower !== 'connection') {
        c.header(key, value)
      }
    })

    // TODO: intercept SSE for usage tracking (mirror hermes-web-ui proxy-handler.ts)
    // TODO: intercept POST /v1/runs for run_id → session_id mapping

    if (!res.body) {
      return c.body(null)
    }
    return c.body(res.body)
  } catch (err: any) {
    logger.error('Proxy error', { error: err.message, path: originalPath })
    return c.json({ error: { message: `Proxy error: ${err.message}` } }, 502)
  }
}
