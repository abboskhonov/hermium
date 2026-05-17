import { getGatewayManagerInstance } from './gateway.js'
import { logger } from '../lib/logger.js'
import { config } from '../config.js'
import { getDb } from '../db/index.js'
import type { ChatRunPayload } from '@hermium/shared'

// In-memory run → session mapping (ephemeral, same as hermes-web-ui)
const runSessionMap = new Map<string, { sessionId: string; model?: string; profile?: string }>()

export function setRunSession(runId: string, sessionId: string, model?: string, profile?: string): void {
  runSessionMap.set(runId, { sessionId, model, profile })
  setTimeout(() => runSessionMap.delete(runId), 30 * 60 * 1000)
}

export function getSessionForRun(runId: string): { sessionId: string; model?: string; profile?: string } | undefined {
  return runSessionMap.get(runId)
}

function resolveProfile(c?: { req: { header: (k: string) => string | undefined; query: (k: string) => string | null } }): string {
  return c?.req.header('x-hermes-profile') || c?.req.query('profile') || 'default'
}

function getUpstream(profile?: string): string {
  const mgr = getGatewayManagerInstance()
  return mgr.getUpstream(profile)
}

function getApiKey(profile?: string): string | undefined {
  const mgr = getGatewayManagerInstance()
  return mgr.getApiKey(profile)
}

function buildProxyHeaders(upstream: string, profile?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream, application/json',
  }
  const apiKey = getApiKey(profile)
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  headers['host'] = new URL(upstream).host
  return headers
}

function loadSessionMessages(sessionId: string): Array<{ role: string; content: string }> {
  try {
    const db = getDb()
    const rows = db.query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp'
    ).all(sessionId) as Array<{ role: string; content: string }>

    return rows
      .filter((r) => r.role === 'user' || r.role === 'assistant')
      .map((r) => ({
        role: r.role,
        content: r.content || '',
      }))
      .filter((r) => r.content.trim().length > 0)
  } catch (err) {
    logger.warn('[gateway-chat] failed to load session messages', { session_id: sessionId, error: (err as Error).message })
    return []
  }
}

// ─── Create a run on the gateway ──────────────────────────────

export async function createGatewayRun(
  payload: ChatRunPayload,
  profile?: string,
): Promise<{ runId: string; responseBody: unknown }> {
  const upstream = getUpstream(profile)
  const url = `${upstream}/v1/runs`
  const headers = buildProxyHeaders(upstream, profile)

  const bodyJson: Record<string, unknown> = {
    input: payload.input,
    model: payload.model,
    instructions: payload.instructions,
    session_id: payload.session_id,
  }

  // Load conversation history from our DB so the gateway has full context
  if (payload.session_id) {
    const history = loadSessionMessages(payload.session_id)
    if (history.length > 0) {
      bodyJson.conversation_history = history
    }
  }

  const body = JSON.stringify(bodyJson)

  logger.info('[gateway-chat] POST /v1/runs', { session_id: payload.session_id, model: payload.model, profile })

  const res = await fetch(url, { method: 'POST', headers, body })
  const responseBody = await res.json().catch(() => ({})) as Record<string, unknown>

  if (!res.ok) {
    throw new Error(`Gateway error ${res.status}: ${JSON.stringify(responseBody)}`)
  }

  const runId = responseBody.run_id as string | undefined
  if (!runId) {
    throw new Error('Gateway returned no run_id')
  }

  if (payload.session_id) {
    setRunSession(runId, payload.session_id, payload.model, profile)
  }

  logger.info('[gateway-chat] run created', { run_id: runId })
  return { runId, responseBody }
}

// ─── SSE event transformer ──────────────────────────────────
// Gateway emits: response.created, response.output_text.delta,
//                response.output_text.done, run.completed
// We emit:      run.started, message.delta, run.completed

