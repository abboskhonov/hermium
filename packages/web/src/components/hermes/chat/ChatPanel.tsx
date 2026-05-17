import { useEffect } from "react"
import { useChatStore } from "@/stores/chat"
import MessageList from "./MessageList"
import ChatInputBlock from "./ChatInputBlock"

export default function ChatPanel() {
  const { activeSessionId, isStreaming, loadSessions } = useChatStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return (
    <div className="flex h-full flex-col ">
      <header className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="truncate font-medium">
            {activeSessionId
              ? `Chat ${activeSessionId.slice(0, 8)}`
              : "New Chat"}
          </h2>
          {isStreaming && (
            <span className="shrink-0 text-xs text-muted-foreground">Streaming…</span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <MessageList />
      </div>

    
        <ChatInputBlock />
   
    </div>
  )
}
