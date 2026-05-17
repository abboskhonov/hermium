#!/usr/bin/env node
import { spawn, execSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, statSync, openSync } from 'fs'
import { homedir } from 'os'
import pc from 'picocolors'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'))
const CURRENT_VERSION = pkg.version

const HERMIUM_HOME = resolve(homedir(), '.hermium')
const PID_FILE = join(HERMIUM_HOME, 'hermium.pid')
const LOG_FILE = join(HERMIUM_HOME, 'hermium.log')
const DEFAULT_API_PORT = 47474
const DEFAULT_WEB_PORT = 42424

// ─── Runtime detection ─────────────────────────────────────────────────────

function getRuntimeCmd() {
  try {
    execSync('bun --version', { stdio: 'ignore' })
    return 'bun'
  } catch {
    const exe = process.execPath
    const isBun = exe.includes('bun') || (process.versions && process.versions.bun)
    if (!isBun) {
      console.log(pc.red('  ✗ Bun is required to run Hermium.'))
      console.log('    Install:  curl -fsSL https://bun.sh/install | bash')
      console.log('    Or:       npm install -g bun')
      process.exit(1)
    }
    return exe
  }
}

// ─── Version check ─────────────────────────────────────────────────────────

async function checkLatestVersion() {
  const cacheFile = join(HERMIUM_HOME, '.version-check')
  const now = Date.now()
  try {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf-8'))
    if (cache.ts && now - cache.ts < 60 * 60 * 1000) {
      if (cache.latest && cache.latest !== CURRENT_VERSION) {
        console.log(pc.yellow(`  ⚠ A new version of Hermium is available: ${cache.latest} (you have ${CURRENT_VERSION})`))
        console.log(`    Upgrade: npm install -g hermium@latest`)
      }
      return
    }
  } catch {}

  try {
    const res = await fetch('https://registry.npmjs.org/hermium/latest', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return
    const data = await res.json()
    const latest = data.version
    writeFileSync(cacheFile, JSON.stringify({ ts: now, latest }))
    if (latest && latest !== CURRENT_VERSION) {
      console.log(pc.yellow(`  ⚠ A new version of Hermium is available: ${latest} (you have ${CURRENT_VERSION})`))
      console.log(`    Upgrade: npm install -g hermium@latest`)
    }
  } catch {
    // silent fail — don't block startup for network issues
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function readPid() {
  try {
    const raw = readFileSync(PID_FILE, 'utf-8').trim()
    const [apiPid, webPid] = raw.split(',').map(s => parseInt(s.trim()))
    return { apiPid: Number.isFinite(apiPid) ? apiPid : null, webPid: Number.isFinite(webPid) ? webPid : null }
  } catch {
    return { apiPid: null, webPid: null }
  }
}

function isRunning(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err?.code === 'EPERM'
  }
}

function getPids() {
  const { apiPid, webPid } = readPid()
  const apiRunning = apiPid && isRunning(apiPid)
  const webRunning = webPid && isRunning(webPid)
  if (!apiRunning && !webRunning) {
    removePid()
    return { apiPid: null, webPid: null }
  }
  return { apiPid: apiRunning ? apiPid : null, webPid: webRunning ? webPid : null }
}

function writePid(apiPid, webPid) {
  mkdirSync(HERMIUM_HOME, { recursive: true })
  writeFileSync(PID_FILE, `${apiPid},${webPid}`)
}

function removePid() {
  try { unlinkSync(PID_FILE) } catch {}
}

function getApiPort() {
  const idx = process.argv.indexOf('--port')
  if (idx !== -1 && process.argv[idx + 1]) {
    const p = parseInt(process.argv[idx + 1])
    if (!isNaN(p)) return p
  }
  return DEFAULT_API_PORT
}

function getWebPort() {
  const idx = process.argv.indexOf('--web-port')
  if (idx !== -1 && process.argv[idx + 1]) {
    const p = parseInt(process.argv[idx + 1])
    if (!isNaN(p)) return p
  }
  return DEFAULT_WEB_PORT
}

function rotateLog() {
  try {
    const st = statSync(LOG_FILE)
    if (st.size > 3 * 1024 * 1024) {
      const content = readFileSync(LOG_FILE, 'utf-8')
      const kept = content.split('\n').slice(-2000)
      writeFileSync(LOG_FILE, kept.join('\n'))
      console.log(pc.cyan(`  ↻ Rotated ${LOG_FILE.replace(homedir(), '~')}`))
    }
  } catch {}
}

function stopPid(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 'SIGTERM')
    const start = Date.now()
    while (isRunning(pid) && Date.now() - start < 5000) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
    }
    if (isRunning(pid)) process.kill(pid, 'SIGKILL')
    return true
  } catch {
    return true
  }
}

