import { memo, useMemo } from "react"
import { ChatMessage } from "./components/ChatMessage"
import type { ChatMessageData } from "./components/ChatMessage"
import type { ChatMessage as ChatMessageType } from "./types"
import { IconLoader2 } from "@tabler/icons-react"

interface MessageListProps {
  messages: ChatMessageType[]
  isLoading: boolean
  onApprove: () => void
  onDeny: () => void
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="flex px-4 py-4 justify-start">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
        Thinking…
      </div>
    </div>
  )
}

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
}: MessageListProps): React.JSX.Element {
  // Map our internal ChatMessage to ChatMessageData (interface naming collision)
  const mapped = useMemo(
    () =>
      messages.map(
        (msg): ChatMessageData => ({
          id: msg.id,
          role: msg.role === "user" ? "user" : msg.role === "tool" ? "tool" : "assistant",
          content: msg.content,
          timestamp: msg.timestamp,
          isStreaming: msg.isStreaming,
          reasoning: msg.reasoning,
          reasoningStartedAt: msg.reasoningStartedAt,
          reasoningEndedAt: msg.reasoningEndedAt,
          toolCalls: msg.toolCalls,
        }),
      ),
    [messages],
  )

  return (
    <>
      {mapped.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </>
  )
})
