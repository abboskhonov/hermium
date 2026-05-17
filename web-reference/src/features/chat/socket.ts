import { io, type Socket } from "socket.io-client"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:47474"

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; name: string; path: string; media_type: string }
  | { type: "file"; name: string; path: string; media_type?: string }

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string | ContentBlock[]
}

export interface StartRunRequest {
  input: string | ContentBlock[]
  instructions?: string
  session_id?: string
  model?: string
  queue_id?: string
}

export interface RunEvent {
  event: string
  run_id?: string
  delta?: string
  text?: string
  tool?: string
  name?: string
  preview?: string
  timestamp?: number
  error?: string
  output?: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
    cache_read_tokens?: number
    cache_write_tokens?: number
    reasoning_tokens?: number
  }
  session_id?: string
  queue_length?: number
  queue_remaining?: number
}

// ============================
// Socket.IO chat run connection
// ============================

let chatRunSocket: Socket | null = null
let globalListenersRegistered = false

interface SessionHandlers {
  onMessageDelta: (event: RunEvent) => void
  onReasoningDelta: (event: RunEvent) => void
  onThinkingDelta: (event: RunEvent) => void
  onToolStarted: (event: RunEvent) => void
  onToolCompleted: (event: RunEvent) => void
  onRunStarted: (event: RunEvent) => void
  onRunCompleted: (event: RunEvent) => void
  onRunFailed: (event: RunEvent) => void
  onRunQueued: (event: RunEvent) => void
  onAbortStarted: (event: RunEvent) => void
  onAbortCompleted: (event: RunEvent) => void
}

const sessionEventHandlers = new Map<string, SessionHandlers>()

function globalMessageDeltaHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onMessageDelta) handlers.onMessageDelta(event)
}

function globalReasoningDeltaHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onReasoningDelta) handlers.onReasoningDelta(event)
}

function globalThinkingDeltaHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onThinkingDelta) handlers.onThinkingDelta(event)
}

function globalToolStartedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onToolStarted) handlers.onToolStarted(event)
}

function globalToolCompletedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onToolCompleted) handlers.onToolCompleted(event)
}

function globalRunStartedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onRunStarted) handlers.onRunStarted(event)
}

function globalRunCompletedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onRunCompleted) handlers.onRunCompleted(event)
  const remaining = (event as any).queue_remaining
  if (remaining > 0) return
  sessionEventHandlers.delete(sid)
}

function globalRunFailedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onRunFailed) handlers.onRunFailed(event)
  const remaining = (event as any).queue_remaining
  if (remaining > 0) return
  sessionEventHandlers.delete(sid)
}

function globalRunQueuedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onRunQueued) handlers.onRunQueued(event)
}

function globalAbortStartedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onAbortStarted) handlers.onAbortStarted(event)
}

function globalAbortCompletedHandler(event: RunEvent): void {
  const sid = event.session_id
  if (!sid) return
  const handlers = sessionEventHandlers.get(sid)
  if (handlers?.onAbortCompleted) handlers.onAbortCompleted(event)
  const queueLen = (event as any).queue_length
  if (queueLen > 0) return
  sessionEventHandlers.delete(sid)
}

