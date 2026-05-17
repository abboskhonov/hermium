import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { get as apiGet } from "@/lib/api"
import type { SessionItem, ChatMessage } from "./types"

// ── Utilities ──────────────────────────────────────────────────────────────

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const ACTIVE_SESSION_KEY = "hermium_active_session"
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

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatStore {
  sessions: SessionItem[]
  activeSessionId: string | null
  streamingSessions: Set<string>
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  sessionsLoaded: boolean
  pinnedSessionIds: string[]

  // Actions
  loadSessions: () => Promise<void>
  switchSession: (id: string) => void
  loadSessionMessages: (id: string) => Promise<void>
  deleteSession: (id: string) => void
  newChat: (model?: string) => Promise<string>
  addOrUpdateSession: (session: SessionItem) => void
  togglePin: (sessionId: string) => void

  // Helpers
  getSession: (id: string) => SessionItem | undefined
  activeSession: () => SessionItem | null
  messages: () => ChatMessage[]
  updateSession: (id: string, update: Partial<SessionItem>) => void
  isSessionStreaming: (id: string) => boolean
}

const initialState = {
  sessions: [] as SessionItem[],
  activeSessionId: null as string | null,
  streamingSessions: new Set<string>(),
  isLoadingSessions: false,
  isLoadingMessages: false,
  sessionsLoaded: false,
  pinnedSessionIds: loadPinnedSessions(),
}

