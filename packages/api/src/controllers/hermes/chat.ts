import type { Context } from 'hono'
import { logger } from '../../lib/logger.js'
import type { ChatRunPayload } from '@hermium/shared'
import {
  createGatewayRun,
  streamGatewayRun,
  getSessionForRun,
  setRunSession,
} from '../../services/chat-gateway.js'

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

  const stream = new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder()

      const send = (event: string, data: Record<string, unknown>) => {
        ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        for await (const chunk of streamGatewayRun(runId, profile)) {
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
        ctrl.close()
      }
    },
  })

  return c.body(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
