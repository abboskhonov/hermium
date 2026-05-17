import type { Context, Next } from 'hono'

const WEB_URL = process.env.HERMIUM_WEB_URL || 'http://127.0.0.1:42424'

export async function webProxyMiddleware(c: Context, next: Next) {
  // Skip API routes — only proxy non-API requests
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/upload/') || c.req.path === '/health') {
    return next()
  }

  const originalUrl = new URL(c.req.url)
  const target = new URL(c.req.path, WEB_URL)
  originalUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value))
  const url = target.toString()

  const headers = new Headers(c.req.raw.headers)
  headers.delete('host')

  try {
    const response = await fetch(url.toString(), {
      method: c.req.method,
      headers,
      body: c.req.raw.body,
      redirect: 'manual',
    })

    const respHeaders = new Headers(response.headers)
    respHeaders.delete('content-encoding')
    respHeaders.delete('transfer-encoding')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    })
  } catch (err) {
    return c.json({ error: { message: `Web server unreachable: ${err instanceof Error ? err.message : String(err)}` } }, 502)
  }
}
