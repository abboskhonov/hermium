import { create } from "zustand"
import type { Session, Message } from "@hermium/shared"
import {
  fetchSessions,
  fetchSession,
  createSession,
  deleteSession as apiDeleteSession,
  saveMessage,
} from "@/api/hermes/sessions"
import { runChat, streamChatRun } from "@/api/hermes/chat"

const ACTIVE_SESSION_KEY = "hermium_active_session_id"
const PINNED_SESSIONS_KEY = "hermium_pinned_sessions"

function loadPinnedSessions(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function savePinnedSessions(ids: string[]) {
  localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(ids))
}

interface ChatState {
  sessions: Session[]
  activeSessionId: string | null
  messages: Message[]
  isStreaming: boolean
  isLoadingSessions: boolean
  sessionsLoaded: boolean
  pinnedSessionIds: string[]
  // Global stream handle — survives component unmount
  activeStream: { runId: string; abort: () => void } | null

  setSessions: (sessions: Session[]) => void
  setActiveSessionId: (id: string | null) => void
  setMessages: (messages: Message[]) => void
  appendMessage: (message: Message) => void
  updateMessage: (id: string, patch: Partial<Message>) => void
  setStreaming: (v: boolean) => void

  loadSessions: () => Promise<void>
  switchSession: (id: string) => Promise<void>
  createNewSession: () => Promise<string>
  deleteSession: (id: string) => Promise<void>
  saveAndAppendMessage: (sessionId: string, message: Message) => Promise<void>
  updateSessionTitle: (sessionId: string) => void
  updateSession: (id: string, patch: Partial<Session>) => void
  togglePin: (sessionId: string) => void

  // Stream lifecycle
  sendMessage: (text: string, model?: string) => Promise<void>
  abortStream: () => void
  syncFromDb: (sessionId: string) => Promise<void>
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Debounced save map: sessionId + messageId → timeout
const debouncedSaves = new Map<string, ReturnType<typeof setTimeout>>()

function debouncedSaveMessage(sessionId: string, message: Message, delay = 500) {
  const key = `${sessionId}:${message.id}`
  const existing = debouncedSaves.get(key)
  if (existing) clearTimeout(existing)
  const timeout = setTimeout(() => {
    debouncedSaves.delete(key)
    saveMessage(sessionId, message).catch((err) => {
      console.error("[store] Debounced save failed:", err)
    })
  }, delay)
  debouncedSaves.set(key, timeout)
}

// Merge DB messages with store messages, preferring more complete content
function mergeMessages(dbMsgs: Message[], storeMsgs: Message[]): Message[] {
  const map = new Map<string, Message>()
  // Start with DB messages
  for (const m of dbMsgs) {
    map.set(m.id, m)
  }
  // Overlay store messages, keeping the one with longer content
  for (const m of storeMsgs) {
    const existing = map.get(m.id)
    if (!existing) {
      map.set(m.id, m)
      continue
    }
    const storeLen = (m.content?.length || 0) + (m.reasoning?.length || 0)
    const dbLen = (existing.content?.length || 0) + (existing.reasoning?.length || 0)
    if (storeLen > dbLen) {
      map.set(m.id, m)
    }
  }
  // Sort by timestamp
  return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  isLoadingSessions: false,
  sessionsLoaded: false,
  pinnedSessionIds: loadPinnedSessions(),
  activeStream: null,

  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  setStreaming: (v) => set({ isStreaming: v }),

  async loadSessions() {
    set({ isLoadingSessions: true })
    try {
      const list = await fetchSessions()
      const localOnly = get().sessions.filter(
        (local) =>
          !list.some((api) => api.id === local.id) &&
          local.id === get().activeSessionId,
      )
      const merged = [...localOnly, ...list]
      set({ sessions: merged, sessionsLoaded: true })

      const currentActive = get().activeSessionId
      if (!currentActive) {
        const savedId = localStorage.getItem(ACTIVE_SESSION_KEY)
        if (savedId && merged.some((s) => s.id === savedId)) {
          await get().switchSession(savedId)
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err)
    } finally {
      set({ isLoadingSessions: false })
    }
  },

  async switchSession(id) {
    const current = get()
    console.log(`[store] switchSession: ${id}. currentActive=${current.activeSessionId}, msgs=${current.messages.length}, streaming=${current.isStreaming}`)

    if (current.activeSessionId === id && current.messages.length > 0) {
      // Same session with messages — don't wipe, but sync from DB to catch any
      // updates that happened while we were away (e.g. stream continued in bg)
      await get().syncFromDb(id)
      localStorage.setItem(ACTIVE_SESSION_KEY, id)
      set((s) => {
        const session = s.sessions.find((sess) => sess.id === id)
        if (session) {
          return {
            sessions: s.sessions.map((sess) =>
              sess.id === id ? { ...sess, lastActiveAt: Date.now() } : sess,
            ),
          }
        }
        return s
      })
      return
    }

    // Switching to a different session — abort any running stream
    current.activeStream?.abort()
    set({ activeSessionId: id, messages: [], isStreaming: false, activeStream: null })
    localStorage.setItem(ACTIVE_SESSION_KEY, id)

    try {
      const data = await fetchSession(id)
      if (data?.messages) {
        set({ messages: data.messages })
      }
    } catch (err) {
      console.error("Failed to load session messages:", err)
    }

    set((s) => {
      const session = s.sessions.find((sess) => sess.id === id)
      if (session) {
        return {
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, lastActiveAt: Date.now() } : sess,
          ),
        }
      }
      return s
    })
  },

