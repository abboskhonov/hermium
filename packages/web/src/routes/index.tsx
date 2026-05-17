import { createFileRoute, useNavigate } from "@tanstack/react-router"
import ChatInputBlock from "@/components/hermes/chat/ChatInputBlock"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          What can I help you with?
        </h1>

        <ChatInputBlock
          onCreateSession={(id) => {
            navigate({ to: "/chat/$sessionId", params: { sessionId: id } })
          }}
        />
      </div>
    </div>
  )
}
