import { Hono } from 'hono'
import { readFile } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import { config } from '../../config.js'

const app = new Hono()

app.get('/api/hermes/download', async (c) => {
  const path = c.req.query('path')
  const name = c.req.query('name')
  if (!path) {
    return c.json({ error: 'Missing path' }, 400)
  }

  const filePath = join(config.uploadDir, path)
  if (!existsSync(filePath)) {
    return c.json({ error: 'File not found' }, 404)
  }

  try {
    const buffer = await readFile(filePath)
    const fileName = name || basename(path)
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
    return c.body(buffer)
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

export { app as downloadRoutes }
