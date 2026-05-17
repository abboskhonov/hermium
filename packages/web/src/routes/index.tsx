import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@/stores/chat"
import ChatInputBlock from "@/components/hermes/chat/ChatInputBlock"
import {
  IconFileSpark,
  IconGauge,
  IconAlertTriangle,
} from "@tabler/icons-react"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

const PROMPTS = [
  {
    icon: IconFileSpark,
    text: "Write documentation",
    prompt:
      "Write comprehensive documentation for this codebase, including setup instructions, API references, and usage examples.",
  },
  {
    icon: IconGauge,
    text: "Optimize performance",
    prompt:
      "Analyze the codebase for performance bottlenecks and suggest optimizations to improve loading times and runtime efficiency.",
  },
  {
    icon: IconAlertTriangle,
    text: "Find and fix 3 bugs",
    prompt:
      "Scan through the codebase to identify and fix 3 critical bugs, providing detailed explanations for each fix.",
  },
]

function LandingPage() {
  const navigate = useNavigate()

  const handlePromptClick = (prompt: string) => {
    const store = useChatStore.getState()
    store.createNewSession().then((id) => {
      navigate({ to: "/chat/$sessionId", params: { sessionId: id } }).then(() => {
        store.sendMessage(prompt)
      })
    })
  }

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

        <div className="flex flex-wrap justify-center gap-2">
          {PROMPTS.map((button) => {
            const IconComponent = button.icon
            return (
              <button
                key={button.text}
                onClick={() => handlePromptClick(button.prompt)}
                className="group flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-muted/30 bg-transparent"
              >
                <IconComponent className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                <span>{button.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
