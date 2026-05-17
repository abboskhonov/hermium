import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import ChatPanel from "@/components/hermes/chat/ChatPanel"
import { useChatStore } from "@/stores/chat"

export const Route = createFileRoute("/chat/$sessionId")({
  component: SessionChatPage,
})

function SessionChatPage() {
  const { sessionId } = Route.useParams()

  const switchSession = useChatStore((s) => s.switchSession)
  const loadSessions = useChatStore((s) => s.loadSessions)
  const sessionsLoaded = useChatStore((s) => s.sessionsLoaded)

  // Load sessions on first mount
  useEffect(() => {
    if (!sessionsLoaded) {
      loadSessions()
    }
  }, [sessionsLoaded, loadSessions])

  // Switch to this session
  useEffect(() => {
    if (!sessionId) return
    switchSession(sessionId)
  }, [sessionId, switchSession])

  return <ChatPanel />
}