function transformGatewayEvent(
  gatewayEvent: string,
  gatewayData: Record<string, unknown>,
  runId: string,
): { event: string; data: Record<string, unknown> } | null {
  switch (gatewayEvent) {
    case 'response.created': {
      const response = (gatewayData.response as Record<string, unknown>) || gatewayData
      return {
        event: 'run.started',
        data: {
          event: 'run.started',
          run_id: runId,
          response_id: (response.id as string) || runId,
          status: (response.status as string) || 'in_progress',
        },
      }
    }

    case 'response.output_text.delta': {
      const delta = (gatewayData.delta as string) || (gatewayData.text as string) || ''
      if (!delta) return null
      return {
        event: 'message.delta',
        data: {
          event: 'message.delta',
          run_id: runId,
          response_id: runId,
          delta,
        },
      }
    }

    case 'response.output_text.done':
      return null

    case 'response.reasoning_text.delta':
    case 'reasoning.delta': {
      const delta = (gatewayData.delta as string) || (gatewayData.text as string) || ''
      if (!delta) return null
      return {
        event: 'reasoning.delta',
        data: {
          event: 'reasoning.delta',
          run_id: runId,
          response_id: runId,
          delta,
        },
      }
    }

    case 'response.reasoning_item.done':
    case 'reasoning.available':
      return {
        event: 'reasoning.available',
        data: { event: 'reasoning.available', run_id: runId, ...gatewayData },
      }

    case 'response.function_call_arguments.delta':
    case 'tool.started':
      return {
        event: 'tool.started',
        data: { event: 'tool.started', run_id: runId, ...gatewayData },
      }

    case 'response.function_call_arguments.done':
    case 'tool.completed':
      return {
        event: 'tool.completed',
        data: { event: 'tool.completed', run_id: runId, ...gatewayData },
      }

    case 'run.completed': {
      const usage = (gatewayData.usage as Record<string, number>) || {}
      return {
        event: 'run.completed',
        data: {
          event: 'run.completed',
          run_id: runId,
          response_id: runId,
          status: 'completed',
          output: gatewayData.output,
          usage: {
            input_tokens: usage.input_tokens || 0,
            output_tokens: usage.output_tokens || 0,
            cache_read_tokens: usage.cache_read_tokens,
            cache_write_tokens: usage.cache_write_tokens,
            reasoning_tokens: usage.reasoning_tokens,
          },
        },
      }
    }

    case 'error':
    case 'run.failed':
      return {
        event: 'run.error',
        data: {
          event: 'run.error',
          run_id: runId,
          error: (gatewayData.error as Record<string, string>)?.message || String(gatewayData.error || 'Unknown error'),
        },
      }

    default:
      // Unknown event — pass through raw for debugging
      return {
        event: gatewayEvent,
        data: { event: gatewayEvent, run_id: runId, ...gatewayData },
      }
  }
}

// ─── Stream gateway SSE ─────────────────────────────────────

export async function* streamGatewayRun(
  runId: string,
  profile?: string,
): AsyncGenerator<{ event: string; data: string }> {
  const upstream = getUpstream(profile)
  const url = `${upstream}/v1/runs/${runId}/events`
  const headers = buildProxyHeaders(upstream, profile)

  logger.info('[gateway-chat] GET /v1/runs/{id}/events', { run_id: runId, url })

  const res = await fetch(url, { method: 'GET', headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gateway stream error ${res.status}: ${body}`)
  }
  if (!res.body) {
    throw new Error('Gateway stream has no body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        const lines = block.split('\n')
        let eventName = 'message'
        let dataJson = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7)
          } else if (line.startsWith('data: ')) {
            dataJson += line.slice(6)
          }
        }
        if (!dataJson) continue

        try {
          const parsed = JSON.parse(dataJson) as Record<string, unknown>
          const transformed = transformGatewayEvent(eventName, parsed, runId)
          if (transformed) {
            yield {
              event: transformed.event,
              data: JSON.stringify(transformed.data),
            }
          }
        } catch {
          // Not JSON, skip
        }
      }
    }

    if (buffer.trim()) {
      // Process remaining buffer
      const lines = buffer.split('\n')
      let eventName = 'message'
      let dataJson = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7)
        else if (line.startsWith('data: ')) dataJson += line.slice(6)
      }
      if (dataJson) {
        try {
          const parsed = JSON.parse(dataJson) as Record<string, unknown>
          const transformed = transformGatewayEvent(eventName, parsed, runId)
          if (transformed) {
            yield {
              event: transformed.event,
              data: JSON.stringify(transformed.data),
            }
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
