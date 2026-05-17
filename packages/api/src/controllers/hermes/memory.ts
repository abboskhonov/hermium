import type { Context } from 'hono'
import { readFile, stat, writeFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'

function getHermesDir(): string {
  // Match hermes-web-ui logic: HERMES_HOME env var, or ~/.hermes
  if (process.env.HERMES_HOME) {
    return resolve(process.env.HERMES_HOME)
  }
  return resolve(homedir(), '.hermes')
}

const hermesDir = getHermesDir()
const memoriesDir = join(hermesDir, 'memories')
const soulPath = join(hermesDir, 'SOUL.md')

async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

async function safeStat(path: string) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}

export async function getMemory(c: Context) {
  await mkdir(memoriesDir, { recursive: true })
  const memoryPath = join(memoriesDir, 'MEMORY.md')
  const userPath = join(memoriesDir, 'USER.md')

  const [memory, user, soul, memoryStat, userStat, soulStat] = await Promise.all([
    safeReadFile(memoryPath),
    safeReadFile(userPath),
    safeReadFile(soulPath),
    safeStat(memoryPath),
    safeStat(userPath),
    safeStat(soulPath),
  ])

  return c.json({
    memory: memory || '',
    user: user || '',
    soul: soul || '',
    memory_mtime: memoryStat?.mtime ? memoryStat.mtime.getTime() : null,
    user_mtime: userStat?.mtime ? userStat.mtime.getTime() : null,
    soul_mtime: soulStat?.mtime ? soulStat.mtime.getTime() : null,
  })
}

export async function saveMemory(c: Context) {
  const body = await c.req.json<{ section: string; content: string }>()
  if (!body.section || body.content === undefined) {
    return c.json({ error: 'Missing section or content' }, 400)
  }
  if (body.section !== 'memory' && body.section !== 'user' && body.section !== 'soul') {
    return c.json({ error: 'Section must be "memory", "user", or "soul"' }, 400)
  }

  let filePath: string
  if (body.section === 'soul') {
    filePath = soulPath
  } else {
    await mkdir(memoriesDir, { recursive: true })
    const fileName = body.section === 'memory' ? 'MEMORY.md' : 'USER.md'
    filePath = join(memoriesDir, fileName)
  }

  try {
    await writeFile(filePath, body.content, 'utf-8')
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
}
