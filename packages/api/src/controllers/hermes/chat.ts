import type { Context } from 'hono'
import { logger } from '../../lib/logger.js'
import type { ChatRunPayload } from '@hermium/shared'
import {
  createGatewayRun,
  streamGatewayRun,
  getSessionForRun,
  setRunSession,
} from '../../services/chat-gateway.js'
import { getDb } from '../../db/index.js'

// ── In-memory event buffer for SSE replay ──────────────────────────────
interface BufferedEvent {
  id: string
  event: string
  data: Record<string, unknown>
  ts: number
}

const runEventBuffers = new Map<string, BufferedEvent[]>()
const MAX_BUFFER_AGE_MS = 5 * 60 * 1000 // 5 minutes
const MAX_BUFFER_SIZE = 500

function bufferEvent(runId: string, event: string, data: Record<string, unknown>): string {
  let buffer = runEventBuffers.get(runId)
  if (!buffer) {
    buffer = []
    runEventBuffers.set(runId, buffer)
  }
  const id = `${runId}-${buffer.length}`
  buffer.push({ id, event, data, ts: Date.now() })
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - MAX_BUFFER_SIZE)
  }
  // Clean old buffers periodically
  const now = Date.now()
  for (const [rid, buf] of runEventBuffers.entries()) {
    if (rid === runId) continue
    if (buf.length > 0 && now - buf[buf.length - 1].ts > MAX_BUFFER_AGE_MS) {
      runEventBuffers.delete(rid)
    }
  }
  return id
}

function getBufferedEvents(runId: string, lastEventId?: string): BufferedEvent[] {
  const buffer = runEventBuffers.get(runId)
  if (!buffer) return []
  if (!lastEventId) return [...buffer]
  const idx = buffer.findIndex((e) => e.id === lastEventId)
  if (idx === -1) return [...buffer]
  return buffer.slice(idx + 1)
}

export async function runChat(c: Context) {
  const body = await c.req.json<ChatRunPayload>()
  const profile = c.req.header('x-hermes-profile') || 'default'

  try {
    const { runId } = await createGatewayRun(body, profile)
    return c.json({ run_id: runId, status: 'queued' })
  } catch (err: any) {
    const msg = err.message || String(err)
    if (msg.includes('ConnectionRefused') || msg.includes('ECONNREFUSED') || msg.includes('Unable to connect')) {
      return c.json({ error: { message: 'Hermes Gateway is not running. Start it with: hermes gateway run' } }, 503)
    }
    return c.json({ error: { message: msg } }, 502)
  }
}

export async function abortChat(c: Context) {
  const body = await c.req.json<{ run_id: string }>()
  // TODO: abort via gateway
  return c.json({ ok: false })
}

export function streamChat(c: Context) {
  const runId = c.req.query('run_id')
  if (!runId) {
    return c.json({ error: { message: 'Missing run_id' } }, 400)
  }

  const profile = c.req.header('x-hermes-profile') || 'default'
  const lastEventId = c.req.header('last-event-id') || c.req.query('last_event_id') || undefined

  const stream = new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder()
      let closed = false

      const sendRaw = (event: string, data: Record<string, unknown>, id?: string) => {
        if (closed) return
        let payload = ''
        if (id) payload += `id: ${id}\n`
        payload += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ctrl.enqueue(encoder.encode(payload))
      }

      const send = (event: string, data: Record<string, unknown>) => {
        const id = bufferEvent(runId, event, data)
        sendRaw(event, data, id)

        // Record usage on run completion
        if (event === 'run.completed') {
          try {
            const usage = (data.usage as Record<string, number>) || {}
            const sessionInfo = getSessionForRun(runId)
            if (sessionInfo && usage.input_tokens !== undefined) {
              const db = getDb()
              db.run(
                `INSERT INTO usage (session_id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, model, profile, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  sessionInfo.sessionId,
                  usage.input_tokens || 0,
                  usage.output_tokens || 0,
                  usage.cache_read_tokens || 0,
                  usage.cache_write_tokens || 0,
                  usage.reasoning_tokens || 0,
                  sessionInfo.model || null,
                  sessionInfo.profile || 'default',
                  Date.now(),
                ],
              )
              logger.info('[usage] recorded', {
                run_id: runId,
                session_id: sessionInfo.sessionId,
                input: usage.input_tokens,
                output: usage.output_tokens,
              })
            }
          } catch (err: any) {
            logger.error('[usage] failed to record', { run_id: runId, error: err.message })
          }
        }
      }

      // Replay buffered events for reconnecting clients
      const buffered = getBufferedEvents(runId, lastEventId)
      if (buffered.length > 0) {
        logger.info('[gateway-chat] Replaying buffered events', { run_id: runId, count: buffered.length })
        for (const be of buffered) {
          sendRaw(be.event, be.data, be.id)
        }
      }

      // Heartbeat to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        if (closed) return
        sendRaw('ping', { event: 'ping', run_id: runId })
      }, 15000)

      try {
        for await (const chunk of streamGatewayRun(runId, profile)) {
          if (closed) break
          send(chunk.event, JSON.parse(chunk.data) as Record<string, unknown>)
        }
      } catch (err: any) {
        const msg = err.message || String(err)
        logger.error('[gateway-chat] Stream error', { run_id: runId, error: msg })
        if (msg.includes('ConnectionRefused') || msg.includes('ECONNREFUSED') || msg.includes('Unable to connect')) {
          send('run.error', {
            event: 'run.error',
            run_id: runId,
            error: 'Hermes Gateway is not running. Start it with: hermes gateway run',
          })
        } else {
          send('run.error', {
            event: 'run.error',
            run_id: runId,
            error: msg,
          })
        }
      } finally {
        closed = true
        clearInterval(heartbeat)
        ctrl.close()
      }
    },
  })

  return c.body(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