// Guard against stale async results when rapidly switching sessions
let _loadingSessionId: string | null = null

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      getSession: (id) => get().sessions.find((s) => s.id === id),

      activeSession: () => {
        const st = get()
        return st.sessions.find((s) => s.id === st.activeSessionId) || null
      },

      messages: () => {
        const st = get()
        const session = st.sessions.find((s) => s.id === st.activeSessionId)
        return session?.messages || []
      },

      updateSession: (id, update) => {
        set((s) => ({
          sessions: s.sessions.map((sx) =>
            sx.id === id ? { ...sx, ...update } : sx,
          ),
        }))
      },

      loadSessions: async () => {
        try {
          set({ isLoadingSessions: true })
          const data = await apiGet<{ sessions: any[] }>("/api/sessions")
          const apiSessions = (data.sessions || []).map((s: any) => {
            const startedAt = s.started_at
              ? s.started_at < 1_000_000_000_000
                ? s.started_at * 1000
                : s.started_at
              : Date.now()
            return {
              id: String(s.id),
              title: s.title || "Untitled",
              model: s.model || "",
              source: s.source || "webui",
              messages: [],
              createdAt: startedAt,
              updatedAt: s.ended_at
                ? s.ended_at < 1_000_000_000_000
                  ? s.ended_at * 1000
                  : s.ended_at
                : startedAt,
              messageCount: s.message_count ?? 0,
              inputTokens: s.input_tokens ?? 0,
              outputTokens: s.output_tokens ?? 0,
            } satisfies SessionItem
          })

          const deduped = new Map<string, SessionItem>()
          for (const s of apiSessions) deduped.set(s.id, s)
          const apiSessionsDeduped = [...deduped.values()]

          const preservedLocals = get().sessions.filter(
            (local) =>
              !apiSessionsDeduped.some((api) => api.id === local.id) &&
              (local.messages.length > 0 || local.id === get().activeSessionId),
          )

          const merged = [...preservedLocals, ...apiSessionsDeduped]
          set({ sessions: merged, sessionsLoaded: true, streamingSessions: new Set() })

          const currentActive = get().activeSessionId
          if (!currentActive) {
            const savedId = localStorage.getItem(ACTIVE_SESSION_KEY)
            if (savedId && apiSessionsDeduped.some((s) => s.id === savedId)) {
              get().switchSession(savedId)
            }
          }
        } catch (err) {
          console.error("Failed to load sessions:", err)
        } finally {
          set({ isLoadingSessions: false })
        }
      },

      switchSession: (id) => {
        const current = get().activeSessionId
        if (current === id) return
        set({ activeSessionId: id })
        localStorage.setItem(ACTIVE_SESSION_KEY, id)
      },

      loadSessionMessages: async (id) => {
        _loadingSessionId = id
        try {
          set({ isLoadingMessages: true })
          const data = await apiGet<any>(`/api/sessions/${id}`)
          if (_loadingSessionId !== id) return

          const rawMessages = data.messages || []
          const msgs: ChatMessage[] = rawMessages.map((m: any, idx: number) => ({
            id: String(m.id || `${id}-${idx}`),
            role: m.role as ChatMessage["role"],
            content: typeof m.content === "string" ? m.content : "",
            timestamp: m.timestamp
              ? Number(m.timestamp) * (m.timestamp < 1_000_000_000_000 ? 1000 : 1)
              : Date.now(),
            toolCalls: m.tool_calls
              ? m.tool_calls.map((tc: any) => ({
                  name: tc.function?.name || tc.name || "tool",
                  preview: "",
                  status: "done" as const,
                  callId: tc.id || undefined,
                  output: undefined,
                }))
              : undefined,
            reasoning: m.reasoning || m.reasoning_content || undefined,
          }))

          const title =
            data.title || msgs.find((m) => m.role === "user")?.content?.slice(0, 64) || "Untitled"

          set((s) => {
            const existing = s.sessions.find((sx) => sx.id === id)
            if (existing) {
              // If the API returns no messages but we already have local ones
              // (e.g. a brand-new session seeded from the dashboard), preserve
              // the local messages so the UI doesn't blank out mid-stream.
              const mergedMessages =
                msgs.length === 0 && existing.messages.length > 0
                  ? existing.messages
                  : msgs
              return {
                sessions: s.sessions.map((sx) =>
                  sx.id === id
                    ? {
                        ...sx,
                        messages: mergedMessages,
                        title,
                        model: sx.model || data.model || "",
                        messageCount: data.message_count ?? sx.messageCount ?? msgs.length,
                        inputTokens: data.input_tokens ?? sx.inputTokens ?? 0,
                        outputTokens: data.output_tokens ?? sx.outputTokens ?? 0,
                        reasoningTokens: data.reasoning_tokens ?? sx.reasoningTokens ?? 0,
                      }
                    : sx,
                ),
              }
            }
            return {
              sessions: [
                ...s.sessions,
                {
                  id,
                  title,
                  model: data.model || "",
                  source: data.source || "webui",
                  messages: msgs,
                  createdAt: data.started_at
                    ? data.started_at < 1_000_000_000_000
                      ? data.started_at * 1000
                      : data.started_at
                    : Date.now(),
                  updatedAt: data.ended_at
                    ? data.ended_at < 1_000_000_000_000
                      ? data.ended_at * 1000
                      : data.ended_at
                    : Date.now(),
                  messageCount: data.message_count ?? msgs.length,
                  inputTokens: data.input_tokens ?? 0,
                  outputTokens: data.output_tokens ?? 0,
                  reasoningTokens: data.reasoning_tokens ?? 0,
                } satisfies SessionItem,
              ],
            }
          })
        } finally {
          if (_loadingSessionId === id) _loadingSessionId = null
          set({ isLoadingMessages: false })
        }
      },

      deleteSession: (id) => {
        set((s) => ({
          sessions: s.sessions.filter((sx) => sx.id !== id),
        }))
      },

      newChat: async (model?: string) => {
        const sessionId = uid()
        const now = Date.now()
        const session: SessionItem = {
          id: sessionId,
          title: "New Conversation",
          model: model || "",
          messages: [],
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: session.id,
        }))
        localStorage.setItem(ACTIVE_SESSION_KEY, session.id)
        return session.id
      },

      addOrUpdateSession: (session) => {
        set((s) => {
          const idx = s.sessions.findIndex((sx) => sx.id === session.id)
          if (idx >= 0) {
            const updated = [...s.sessions]
            updated[idx] = { ...updated[idx], ...session }
            return { sessions: updated }
          }
          return { sessions: [session, ...s.sessions] }
        })
      },

      togglePin: (sessionId) => {
        set((s) => {
          const isPinned = s.pinnedSessionIds.includes(sessionId)
          const next = isPinned
            ? s.pinnedSessionIds.filter((id) => id !== sessionId)
            : [...s.pinnedSessionIds, sessionId]
          savePinnedSessions(next)
          return { pinnedSessionIds: next }
        })
      },

      isSessionStreaming: (id: string) => {
        return get().streamingSessions.has(id)
      },
    }),
    { name: "chat", enabled: import.meta.env.DEV },
  ),
)
