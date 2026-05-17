#!/usr/bin/env node
import { execSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpSync, rmSync, mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgDir = resolve(__dirname, '..')
const rootDir = resolve(pkgDir, '..', '..')
const distDir = resolve(pkgDir, 'dist')

console.log('🔨 Building Hermium CLI package...')

// Clean
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true })
}
mkdirSync(distDir, { recursive: true })

// Build API
console.log('→ Building API...')
execSync('bun run build:api', { cwd: rootDir, stdio: 'inherit' })

// Build Web
console.log('→ Building Web...')
execSync('bun run build:web', { cwd: rootDir, stdio: 'inherit' })

// Copy API bundle
const apiEntry = resolve(rootDir, 'packages', 'api', 'dist', 'index.js')
if (existsSync(apiEntry)) {
  cpSync(apiEntry, resolve(distDir, 'api.mjs'))
} else {
  console.error('✗ API build output not found')
  process.exit(1)
}

// Copy Nitro SSR server
const nitroServer = resolve(rootDir, 'packages', 'web', '.output', 'server')
if (existsSync(nitroServer)) {
  cpSync(nitroServer, resolve(distDir, 'server'), { recursive: true })
} else {
  console.error('✗ Nitro server build output not found')
  process.exit(1)
}

// Copy public assets (CSS, JS, images) — Nitro looks for 'public' relative to server entry
const publicDir = resolve(rootDir, 'packages', 'web', '.output', 'public')
if (existsSync(publicDir)) {
  cpSync(publicDir, resolve(distDir, 'public'), { recursive: true })
  cpSync(publicDir, resolve(distDir, 'server', 'public'), { recursive: true })
}

console.log('✓ CLI package built to', distDir)
