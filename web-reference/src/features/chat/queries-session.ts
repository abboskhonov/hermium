import { useQuery, useQueryClient } from "@tanstack/react-query"
import { get } from "@/lib/api"
import type { ChatMessageData } from "./components/ChatMessage"

// ─── Session message from our app's API ──────────────────────────────────

interface AppSessionMessage {
  role: string
  content: string | Array<{ type: string; text?: string }>
  reasoning?: string
  reasoning_content?: string
  timestamp?: number
  name?: string
  tool_calls?: Array<Record<string, unknown>>
}

interface AppSessionResponse {
  id: string
  title: string | null
  messages: AppSessionMessage[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeContent(raw: AppSessionMessage["content"]): string {
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) {
    return raw.map((p) => (typeof p === "object" && p.text ? p.text : "")).join(" ")
  }
  return ""
}

function transformMessage(
  m: AppSessionMessage,
  sessionId: string,
  index: number,
): ChatMessageData {
  const role = m.role
  const content = normalizeContent(m.content)
  const reasoning = m.reasoning || m.reasoning_content || ""

  const toolCalls: ChatMessageData["toolCalls"] = []
  if (Array.isArray(m.tool_calls)) {
    for (const tc of m.tool_calls) {
      const fn = tc.function as Record<string, unknown> | undefined
      const tcName = (fn?.name || tc.name) as string | undefined
      if (tcName) {
        toolCalls.push({ name: tcName, preview: "", status: "done" })
      }
    }
  }

  let displayRole: ChatMessageData["role"] = "assistant"
  if (role === "user") displayRole = "user"
  if (role === "tool") displayRole = "tool"

  return {
    id: `${sessionId}-${index}`,
    role: displayRole,
    content,
    timestamp: m.timestamp
      ? Number(m.timestamp) * (m.timestamp < 1_000_000_000_000 ? 1000 : 1)
      : Date.now(),
    reasoning: reasoning || undefined,
    toolName: m.name || undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  }
}

export interface SessionMessagesResult {
  messages: ChatMessageData[]
  title: string
}

// ─── Query key factory ─────────────────────────────────────────────────────

export const sessionMsgKeys = {
  all: ["session-messages"] as const,
  detail: (id: string) => [...sessionMsgKeys.all, id] as const,
}

// ─── Query hook ────────────────────────────────────────────────────────────

/**
 * @deprecated The chat page reads messages directly from Zustand.
 * Only the sidebar prefetch on hover uses this indirectly.
 * Kept for reference — remove in cleanup.
 */
export function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: sessionMsgKeys.detail(sessionId ?? ""),
    queryFn: async (): Promise<SessionMessagesResult> => {
      // Fetch from our app's session store (reads from Hermes state.db)
      const data = await get<AppSessionResponse>(
        `/api/sessions/${sessionId}`,
      )

      const msgs: ChatMessageData[] = []
      let derivedTitle = data.title || ""

      for (const m of data.messages ?? []) {
        const msg = transformMessage(m, sessionId!, msgs.length)
        msgs.push(msg)

        if (!derivedTitle && m.role === "user" && msg.content.trim()) {
          derivedTitle = msg.content.trim()
        }
      }

      return {
        messages: msgs,
        title: derivedTitle || "Conversation",
      }
    },
    enabled: !!sessionId,
    staleTime: 30_000,
    gcTime: 300_000,
  })
}

// ─── Prefetch helper (for sidebar hover) ───────────────────────────────────

export function prefetchSessionMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: sessionMsgKeys.detail(sessionId),
    queryFn: async () => {
      const data = await get<AppSessionResponse>(
        `/api/sessions/${sessionId}`,
      )
      const msgs: ChatMessageData[] = []
      let derivedTitle = data.title || ""

      for (const m of data.messages ?? []) {
        const msg = transformMessage(m, sessionId, msgs.length)
        msgs.push(msg)
        if (!derivedTitle && m.role === "user" && msg.content.trim()) {
          derivedTitle = msg.content.trim()
        }
      }

      return { messages: msgs, title: derivedTitle || "Conversation" }
    },
    staleTime: 30_000,
    gcTime: 300_000,
  })
}
