import { useEffect } from "react"
import { useChatStore } from "@/stores/chat"
import MessageList from "./MessageList"
import ChatInputBlock from "./ChatInputBlock"

export default function ChatPanel() {
  const { activeSessionId, isStreaming } = useChatStore()
  const syncFromDb = useChatStore((s) => s.syncFromDb)

  useEffect(() => {
    const state = useChatStore.getState()
    console.log(`[ChatPanel] mount: activeSessionId=${state.activeSessionId}, isStreaming=${state.isStreaming}, activeStream=${state.activeStream?.runId || 'null'}, messages=${state.messages.length}`)
  }, [])

  // Poll DB while streaming as a safety net if SSE drops
  useEffect(() => {
    if (!activeSessionId || !isStreaming) return
    const interval = setInterval(() => {
      syncFromDb(activeSessionId)
    }, 2000)
    return () => clearInterval(interval)
  }, [activeSessionId, isStreaming, syncFromDb])

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
        <div className="mx-auto max-w-3xl">
          <MessageList />
        </div>
      </div>

      <div className="shrink-0 bg-background px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <ChatInputBlock />
        </div>
      </div>
    </div>
  )
}
