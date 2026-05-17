import { create } from "zustand"
import type { Session, Message } from "@hermium/shared"
import {
  fetchSessions,
  fetchSession,
  createSession,
  deleteSession as apiDeleteSession,
  saveMessage,
} from "@/api/hermes/sessions"

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
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  isLoadingSessions: false,
  sessionsLoaded: false,
  pinnedSessionIds: loadPinnedSessions(),

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

      // Merge with local sessions that aren't on server yet
      const localOnly = get().sessions.filter(
        (local) =>
          !list.some((api) => api.id === local.id) &&
          local.id === get().activeSessionId,
      )
      const merged = [...localOnly, ...list]

      set({ sessions: merged, sessionsLoaded: true })

      // Restore last active session
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
    set({ activeSessionId: id, messages: [], isStreaming: false })
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

  async createNewSession() {
    const id = uid()
    const now = Date.now()
    const session: Session = {
      id,
      title: "",
      source: "api_server",
      createdAt: now,
      updatedAt: now,
    }

    set((s) => ({ sessions: [session, ...s.sessions] }))

    try {
      await createSession({ id, title: "", source: "api_server" })
    } catch (err) {
      console.error("Failed to create session on server:", err)
    }

    await get().switchSession(id)
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

      if (nextActiveId !== s.activeSessionId) {
        setTimeout(() => {
          if (nextActiveId) get().switchSession(nextActiveId)
          else set({ activeSessionId: null, messages: [] })
        }, 0)
      }

      return { sessions: nextSessions, pinnedSessionIds: nextPinned }
    })
  },

  async saveAndAppendMessage(sessionId, message) {
    set((s) => ({ messages: [...s.messages, message] }))

    try {
      await saveMessage(sessionId, message)
    } catch (err) {
      console.error("Failed to save message:", err)
    }
  },

  updateSessionTitle(sessionId) {
    set((s) => {
      const session = s.sessions.find((sess) => sess.id === sessionId)
      if (!session || session.title) return s

      const firstUser = s.messages.find((m) => m.role === "user")
      if (!firstUser) return s

      const title =
        firstUser.content.slice(0, 40) +
        (firstUser.content.length > 40 ? "..." : "")
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
}))
