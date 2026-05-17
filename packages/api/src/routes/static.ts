import { Hono } from 'hono'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export function createStaticRoutes(staticDir: string) {
  const app = new Hono()

  app.get('*', async (c) => {
    let filePath = c.req.path
    if (filePath === '/') filePath = '/index.html'

    const fullPath = join(staticDir, filePath)
    const resolved = resolve(fullPath)

    // Security: must be within staticDir
    if (!resolved.startsWith(resolve(staticDir))) {
      return c.notFound()
    }

    if (!existsSync(fullPath)) {
      // SPA fallback: serve index.html for unknown routes
      const indexPath = join(staticDir, 'index.html')
      if (existsSync(indexPath)) {
        const content = await readFile(indexPath, 'utf-8')
        return c.html(content)
      }
      return c.notFound()
    }

    const content = await readFile(fullPath)

    // Guess content type
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      js: 'text/javascript',
      mjs: 'text/javascript',
      css: 'text/css',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      woff2: 'font/woff2',
      woff: 'font/woff',
      ttf: 'font/ttf',
      otf: 'font/otf',
      webp: 'image/webp',
    }
    const mime = mimeTypes[ext] || 'application/octet-stream'
    c.header('Content-Type', mime)

    return c.body(content)
  })

  return app
}
