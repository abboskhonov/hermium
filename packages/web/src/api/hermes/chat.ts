import { request } from "../client.js"
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
}

/**
 * Open an SSE stream for a chat run.
 * Calls `onEvent` for each parsed SSE event and `onError` on failure.
 */
export function streamChatRun(
  runId: string,
  handlers: {
    onEvent: (event: StreamEvent) => void
    onError: (err: Error) => void
    onClose?: () => void
  }
): () => void {
  const url = `${getBaseUrl()}/api/hermes/chat/stream?run_id=${encodeURIComponent(runId)}`
  const abortController = new AbortController()

  fetch(url, {
    signal: abortController.signal,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Stream error ${res.status}: ${text || res.statusText}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE blocks (delimited by double newline)
        let idx: number
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const parsed = parseSSEBlock(block)
          if (parsed) handlers.onEvent(parsed as unknown as StreamEvent)
        }
      }

      handlers.onClose?.()
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        handlers.onError(err instanceof Error ? err : new Error(String(err)))
      }
    })

  return () => abortController.abort()
}

function parseSSEBlock(block: string): Record<string, unknown> | null {
  const lines = block.split("\n")
  let data = ""
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      data += line.slice(6)
    }
  }
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function getBaseUrl(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("hermium_server_url") || "http://localhost:4000"
    : ""
}

function getApiKey(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("hermium_api_key") || ""
    : ""
}