function spawnServer({ name, entry, logFile, env, runtime }) {
  if (!existsSync(entry)) {
    console.log(pc.red(`  ✗ ${name} not found: ${entry}`))
    console.log(`    Run "hermium build" first (or check your installation)`)
    process.exit(1)
  }

  rotateLog()

  const logFd = openSync(logFile, 'a')
  const child = spawn(runtime, [entry], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, ...env, NODE_ENV: 'production' },
    cwd: dirname(entry),
  })

  child.on('error', (err) => {
    console.error(pc.red(`  ✗ Failed to start ${name}: ${err.message}`))
    removePid()
    process.exit(1)
  })

  child.unref()
  return child.pid
}

// ─── Path resolution ───────────────────────────────────────────────────────

function findApiEntry() {
  const bundled = resolve(pkgDir, 'dist', 'api.mjs')
  if (existsSync(bundled)) return bundled

  const monorepo = resolve(pkgDir, '..', '..', 'packages', 'api', 'dist', 'index.js')
  if (existsSync(monorepo)) return monorepo

  return null
}

function findWebServer() {
  const bundled = resolve(pkgDir, 'dist', 'server', 'index.mjs')
  if (existsSync(bundled)) return bundled

  const monorepo = resolve(pkgDir, '..', '..', 'packages', 'web', '.output', 'server', 'index.mjs')
  if (existsSync(monorepo)) return monorepo

  return null
}

// ─── Commands ──────────────────────────────────────────────────────────────

function cmdStatus() {
  const { apiPid, webPid } = getPids()
  if (apiPid || webPid) {
    console.log(pc.green(`  ✓ Hermium is running`))
    console.log(`    URL  : http://localhost:${getApiPort()}`)
    if (apiPid) console.log(`    API  : PID ${apiPid}`)
    if (webPid) console.log(`    Web  : PID ${webPid}`)
    console.log(`    Logs : ${LOG_FILE.replace(homedir(), '~')}`)
  } else {
    console.log(pc.yellow(`  ⊘ Hermium is not running`))
  }
}

async function cmdStart() {
  const { apiPid: existingApi, webPid: existingWeb } = getPids()
  if (existingApi || existingWeb) {
    console.log(pc.yellow(`  ✗ Hermium is already running`))
    if (existingApi) console.log(`    API PID: ${existingApi}`)
    if (existingWeb) console.log(`    Web PID: ${existingWeb}`)
    console.log(`    Use "hermium stop" first`)
    process.exit(1)
  }

  const apiPort = getApiPort()
  const webPort = getWebPort()
  const runtime = getRuntimeCmd()
  const apiEntry = findApiEntry()
  const webServer = findWebServer()

  if (!apiEntry) {
    console.log(pc.red(`  ✗ API server not found. Run "hermium build" first.`))
    process.exit(1)
  }

  if (!webServer) {
    console.log(pc.red(`  ✗ Web server not found. Run "hermium build" first.`))
    process.exit(1)
  }

  mkdirSync(HERMIUM_HOME, { recursive: true })

  console.log(pc.cyan(`  ⏳ Starting Hermium...`))

  const apiPid = spawnServer({
    name: 'API server',
    entry: apiEntry,
    logFile: LOG_FILE,
    runtime,
    env: {
      PORT: String(apiPort),
      APP_VERSION: CURRENT_VERSION,
      AUTH_DISABLED: '1',
      HERMIUM_WEB_URL: `http://127.0.0.1:${webPort}`,
    },
  })

  const webPid = spawnServer({
    name: 'Web server',
    entry: webServer,
    logFile: LOG_FILE,
    runtime,
    env: {
      PORT: String(webPort),
      NITRO_PORT: String(webPort),
      HERMIUM_API_URL: `http://127.0.0.1:${apiPort}`,
      APP_VERSION: CURRENT_VERSION,
    },
  })

  writePid(apiPid, webPid)

  console.log(`  API  PID: ${apiPid}  (port ${apiPort})`)
  console.log(`  Web  PID: ${webPid}  (port ${webPort})`)

  // Poll health
  const maxWait = 30000
  const interval = 500
  let waited = 0
  const apiUrl = `http://127.0.0.1:${apiPort}`

  function poll() {
    waited += interval

    if (!isRunning(apiPid) || !isRunning(webPid)) {
      console.log(pc.red(`  ✗ Server crashed`))
      console.log(`    Check log: ${LOG_FILE}`)
      removePid()
      process.exit(1)
    }

    fetch(`${apiUrl}/api/hermes/sessions`).catch(() => null).then((res) => {
      if (!res || !res.ok) {
        if (waited < maxWait) {
          setTimeout(poll, interval)
        } else {
          console.log(pc.green(`  ✓ Hermium started`))
          console.log(`    URL : ${apiUrl}`)
          console.log(`    Logs: ${LOG_FILE.replace(homedir(), '~')}`)
          checkLatestVersion()
        }
      } else {
        console.log(pc.green(`  ✓ Hermium started`))
        console.log(`    URL : ${apiUrl}`)
        console.log(`    Logs: ${LOG_FILE.replace(homedir(), '~')}`)
        checkLatestVersion()
        // Open browser to the unified URL (API serves web UI too)
        const openCmd =
          process.platform === 'win32' ? `start ${apiUrl}` :
          process.platform === 'darwin' ? `open ${apiUrl}` :
          `xdg-open ${apiUrl}`
        try { execSync(openCmd, { stdio: 'ignore' }) } catch {}
      }
    })
  }

  setTimeout(poll, interval)
}

