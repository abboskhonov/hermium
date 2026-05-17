import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useShallow } from "zustand/react/shallow"
import Chat from "@/features/chat/Chat"
import { useChatStore } from "@/features/chat/store"

export const Route = createFileRoute("/chat/$sessionId/")({
  component: SessionChatPage,
})

function SessionChatPage() {
  const { sessionId } = Route.useParams()

  const switchSession = useChatStore((s) => s.switchSession)
  const loadSessions = useChatStore((s) => s.loadSessions)
  const loadSessionMessages = useChatStore((s) => s.loadSessionMessages)
  const sessionsLoaded = useChatStore((s) => s.sessionsLoaded)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)

  // Granular selectors: return stable references during streaming
  const sessionMeta = useChatStore(
    useShallow(
      (s) => {
        const sess = s.sessions.find((sx) => sx.id === sessionId)
        return {
          title: sess?.title,
          model: sess?.model || "",
          pendingApproval: sess?.pendingApproval ?? null,
        }
      },
    ),
  )

  const messages = useChatStore(
    useShallow(
      (s) => {
        const sess = s.sessions.find((sx) => sx.id === sessionId)
        return sess?.messages ?? []
      },
    ),
  )

  // Load sessions on first mount
  useEffect(() => {
    if (!sessionsLoaded) {
      loadSessions()
    }
  }, [sessionsLoaded, loadSessions])

  // Switch to this session and load messages
  useEffect(() => {
    if (!sessionId) return
    switchSession(sessionId)

    const sess = useChatStore.getState().getSession(sessionId)
    if (!sess || sess.messages.length === 0) {
      loadSessionMessages(sessionId)
    }
  }, [sessionId, switchSession, loadSessionMessages])

  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <div className="shrink-0 border-b px-4 py-2.5 flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground truncate flex-1">Loading…</span>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="space-y-4 p-4 mx-auto max-w-3xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div
                  className={`h-4 rounded bg-muted ${i % 2 === 0 ? "w-2/3" : "w-1/2 ml-auto"}`}
                />
                <div
                  className={`h-3 rounded bg-muted ${i % 2 === 0 ? "w-1/2" : "w-1/3 ml-auto"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Chat
      sessionId={sessionId}
      messages={messages}
      title={sessionMeta.title}
      model={sessionMeta.model}
      pendingApproval={sessionMeta.pendingApproval}
    />
  )
}