export function connectChatRun(): Socket {
  if (chatRunSocket?.connected) return chatRunSocket

  if (chatRunSocket) {
    chatRunSocket.removeAllListeners()
    chatRunSocket.disconnect()
    globalListenersRegistered = false
  }

  chatRunSocket = io(`${BASE_URL}/chat-run`, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  if (!globalListenersRegistered) {
    chatRunSocket.on("message.delta", globalMessageDeltaHandler)
    chatRunSocket.on("reasoning.delta", globalReasoningDeltaHandler)
    chatRunSocket.on("thinking.delta", globalThinkingDeltaHandler)
    chatRunSocket.on("tool.started", globalToolStartedHandler)
    chatRunSocket.on("tool.completed", globalToolCompletedHandler)
    chatRunSocket.on("run.started", globalRunStartedHandler)
    chatRunSocket.on("run.failed", globalRunFailedHandler)
    chatRunSocket.on("run.completed", globalRunCompletedHandler)
    chatRunSocket.on("run.queued", globalRunQueuedHandler)
    chatRunSocket.on("abort.started", globalAbortStartedHandler)
    chatRunSocket.on("abort.completed", globalAbortCompletedHandler)
    globalListenersRegistered = true
  }

  return chatRunSocket
}

export function disconnectChatRun(): void {
  if (chatRunSocket) {
    chatRunSocket.disconnect()
    chatRunSocket = null
    globalListenersRegistered = false
    sessionEventHandlers.clear()
  }
}

export function registerSessionHandlers(
  sessionId: string,
  handlers: SessionHandlers,
): () => void {
  sessionEventHandlers.set(sessionId, handlers)
  return () => {
    sessionEventHandlers.delete(sessionId)
  }
}

export function unregisterSessionHandlers(sessionId: string): void {
  sessionEventHandlers.delete(sessionId)
}

export function resumeSession(
  sessionId: string,
  onResumed: (data: {
    session_id: string
    messages: any[]
    isWorking: boolean
    isAborting?: boolean
    queueLength?: number
  }) => void,
): Socket {
  const socket = connectChatRun()
  socket.once("resumed", onResumed)
  socket.emit("resume", { session_id: sessionId })
  return socket
}

export function startRunViaSocket(
  body: StartRunRequest,
  handlers: SessionHandlers,
  onDone: () => void,
  onError: (err: Error) => void,
): { abort: () => void } {
  const sid = body.session_id
  if (!sid) {
    throw new Error("session_id is required for startRunViaSocket")
  }

  let closed = false
  const socket = connectChatRun()

  if (sessionEventHandlers.has(sid)) {
    socket.emit("run", body)
    return {
      abort: () => {
        if (!closed) {
          socket.emit("abort", { session_id: sid })
        }
      },
    }
  }

  const wrappedHandlers: SessionHandlers = {
    onMessageDelta: (evt) => {
      if (closed) return
      handlers.onMessageDelta(evt)
    },
    onReasoningDelta: (evt) => {
      if (closed) return
      handlers.onReasoningDelta(evt)
    },
    onThinkingDelta: (evt) => {
      if (closed) return
      handlers.onThinkingDelta(evt)
    },
    onToolStarted: (evt) => {
      if (closed) return
      handlers.onToolStarted(evt)
    },
    onToolCompleted: (evt) => {
      if (closed) return
      handlers.onToolCompleted(evt)
    },
    onRunStarted: (evt) => {
      if (closed) return
      handlers.onRunStarted(evt)
    },
    onRunCompleted: (evt) => {
      if (closed) return
      handlers.onRunCompleted(evt)
      const remaining = (evt as any).queue_remaining
      if (remaining > 0) return
      closed = true
      onDone()
    },
    onRunFailed: (evt) => {
      if (closed) return
      handlers.onRunFailed(evt)
      const remaining = (evt as any).queue_remaining
      if (remaining > 0) return
      closed = true
      onError(new Error(evt.error || "Run failed"))
    },
    onRunQueued: (evt) => {
      if (closed) return
      handlers.onRunQueued(evt)
    },
    onAbortStarted: (evt) => {
      if (closed) return
      handlers.onAbortStarted(evt)
    },
    onAbortCompleted: (evt) => {
      if (closed) return
      handlers.onAbortCompleted(evt)
      const queueLen = (evt as any).queue_length
      if (queueLen > 0) return
      closed = true
      onDone()
    },
  }

  sessionEventHandlers.set(sid, wrappedHandlers)
  socket.emit("run", body)

  return {
    abort: () => {
      if (!closed) {
        socket.emit("abort", { session_id: sid })
      }
    },
  }
}
