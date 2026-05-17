import { Hono } from 'hono'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { config } from '../../config.js'

const app = new Hono()

app.get('/api/hermes/files/*', (c) => c.json({ files: [] }))

app.post('/api/hermes/files/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const files = formData.getAll('file') as File[]
    const targetDir = c.req.query('path') || 'uploads'
    const uploadDir = join(config.uploadDir, targetDir)
    await mkdir(uploadDir, { recursive: true })

    const uploaded: { name: string; path: string }[] = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const filePath = join(uploadDir, file.name)
      await writeFile(filePath, Buffer.from(bytes))
      const relativePath = join(targetDir, file.name)
      uploaded.push({ name: file.name, path: relativePath })
    }

    return c.json({ files: uploaded })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.delete('/api/hermes/files/*', (c) => c.json({ ok: true }))

export { app as fileRoutes }
