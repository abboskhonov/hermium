const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:47474'

export interface StreamEvent {
  type: string
  data: Record<string, any>
}

export interface PostChatStreamOptions {
  input: string
  conversation?: string
  model?: string
  signal?: AbortSignal
  attachments?: Record<string, unknown>[]
  /** Full conversation history — required so the backend has context on continued turns. */
  messages?: { role: string; content: string }[]
}

export async function* postChatStream(
  options: PostChatStreamOptions,
): AsyncGenerator<StreamEvent, void, unknown> {
  const { input, conversation, model, signal } = options

  const body: Record<string, any> = { input }
  if (conversation) body.conversation = conversation
  if (model) body.model = model
  if (options.messages && options.messages.length > 0) {
    body.messages = options.messages
  }
  if (options.attachments && options.attachments.length > 0) {
    body.attachments = options.attachments
  }

  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Stream request failed')
    throw new Error(text)
  }

  if (!res.body) {
    throw new Error('No response body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        let eventType = ''
        let dataStr = ''
        for (const line of frame.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          else if (line.startsWith('data: ')) {
            // SSE spec: multiple data: lines concatenate with newlines
            dataStr += (dataStr ? '\n' : '') + line.slice(6)
          }
        }

        if (dataStr) {
          let parsed: Record<string, any> = {}
          try {
            parsed = JSON.parse(dataStr)
          } catch {
            parsed = { raw: dataStr }
          }
          yield { type: eventType || 'unknown', data: parsed }
        }

        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}