  async syncFromDb(sessionId) {
    try {
      const data = await fetchSession(sessionId)
      if (!data?.messages) return
      const storeMsgs = get().messages
      const merged = mergeMessages(data.messages, storeMsgs)
      // Only update if DB has more/different data
      const mergedContent = merged.map((m) => m.content + (m.reasoning || "")).join("")
      const storeContent = storeMsgs.map((m) => m.content + (m.reasoning || "")).join("")
      if (mergedContent !== storeContent || merged.length !== storeMsgs.length) {
        console.log(`[store] syncFromDb: updating ${storeMsgs.length} → ${merged.length} messages`)
        set({ messages: merged })
      }
    } catch (err) {
      console.error("[store] syncFromDb failed:", err)
    }
  },

  async createNewSession() {
    const id = uid()
    try {
      await createSession({ id, title: "", source: "api_server" })
    } catch (err) {
      console.error("Failed to create session on server:", err)
    }
    set({ activeSessionId: id, messages: [], isStreaming: false, activeStream: null })
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
    return id
  },

  async deleteSession(id) {
    try {
      await apiDeleteSession(id)
    } catch (err) {
      console.error("Failed to delete session:", err)
    }
    set((s) => {
      const nextSessions = s.sessions.filter((sess) => sess.id !== id)
      const nextPinned = s.pinnedSessionIds.filter((pid) => pid !== id)
      if (nextPinned.length !== s.pinnedSessionIds.length) {
        savePinnedSessions(nextPinned)
      }
      const nextActiveId =
        s.activeSessionId === id
          ? nextSessions[0]?.id ?? null
          : s.activeSessionId
      if (s.activeSessionId === id) {
        s.activeStream?.abort()
      }
      if (nextActiveId !== s.activeSessionId) {
        setTimeout(() => {
          if (nextActiveId) get().switchSession(nextActiveId)
          else set({ activeSessionId: null, messages: [] })
        }, 0)
      }
      return { sessions: nextSessions, pinnedSessionIds: nextPinned, activeStream: s.activeSessionId === id ? null : s.activeStream }
    })
  },

