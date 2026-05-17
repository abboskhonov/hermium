#!/usr/bin/env node
import { spawn, execSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, openSync, existsSync, statSync } from 'fs'
import { homedir } from 'os'
import pc from 'picocolors'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'))
const CURRENT_VERSION = pkg.version

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiEntry = resolve(pkgDir, 'dist', 'server', 'index.mjs')
const webEntry = resolve(pkgDir, 'dist', 'web-server', 'index.mjs')
const webServerDir = resolve(pkgDir, 'dist', 'web-server')
const WEB_UI_HOME = resolve(homedir(), '.hermium')
const API_PID_FILE = join(WEB_UI_HOME, 'api.pid')
const WEB_PID_FILE = join(WEB_UI_HOME, 'web.pid')
const API_LOG_FILE = join(WEB_UI_HOME, 'api.log')
const WEB_LOG_FILE = join(WEB_UI_HOME, 'web.log')
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
  const cacheFile = join(WEB_UI_HOME, '.version-check')
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

function readPid(file) {
  try {
    const pid = parseInt(readFileSync(file, 'utf-8').trim())
    return Number.isFinite(pid) ? pid : null
  } catch {
    return null
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err?.code === 'EPERM'
  }
}

function writePid(file, pid) {
  mkdirSync(WEB_UI_HOME, { recursive: true })
  writeFileSync(file, String(pid))
}

function removePid(file) {
  try { unlinkSync(file) } catch {}
}

function getPid(file) {
  const pid = readPid(file)
  if (pid && isRunning(pid)) return pid
  removePid(file)
  return null
}

function getApiPid() { return getPid(API_PID_FILE) }
function getWebPid() { return getPid(WEB_PID_FILE) }

function getPort(argName, defaultPort) {
  const idx = process.argv.indexOf(argName)
  if (idx !== -1 && process.argv[idx + 1]) {
    const p = parseInt(process.argv[idx + 1])
    if (!isNaN(p)) return p
  }
  return defaultPort
}

