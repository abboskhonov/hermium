import { useEffect, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@/stores/chat"
import { createSession } from "@/api/hermes/sessions"

export const Route = createFileRoute("/chat/")({
  component: ChatIndexPage,
})

function ChatIndexPage() {
  const navigate = useNavigate()
  const sessionsLoaded = useChatStore((s) => s.sessionsLoaded)
  const sessions = useChatStore((s) => s.sessions)
  const creatingRef = useRef(false)

  useEffect(() => {
    if (!sessionsLoaded) return

    if (sessions.length > 0) {
      navigate({
        to: "/chat/$sessionId",
        params: { sessionId: sessions[0].id },
        replace: true,
      })
    } else {
      if (creatingRef.current) return
      creatingRef.current = true
      createSession({ title: "", source: "api_server" })
        .then((data) => {
          navigate({
            to: "/chat/$sessionId",
            params: { sessionId: data.id },
            replace: true,
          })
        })
        .catch(() => {
          creatingRef.current = false
        })
    }
  }, [sessionsLoaded, sessions, navigate])

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading conversations…</p>
    </div>
  )
}
