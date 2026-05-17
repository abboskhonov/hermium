import { useRef, useCallback } from "react"
import { startRunViaSocket, type RunEvent } from "../socket"
import { useChatStore } from "../store"
import type { ChatMessage, Attachment, SessionItem } from "../types"

let msgCounter = 0
function nextMsgId() {
  return `msg-${++msgCounter}-${Math.random().toString(36).slice(2, 6)}`
}

export interface UseChatStreamResult {
  sendMessage: (
    text: string,
    sessionId: string,
    model: string,
    options?: { contextLength?: number | null; attachments?: Attachment[] },
  ) => Promise<void>
  abortChat: () => void
}

export function useChatStream(): UseChatStreamResult {
  const abortRef = useRef<(() => void) | null>(null)

  const setStreaming = useCallback((sessionId: string, loading: boolean) => {
    useChatStore.setState((s) => ({
      streamingSessions: loading
        ? new Set([...s.streamingSessions, sessionId])
        : new Set([...s.streamingSessions].filter((id) => id !== sessionId)),
    }))
  }, [])

  const abortChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback(
    async (
      text: string,
      sessionId: string,
      model: string,
      options?: { contextLength?: number | null; attachments?: Attachment[] },
    ) => {
      if (useChatStore.getState().streamingSessions.has(sessionId)) return

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      }

      // Ensure session exists in the store, then push user message
      useChatStore.setState((s) => {
        const existing = s.sessions.find((sx) => sx.id === sessionId)
        if (!existing) {
          const now = Date.now()
          const seeded: SessionItem = {
            id: sessionId,
            title: text.slice(0, 64),
            model: model || "",
            messages: [userMsg],
            createdAt: now,
            updatedAt: now,
          }
          return { sessions: [seeded, ...s.sessions] }
        }
        return {
          sessions: s.sessions.map((sx) =>
            sx.id === sessionId
              ? {
                  ...sx,
                  messages: [...sx.messages, userMsg],
                  model: model || sx.model || "",
                  title:
                    !sx.title || sx.title === "New Conversation" || sx.title === "Untitled"
                      ? text.slice(0, 64)
                      : sx.title,
                }
              : sx,
          ),
        }
      })

      // Build conversation history for the backend (excludes current user turn)
      const history = useChatStore
        .getState()
        .sessions.find((sx) => sx.id === sessionId)
        ?.messages.slice(0, -1)
        .filter((m) => !m.isStreaming && m.content)
        .map((m) => ({ role: m.role, content: m.content })) || []

      // Push assistant placeholder
      const asstId = nextMsgId()
      const placeholder: ChatMessage = {
        id: asstId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      }

      useChatStore.setState((s) => ({
        sessions: s.sessions.map((sx) =>
          sx.id === sessionId
            ? { ...sx, messages: [...sx.messages, placeholder] }
            : sx,
        ),
      }))

      setStreaming(sessionId, true)

      let lastEventMs = Date.now()
      const hangTimeout = setInterval(() => {
        if (Date.now() - lastEventMs > 300_000) {
          console.warn("[socket] hang timeout — aborting", sessionId)
          abortChat()
        }
      }, 30_000)

      const handleDone = () => {
        clearInterval(hangTimeout)
        abortRef.current = null
        setStreaming(sessionId, false)
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((sx) => {
            if (sx.id !== sessionId) return sx
            const hasStreaming = sx.messages.some((m) => m.role === "assistant" && m.isStreaming)
            if (!hasStreaming) return sx
            return {
              ...sx,
              messages: sx.messages.map((m) =>
                m.role === "assistant" && m.isStreaming
                  ? { ...m, isStreaming: false, reasoningEndedAt: m.reasoning ? Date.now() : undefined }
                  : m,
              ),
            }
          }),
        }))
      }

      const handleError = (err: Error) => {
        clearInterval(hangTimeout)
        abortRef.current = null
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((sx) => {
            if (sx.id !== sessionId) return sx
            const msgs = sx.messages.map((m) =>
              m.role === "assistant" && m.isStreaming
                ? { ...m, isStreaming: false, content: m.content || `**Error:** ${err.message}` }
                : m,
            )
            return { ...sx, messages: msgs }
          }),
        }))
        setStreaming(sessionId, false)
      }

      const { abort } = startRunViaSocket(
        {
          input: text,
          session_id: sessionId,
          model: model || undefined,
        },
        {
          onMessageDelta: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const delta = ev.delta || ""
            if (!delta) return
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.slice()
                const last = msgs[msgs.length - 1]
                if (last && last.role === "assistant" && last.isStreaming) {
                  msgs[msgs.length - 1] = { ...last, content: last.content + delta }
                }
                return { ...sx, messages: msgs }
              }),
            }))
          },

          onReasoningDelta: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const text = ev.delta || ""
            if (!text) return
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.slice()
                const last = msgs[msgs.length - 1]
                if (last && last.role === "assistant" && last.isStreaming) {
                  const prevReasoning = last.reasoning || ""
                  msgs[msgs.length - 1] = {
                    ...last,
                    reasoning: prevReasoning + text,
                    reasoningStartedAt: last.reasoningStartedAt || Date.now(),
                  }
                }
                return { ...sx, messages: msgs }
              }),
            }))
          },

          onThinkingDelta: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const text = ev.delta || ""
            if (!text) return
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.slice()
                const last = msgs[msgs.length - 1]
                if (last && last.role === "assistant" && last.isStreaming) {
                  const prevReasoning = last.reasoning || ""
                  msgs[msgs.length - 1] = {
                    ...last,
                    reasoning: prevReasoning + text,
                    reasoningStartedAt: last.reasoningStartedAt || Date.now(),
                  }
                }
                return { ...sx, messages: msgs }
              }),
            }))
          },

          onToolStarted: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const name = ev.tool || ev.name || "tool"
            const preview = ev.preview || ""
            const callId = ev.run_id || undefined
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.slice()
                const last = msgs[msgs.length - 1]
                if (last && last.role === "assistant" && last.isStreaming) {
                  const calls = [
                    ...(last.toolCalls || []),
                    { name, preview, callId, status: "running" as const },
                  ]
                  msgs[msgs.length - 1] = { ...last, toolCalls: calls }
                }
                return { ...sx, messages: msgs }
              }),
            }))
          },

          onToolCompleted: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const toolName = ev.tool || ev.name
            const output = ev.output
            const callId = ev.run_id || undefined
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.slice()
                const last = msgs[msgs.length - 1]
                if (!last?.toolCalls) return sx
                const calls = last.toolCalls.map((tc) => {
                  if (callId && tc.callId === callId) {
                    return { ...tc, status: "done" as const, output: output || tc.output }
                  }
                  if (!callId && tc.name === toolName && tc.status === "running") {
                    return { ...tc, status: "done" as const, output: output || tc.output }
                  }
                  return tc
                })
                msgs[msgs.length - 1] = { ...last, toolCalls: calls }
                return { ...sx, messages: msgs }
              }),
            }))
          },

          onRunStarted: (_ev: RunEvent) => {
            lastEventMs = Date.now()
          },

          onRunCompleted: (_ev: RunEvent) => {
            lastEventMs = Date.now()
          },

          onRunFailed: (ev: RunEvent) => {
            lastEventMs = Date.now()
            const err = ev.error || "Run failed"
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) => {
                if (sx.id !== sessionId) return sx
                const msgs = sx.messages.map((m) =>
                  m.role === "assistant" && m.isStreaming
                    ? { ...m, isStreaming: false, content: m.content || `**Error:** ${err}` }
                    : m,
                )
                return { ...sx, messages: msgs }
              }),
            }))
            setStreaming(sessionId, false)
          },

          onRunQueued: (ev: RunEvent) => {
            lastEventMs = Date.now()
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) =>
                sx.id === sessionId ? { ...sx, queueLength: ev.queue_length ?? 0 } : sx,
              ),
            }))
          },

          onAbortStarted: (_ev: RunEvent) => {
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) =>
                sx.id === sessionId ? { ...sx, isAborting: true } : sx,
              ),
            }))
          },

          onAbortCompleted: (_ev: RunEvent) => {
            useChatStore.setState((s) => ({
              sessions: s.sessions.map((sx) =>
                sx.id === sessionId ? { ...sx, isAborting: false, queueLength: 0 } : sx,
              ),
            }))
          },
        },
        handleDone,
        handleError,
      )

      abortRef.current = abort
    },
    [setStreaming, abortChat],
  )

  return { sendMessage, abortChat }
}