function cmdStop() {
  const { apiPid, webPid } = getPids()
  if (!apiPid && !webPid) {
    console.log(pc.yellow(`  ⊘ Hermium is not running`))
    return
  }

  if (webPid) {
    stopPid(webPid)
    console.log(pc.green(`  ✓ Web server stopped (PID: ${webPid})`))
  }
  if (apiPid) {
    stopPid(apiPid)
    console.log(pc.green(`  ✓ API server stopped (PID: ${apiPid})`))
  }
  removePid()
}

function cmdRestart() {
  cmdStop()
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
  cmdStart()
}

function cmdBuild() {
  console.log(pc.cyan(`  🔨 Building Hermium...`))
  const runtime = getRuntimeCmd()

  const rootDir = resolve(pkgDir, '..', '..')
  const isMonorepo = existsSync(resolve(rootDir, 'packages', 'api')) && existsSync(resolve(rootDir, 'packages', 'web'))

  if (!isMonorepo) {
    console.log(pc.yellow(`  ⚠ Not in a monorepo. Build must be done from the Hermium source repository.`))
    process.exit(1)
  }

  try {
    console.log(`  → Building shared...`)
    execSync(`${runtime} run build:shared`, { cwd: rootDir, stdio: 'inherit' })
    console.log(`  → Building API...`)
    execSync(`${runtime} run build:api`, { cwd: rootDir, stdio: 'inherit' })
    console.log(`  → Building Web...`)
    execSync(`${runtime} run build:web`, { cwd: rootDir, stdio: 'inherit' })
    console.log(`  → Building CLI...`)
    execSync(`${runtime} run build:cli`, { cwd: rootDir, stdio: 'inherit' })
    console.log(pc.green(`  ✓ Build complete`))
  } catch (err) {
    console.log(pc.red(`  ✗ Build failed`))
    process.exit(1)
  }
}

function cmdDev() {
  console.log(pc.cyan(`  🔥 Starting Hermium in dev mode...`))
  const runtime = getRuntimeCmd()

  const rootDir = resolve(pkgDir, '..', '..')
  const isMonorepo = existsSync(resolve(rootDir, 'packages', 'api')) && existsSync(resolve(rootDir, 'packages', 'web'))

  if (!isMonorepo) {
    console.log(pc.yellow(`  ⚠ Not in a monorepo. Dev mode must be run from the Hermium source repository.`))
    process.exit(1)
  }

  try {
    execSync(`${runtime} run dev`, { cwd: rootDir, stdio: 'inherit' })
  } catch {
    process.exit(1)
  }
}

function cmdHelp() {
  console.log(`
${pc.bold('Hermium CLI')} — Self-hosted AI chat for Hermes Agent

${pc.bold('Usage:')}
  hermium <command> [options]

${pc.bold('Commands:')}
  start      Start Hermium servers (daemon)
  stop       Stop Hermium servers
  restart    Restart Hermium servers
  status     Show running status
  build      Build from source (requires repo)
  dev        Run in dev mode (requires repo)
  help       Show this help message
  version    Show version

${pc.bold('Options:')}
  --port <n>      API server port (default: 47474)
  --web-port <n>  Web server port (default: 42424)

${pc.bold('Examples:')}
  hermium start
  hermium start --port 47474 --web-port 42424
  hermium stop
  hermium status
`)
}

function cmdVersion() {
  console.log(CURRENT_VERSION)
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

const command = process.argv[2] || 'help'

switch (command) {
  case 'start':
    cmdStart()
    break
  case 'stop':
    cmdStop()
    break
  case 'restart':
    cmdRestart()
    break
  case 'status':
    cmdStatus()
    break
  case 'build':
    cmdBuild()
    break
  case 'dev':
    cmdDev()
    break
  case 'version':
  case '--version':
  case '-v':
    cmdVersion()
    break
  case 'help':
  case '--help':
  case '-h':
    cmdHelp()
    break
  default:
    console.log(pc.red(`  ✗ Unknown command: ${command}`))
    console.log(`    Run "hermium help" for usage`)
    process.exit(1)
}
