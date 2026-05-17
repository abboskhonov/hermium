import { useChatStore } from "@/stores/chat"

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const isLoadingSessions = useChatStore((s) => s.isLoadingSessions)

  if (isLoadingSessions) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading sessions…
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Start a conversation
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((msg) => {
        const isUser = msg.role === "user"
        const isSystem = msg.role === "system"
        const isTool = msg.role === "tool"

        return (
          <div
            key={msg.id}
            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
              isUser
                ? "ml-auto bg-primary text-primary-foreground"
                : isSystem
                  ? "mx-auto w-full max-w-full border border-destructive/30 bg-destructive/10 text-destructive"
                  : isTool
                    ? "mr-auto w-full max-w-full border border-border bg-muted/60 text-muted-foreground"
                    : "mr-auto bg-muted"
            }`}
          >
            {isTool && msg.toolName && (
              <div className="mb-1 text-xs font-medium text-accent-foreground">
                🔧 {msg.toolName}
                {msg.toolStatus === "running" && (
                  <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.reasoning && (
              <div className="mt-2 border-t pt-2 text-xs opacity-70">
                {msg.reasoning}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