  async saveAndAppendMessage(sessionId, message) {
    set((s) => {
      const nextMessages = [...s.messages, message]
      let nextSessions = s.sessions.map((sess) =>
        sess.id === sessionId
          ? { ...sess, messageCount: (sess.messageCount ?? 0) + 1, updatedAt: Date.now() }
          : sess
      )
      if (!nextSessions.some((sess) => sess.id === sessionId)) {
        nextSessions.unshift({
          id: sessionId,
          title: "",
          source: "api_server",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 1,
        })
      }
      return { messages: nextMessages, sessions: nextSessions }
    })
    try {
      await saveMessage(sessionId, message)
    } catch (err) {
      console.error("Failed to save message:", err)
    }
  },

  updateSessionTitle(sessionId) {
    set((s) => {
      const session = s.sessions.find((sess) => sess.id === sessionId)
      const hasRealTitle = !!session?.title && session.title !== "New Session"
      if (!session || hasRealTitle) return s
      const firstUser = s.messages.find((m) => m.role === "user")
      if (!firstUser) return s
      const raw = firstUser.content.trim()
      let title = raw
      if (raw.length > 40) {
        const sentenceMatch = raw.slice(0, 60).match(/^[^.!?]+[.!?]/)
        if (sentenceMatch) {
          title = sentenceMatch[0].trim()
        } else {
          const slice = raw.slice(0, 40)
          const lastSpace = slice.lastIndexOf(" ")
          title = lastSpace > 20 ? slice.slice(0, lastSpace) : slice
        }
      }
      title = title.replace(/[,:;\-]+$/, "").trim()
      if (title.length < raw.length) title += "…"
      title = title.charAt(0).toUpperCase() + title.slice(1)
      return {
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId
            ? { ...sess, title, updatedAt: Date.now() }
            : sess,
        ),
      }
    })
  },

  updateSession(id, patch) {
    set((s) => ({
      sessions: s.sessions.map((sx) =>
        sx.id === id ? { ...sx, ...patch } : sx,
      ),
    }))
  },

  togglePin(sessionId) {
    set((s) => {
      const isPinned = s.pinnedSessionIds.includes(sessionId)
      const next = isPinned
        ? s.pinnedSessionIds.filter((id) => id !== sessionId)
        : [...s.pinnedSessionIds, sessionId]
      savePinnedSessions(next)
      return { pinnedSessionIds: next }
    })
  },

  // ── Stream lifecycle ──────────────────────────────────────────────────

  async sendMessage(text, _model) {
    const state = get()
    console.log(`[store] sendMessage. isStreaming=${state.isStreaming}, sessionId=${state.activeSessionId}`)
    if (state.isStreaming) return

    let sessionId = state.activeSessionId
    if (!sessionId) {
      sessionId = await get().createNewSession()
    }
    if (!sessionId) return

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    }

    await get().saveAndAppendMessage(sessionId, userMsg)
    get().updateSessionTitle(sessionId)

    set({ isStreaming: true })

    try {
      const { run_id } = await runChat({
        input: text,
        session_id: sessionId,
      })
      console.log(`[store] runChat returned run_id=${run_id}`)

      const assistantId = uid() + "_ai"
      get().appendMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      })

      const abort = streamChatRun(run_id, {
        onEvent: (event) => {
          // Ignore heartbeats
          if (event.event === "ping") return

          // message.delta
          if (event.event === "message.delta" && event.delta) {
            const s = get()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg) {
              const nextContent = msg.content + event.delta
              const updatedMsg: Message = { ...msg, content: nextContent }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
              })
              // Debounced save to DB so partial content survives disconnects
              debouncedSaveMessage(sessionId, updatedMsg, 500)
            }
          }

          // reasoning.delta / thinking.delta
          if ((event.event === "reasoning.delta" || event.event === "thinking.delta") && event.delta) {
            const s = get()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg) {
              const nextReasoning = (msg.reasoning || "") + event.delta
              const updatedMsg: Message = {
                ...msg,
                reasoning: nextReasoning,
                reasoningStartedAt: msg.reasoningStartedAt || Date.now(),
              }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
              })
              debouncedSaveMessage(sessionId, updatedMsg, 500)
            }
          }

          // reasoning.available
          if (event.event === "reasoning.available") {
            const s = get()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg && msg.reasoning) {
              const updatedMsg: Message = { ...msg, reasoningEndedAt: Date.now() }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
              })
              debouncedSaveMessage(sessionId, updatedMsg, 500)
            }
          }

          // tool.started
          if (event.event === "tool.started") {
            const toolName = (event as any).tool || (event as any).name || "tool"
            const preview = (event as any).preview || ""
            const callId = (event as any).tool_call_id || undefined
            const s = get()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg) {
              const calls = [
                ...(msg.toolCalls || []),
                { name: toolName, preview, callId, status: "running" as const },
              ]
              const updatedMsg: Message = { ...msg, toolCalls: calls }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
              })
              debouncedSaveMessage(sessionId, updatedMsg, 500)
            }
          }

          // tool.completed
          if (event.event === "tool.completed") {
            const toolName = (event as any).tool || (event as any).name
            const output = (event as any).output
            const callId = (event as any).tool_call_id || undefined
            const s = get()
            const msg = s.messages.find((m) => m.id === assistantId)
            if (msg && msg.toolCalls) {
              const calls = msg.toolCalls.map((tc) => {
                if (callId && tc.callId === callId) {
                  return { ...tc, status: "done" as const, output: output || tc.output }
                }
                if (!callId && tc.name === toolName && tc.status === "running") {
                  return { ...tc, status: "done" as const, output: output || tc.output }
                }
                return tc
              })
              const updatedMsg: Message = { ...msg, toolCalls: calls }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
              })
              debouncedSaveMessage(sessionId, updatedMsg, 500)
            }
          }

          // run.completed
          if (event.event === "run.completed") {
            const s = get()
            const finalMsg = s.messages.find((m) => m.id === assistantId)
            if (finalMsg) {
              abort()
              const updatedMsg: Message = {
                ...finalMsg,
                isStreaming: false,
                reasoningEndedAt: finalMsg.reasoning ? Date.now() : undefined,
              }
              set({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? updatedMsg : m
                ),
                isStreaming: false,
                activeStream: null,
              })
              // Immediate save (flush debounce)
              const key = `${sessionId}:${assistantId}`
              const existing = debouncedSaves.get(key)
              if (existing) clearTimeout(existing)
              debouncedSaves.delete(key)
              saveMessage(sessionId, updatedMsg).catch(console.error)
            }
          }

          // run.error
          if (event.event === "run.error") {
            abort()
            const s = get()
            set({
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      role: "system",
                      content: event.error || "Stream error",
                      systemType: "error",
                      isStreaming: false,
                    }
                  : m
              ),
              isStreaming: false,
              activeStream: null,
            })
          }
        },
        onError: (err) => {
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: uid() + "_err",
                role: "system",
                content: err.message,
                timestamp: Date.now(),
                systemType: "error",
              },
            ],
            isStreaming: false,
            activeStream: null,
          }))
        },
        onClose: () => {
          console.log(`[store] onClose fired. activeStream=${get().activeStream?.runId || 'null'}`)
          set({ activeStream: null })
          // Wait a moment then check if we need to mark streaming as done
          setTimeout(() => {
            const s = get()
            if (s.isStreaming && !s.activeStream) {
              console.log(`[store] onClose timeout → isStreaming=false`)
              set({ isStreaming: false })
            }
          }, 2000)
        },
      })

      set({ activeStream: { runId: run_id, abort } })
    } catch (err) {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: uid() + "_err",
            role: "system",
            content: err instanceof Error ? err.message : "Unknown error",
            timestamp: Date.now(),
            systemType: "error",
          },
        ],
        isStreaming: false,
        activeStream: null,
      }))
    }
  },

  abortStream() {
    const { activeStream } = get()
    console.log(`[store] abortStream. activeStream=${activeStream?.runId || 'null'}`)
    if (activeStream) {
      activeStream.abort()
      set({ isStreaming: false, activeStream: null })
    }
  },
}))
