import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { config } from '../config.js'

const TOKEN_FILE = join(config.appHome, '.token')

export async function getToken(): Promise<string | null> {
  if (config.authToken) return config.authToken
  try {
    const buf = await readFile(TOKEN_FILE, 'utf-8')
    return buf.trim()
  } catch {
    return null
  }
}

export async function ensureToken(): Promise<string> {
  if (config.authToken) return config.authToken
  const existing = await getToken()
  if (existing) return existing
  const token = randomBytes(32).toString('hex')
  await mkdir(config.appHome, { recursive: true })
  await writeFile(TOKEN_FILE, token + '\n', { mode: 0o600 })
  return token
}
