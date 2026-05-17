import { request, getBaseUrl, getApiKey } from "../client.js"
import type { ChatRunPayload } from "@hermium/shared"

export async function runChat(payload: ChatRunPayload) {
  return request<{ run_id: string; status: string }>("/api/hermes/chat/run", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function abortChat(runId: string) {
  return request<{ ok: boolean }>("/api/hermes/chat/abort", {
    method: "POST",
    body: JSON.stringify({ run_id: runId }),
  })
}

export interface StreamEvent {
  event: string
  run_id: string
  response_id?: string
  delta?: string
  status?: string
  output?: Array<{ type: string; text: string }>
  usage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  error?: string
  [key: string]: unknown
}

// ── Module-level active EventSources (persist across route changes) ──

const activeSources = new Map<string, EventSource>()

/**
 * Open an SSE stream for a chat run using EventSource.
 * EventSource is managed by the browser and auto-reconnects if the
 * connection drops (e.g. during route navigation). The browser keeps the
 * TCP connection alive independently of the DOM.
 *
 * We track `lastEventId` so reconnections resume from the correct point
 * using the backend's event replay buffer.
 *
 * Returns an abort function that closes the EventSource.
 */
export function streamChatRun(
  runId: string,
  handlers: {
    onEvent: (event: StreamEvent) => void
    onError: (err: Error) => void
    onClose?: () => void
  }
): () => void {
  // Close any existing EventSource for this runId (shouldn't happen, but be safe)
  const existing = activeSources.get(runId)
  if (existing) {
    existing.close()
    activeSources.delete(runId)
  }

  const token = getApiKey()
  let lastEventId: string | undefined = undefined

  function buildUrl(): string {
    let url = `${getBaseUrl()}/api/hermes/chat/stream?run_id=${encodeURIComponent(runId)}`
    if (token) {
      url += `&token=${encodeURIComponent(token)}`
    }
    if (lastEventId) {
      url += `&last_event_id=${encodeURIComponent(lastEventId)}`
    }
    return url
  }

  let es: EventSource | null = null
  let closed = false
  let reconnectAttempt = 0
  const maxReconnectDelay = 30000 // 30s max

  function connect() {
    if (closed || typeof window === "undefined") return

    const url = buildUrl()
    console.log(`[EventSource] Connecting to ${url}`)
    es = new EventSource(url)
    activeSources.set(runId, es)

    const handleEvent = (e: MessageEvent) => {
      if (closed) return
      // Track last event ID for resumable reconnections
      if ((e as any).lastEventId) {
        lastEventId = (e as any).lastEventId
      }
      try {
        const parsed = JSON.parse(e.data) as StreamEvent
        if (parsed && typeof parsed === "object") {
          console.log(`[EventSource] Event: ${parsed.event || e.type}`)
          handlers.onEvent(parsed)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Listen for all event types the backend may emit
    const eventTypes = [
      "run.started",
      "run.queued",
      "message.delta",
      "reasoning.delta",
      "thinking.delta",
      "reasoning.available",
      "tool.started",
      "tool.completed",
      "run.completed",
      "run.error",
      "error",
      "abort.started",
      "abort.completed",
      "ping",
    ]

    for (const type of eventTypes) {
      es.addEventListener(type, handleEvent as EventListener)
    }

    // Catch-all for any other event types
    es.onmessage = handleEvent

    es.onerror = () => {
      if (closed) return
      // EventSource auto-reconnects by default. When it gives up,
      // readyState becomes CLOSED. We then manually reconnect with
      // exponential backoff and lastEventId for replay.
      if (es && es.readyState === EventSource.CLOSED) {
        console.log(`[EventSource] Closed for run ${runId}, manual reconnect scheduled`)
        activeSources.delete(runId)
        // Exponential backoff
        reconnectAttempt++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt - 1), maxReconnectDelay)
        setTimeout(connect, delay)
      } else {
        console.log(`[EventSource] Transient error for run ${runId}, browser auto-reconnecting...`)
      }
    }

    es.onopen = () => {
      console.log(`[EventSource] Connected for run ${runId}`)
      reconnectAttempt = 0 // Reset backoff on successful connection
    }
  }

  connect()

  return () => {
    console.log(`[EventSource] Aborting / closing for run ${runId}`)
    closed = true
    if (es) {
      es.close()
    }
    activeSources.delete(runId)
    handlers.onClose?.()
  }
}
