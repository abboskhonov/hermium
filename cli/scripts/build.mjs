import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { cpSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..', '..', '..')
const cliDir = resolve(__dirname, '..')
const distDir = resolve(cliDir, 'dist')
const serverOut = resolve(distDir, 'server', 'index.mjs')
const webOut = resolve(distDir, 'public')

const apiSrc = resolve(rootDir, 'apps', 'api', 'src', 'index.ts')
const webDir = resolve(rootDir, 'apps', 'web')

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: cwd || rootDir,
      stdio: 'inherit',
      shell: false,
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
      else resolve()
    })
  })
}

async function main() {
  console.log('Building Hermium CLI package...')
  console.log()

  // Clean dist
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true })
  }
  mkdirSync(resolve(distDir, 'server'), { recursive: true })
  mkdirSync(webOut, { recursive: true })

  // ── 1. Build web frontend ───────────────────────────────────────────────
  console.log('→ Building apps/web...')
  await run('bun', ['install'], webDir)
  await run('bun', ['run', 'build'], webDir)

  // Copy built web assets. Vite/TanStack Start may output to dist/ or .output/
  const webDist = resolve(webDir, 'dist')
  const webOutput = resolve(webDir, '.output', 'public')
  const webVinxi = resolve(webDir, '.vinxi', 'production')

  let sourceDir = null
  if (existsSync(webDist) && !isEmpty(webDist)) {
    sourceDir = webDist
  } else if (existsSync(webOutput) && !isEmpty(webOutput)) {
    sourceDir = webOutput
  } else if (existsSync(webVinxi) && !isEmpty(webVinxi)) {
    sourceDir = webVinxi
  }

  if (!sourceDir) {
    console.error('✗ Could not find built web assets in apps/web/')
    console.error('  Checked: dist/, .output/public/, .vinxi/production/')
    process.exit(1)
  }

  cpSync(sourceDir, webOut, { recursive: true, force: true })
  console.log(`  ✓ Web assets copied from ${sourceDir.replace(rootDir + '/', '')}`)
  console.log()

  // ── 2. Bundle API server ────────────────────────────────────────────────
  console.log('→ Bundling apps/api...')

  // bun build handles workspace packages natively
  await run('bun', [
    'build',
    apiSrc,
    '--outfile', serverOut,
    '--target', 'node',
    '--format', 'esm',
    '--minify',
  ], rootDir)

  console.log('  ✓ API server bundled')
  console.log()

  // ── 3. Copy web SSR server ────────────────────────────────────────────
  console.log('→ Copying web SSR server...')
  const webServerSrc = resolve(webDir, '.output', 'server')
  const webServerOut = resolve(distDir, 'web-server')
  if (!existsSync(webServerSrc)) {
    console.error('✗ Web SSR server not found at', webServerSrc)
    process.exit(1)
  }
  mkdirSync(webServerOut, { recursive: true })
  cpSync(webServerSrc, webServerOut, { recursive: true, force: true })
  console.log('  ✓ Web SSR server copied')
  console.log()

  console.log('Done.')
  console.log(`  API server:  ${serverOut}`)
  console.log(`  Web server:  ${resolve(webServerOut, 'index.mjs')}`)
  console.log(`  Web assets:  ${webOut}`)
}

function isEmpty(dir) {
  try {
    return readdirSync(dir).length === 0
  } catch {
    return true
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