function getRunningPort(pid) {
  if (!pid) return null
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -aon -p tcp | findstr LISTENING | findstr " ${pid}$"`, { encoding: 'utf-8' }).trim()
      const line = out.split('\n').find(Boolean)
      const address = line?.trim().split(/\s+/)[1]
      const port = address?.split(':').pop()
      return port ? parseInt(port, 10) : null
    }
    const out = execSync(`lsof -Pan -p ${pid} -iTCP -sTCP:LISTEN`, { encoding: 'utf-8' }).trim()
    const lines = out.split('\n').slice(1)
    for (const line of lines) {
      const match = line.match(/:(\d+)\s+\(LISTEN\)$/)
      if (match) return parseInt(match[1], 10)
    }
  } catch {}
  return null
}

function rotateLog(file) {
  try {
    const st = statSync(file)
    if (st.size > 3 * 1024 * 1024) {
      const content = readFileSync(file, 'utf-8')
      const kept = content.split('\n').slice(-2000)
      writeFileSync(file, kept.join('\n'))
      console.log(pc.cyan(`  ↻ Rotated ${file.replace(homedir(), '~')}`))
    }
  } catch {}
}

function spawnServer({ name, entry, logFile, pidFile, port, env, runtime, cwd }) {
  if (!existsSync(entry)) {
    console.log(pc.red(`  ✗ ${name} not found: ${entry}`))
    console.log(`    Run "hermium build" first (or check your installation)`)
    process.exit(1)
  }

  rotateLog(logFile)

  const logFd = openSync(logFile, 'a')
  const child = spawn(runtime, [entry], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, ...env, NODE_ENV: 'production' },
    cwd: cwd || dirname(entry),
  })

  child.on('error', (err) => {
    console.error(pc.red(`  ✗ Failed to start ${name}: ${err.message}`))
    removePid(pidFile)
    process.exit(1)
  })

  child.unref()
  writePid(pidFile, child.pid)
  return child.pid
}

function stopPid(pid, name) {
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

// ─── Commands ──────────────────────────────────────────────────────────────

function cmdStatus() {
  const apiPid = getApiPid()
  const webPid = getWebPid()
  const apiPort = apiPid ? getRunningPort(apiPid) : null
  const webPort = webPid ? getRunningPort(webPid) : null

  if (apiPid || webPid) {
    console.log(pc.green(`  ✓ Hermium is running`))
    if (apiPid) console.log(`    API  : PID ${apiPid}, port ${apiPort || 'unknown'}`)
    if (webPid) console.log(`    Web  : PID ${webPid}, port ${webPort || 'unknown'}`)
    console.log(`    Logs : ${WEB_UI_HOME}`)
  } else {
    console.log(pc.yellow(`  ⊘ Hermium is not running`))
  }
}

async function cmdStart() {
  const existingApi = getApiPid()
  const existingWeb = getWebPid()
  if (existingApi || existingWeb) {
    console.log(pc.yellow(`  ✗ Hermium is already running`))
    if (existingApi) console.log(`    API PID: ${existingApi}`)
    if (existingWeb) console.log(`    Web PID: ${existingWeb}`)
    console.log(`    Use "hermium stop" first`)
    process.exit(1)
  }

  const apiPort = getPort('--port', DEFAULT_API_PORT)
  const webPort = getPort('--web-port', DEFAULT_WEB_PORT)
  const runtime = getRuntimeCmd()

  mkdirSync(WEB_UI_HOME, { recursive: true })

  console.log(pc.cyan(`  ⏳ Starting Hermium (API:${apiPort}, Web:${webPort})...`))

  // 1. Start API server
  const apiPid = spawnServer({
    name: 'API server',
    entry: apiEntry,
    logFile: API_LOG_FILE,
    pidFile: API_PID_FILE,
    port: apiPort,
    runtime,
    env: {
      HERMIUM_PORT: String(apiPort),
      HERMIUM_WEB_PORT: String(webPort),
      HERMIUM_VERSION: CURRENT_VERSION,
      WEB_STATIC_DIR: resolve(pkgDir, 'dist', 'public'),
    },
  })

  // 2. Start web SSR server
  const webPid = spawnServer({
    name: 'Web server',
    entry: webEntry,
    logFile: WEB_LOG_FILE,
    pidFile: WEB_PID_FILE,
    port: webPort,
    runtime,
    cwd: webServerDir,
    env: { PORT: String(webPort) },
  })

  console.log(`  API  PID: ${apiPid}`)
  console.log(`  Web  PID: ${webPid}`)

  // Poll web server health
  const maxWait = 30000
  const interval = 500
  let waited = 0
  const webUrl = `http://localhost:${webPort}`

  function poll() {
    waited += interval

    if (!isRunning(apiPid)) {
      console.log(pc.red(`  ✗ API server crashed`))
      console.log(`    Check log: ${API_LOG_FILE}`)
      stopPid(webPid, 'web')
      removePid(API_PID_FILE)
      removePid(WEB_PID_FILE)
      process.exit(1)
    }
    if (!isRunning(webPid)) {
      console.log(pc.red(`  ✗ Web server crashed`))
      console.log(`    Check log: ${WEB_LOG_FILE}`)
      stopPid(apiPid, 'api')
      removePid(API_PID_FILE)
      removePid(WEB_PID_FILE)
      process.exit(1)
    }

    fetch(`${webUrl}/api/health`).catch(() => null).then((res) => {
      // Web server doesn't have /api/health, this will 404 but we just want to check it's listening
      if (waited < maxWait) {
        setTimeout(poll, interval)
      } else {
        console.log(pc.green(`  ✓ Hermium started`))
        console.log(`    ${webUrl}`)
        console.log(`    Logs: ${WEB_UI_HOME}`)
        checkLatestVersion() // non-blocking
        const openCmd =
          process.platform === 'win32' ? `start ${webUrl}` :
          process.platform === 'darwin' ? `open ${webUrl}` :
          `xdg-open ${webUrl}`
        try { execSync(openCmd, { stdio: 'ignore' }) } catch {}
      }
    })
  }

  setTimeout(poll, interval)
}

function cmdStop() {
  const apiPid = getApiPid()
  const webPid = getWebPid()

  if (!apiPid && !webPid) {
    console.log(pc.yellow(`  ⊘ Hermium is not running`))
    return
  }

  if (webPid) {
    stopPid(webPid, 'web')
    removePid(WEB_PID_FILE)
    console.log(pc.green(`  ✓ Web server stopped (PID: ${webPid})`))
  }
  if (apiPid) {
    stopPid(apiPid, 'api')
    removePid(API_PID_FILE)
    console.log(pc.green(`  ✓ API server stopped (PID: ${apiPid})`))
  }
}

function cmdRestart() {
  cmdStop()
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
  cmdStart()
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
  help       Show this help message

${pc.bold('Options:')}
  --port <n>      API port (default: 47474)
  --web-port <n>  Web port (default: 42424)

${pc.bold('Examples:')}
  hermium start
  hermium start --port 47474 --web-port 42424
  hermium stop
  hermium status
`)
}

function cmdVersion() {
  const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'))
  console.log(pkg.version)
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
