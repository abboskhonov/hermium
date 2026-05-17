import { useCallback, useEffect, useRef } from "react"
import { ChatInput, type ChatInputHandle } from "./ChatInput"
import { ChatHeader } from "./ChatHeader"
import { ChatEmptyState } from "./ChatEmptyState"
import { MessageList } from "./MessageList"
import { useChatScroll } from "./hooks/useChatScroll"
import { useChatStream } from "./hooks/useChatStream"
import { useChatActions } from "./hooks/useChatActions"
import { useChatStore } from "./store"
import { resumeSession } from "./socket"
import { uid } from "./store"
import { ApprovalRequest } from "./components/ApprovalRequest"
import type { ChatMessage } from "./types"

interface ChatProps {
  sessionId: string
  messages: ChatMessage[]
  title?: string | null
  model: string
  pendingApproval?: Record<string, unknown> | null
}

export default function Chat({
  sessionId,
  messages,
  title,
  model,
  pendingApproval,
}: ChatProps) {
  const chatInputRef = useRef<ChatInputHandle>(null)
  const pendingSentRef = useRef(false)

  const { containerRef, bottomRef, onScroll } = useChatScroll(messages)
  const { sendMessage, abortChat } = useChatStream()

  // Read loading state directly from store — no hook subscriptions inside useChatStream
  const isLoading = useChatStore((s) => s.streamingSessions.has(sessionId))

  const actions = useChatActions({
    sessionId,
    model,
    messages,
    isLoading,
    sendMessage,
    abortChat,
  })

  // Resume Socket.IO session on mount (reconnect to active runs)
  useEffect(() => {
    if (!sessionId) return
    const socket = resumeSession(sessionId, (data) => {
      if (data.isWorking) {
        useChatStore.setState((s) => ({
          streamingSessions: new Set([...s.streamingSessions, sessionId]),
          sessions: s.sessions.map((sx) =>
            sx.id === sessionId
              ? {
                  ...sx,
                  messages: data.messages?.length ? data.messages.map((m: any) => ({
                    id: String(m.id || uid()),
                    role: m.role as ChatMessage["role"],
                    content: m.content || "",
                    timestamp: m.timestamp ? Number(m.timestamp) * 1000 : Date.now(),
                    reasoning: m.reasoning || undefined,
                    toolCalls: m.tool_calls
                      ? JSON.parse(m.tool_calls).map((tc: any) => ({
                          name: tc.function?.name || tc.name || "tool",
                          preview: "",
                          status: "done" as const,
                          callId: tc.id || undefined,
                        }))
                      : undefined,
                  })) : sx.messages,
                  queueLength: data.queueLength ?? 0,
                  isAborting: data.isAborting || false,
                }
              : sx,
          ),
        }))
      }
    })
    return () => {
      socket.off("resumed")
    }
  }, [sessionId])

  // Auto-send pending message from dashboard
  useEffect(() => {
    if (!sessionId || pendingSentRef.current) return
    const msgKey = `hermium_pending_msg_${sessionId}`
    const modelKey = `hermium_pending_model_${sessionId}`
    const pending = sessionStorage.getItem(msgKey)
    if (!pending) return
    pendingSentRef.current = true
    // Read model before clearing
    const pendingModel = sessionStorage.getItem(modelKey) || model
    sessionStorage.removeItem(msgKey)
    sessionStorage.removeItem(modelKey)
    sendMessage(pending, sessionId, pendingModel)
  }, [sessionId, model, sendMessage])

  // Keyboard shortcut: Cmd/Ctrl+N → new chat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        actions.handleNewChat()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [actions])

  const handleSuggestion = useCallback((text: string) => {
    chatInputRef.current?.setText(text)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <ChatHeader
        sessionId={sessionId}
        title={title}
        hasMessages={messages.length > 0}
        onNewChat={actions.handleNewChat}
        onClear={actions.handleClear}
        queueLength={useChatStore.getState().getSession(sessionId)?.queueLength}
        isAborting={useChatStore.getState().getSession(sessionId)?.isAborting}
      />

      <div
        className="flex-1 min-w-0 overflow-y-auto"
        ref={containerRef}
        onScroll={onScroll}
      >
        {messages.length === 0 && !isLoading ? (
          <ChatEmptyState onSelectSuggestion={handleSuggestion} />
        ) : (
          <div className="mx-auto max-w-3xl">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              onApprove={actions.handleApprove}
              onDeny={actions.handleDeny}
            />
          </div>
        )}
        <div ref={bottomRef} />

        {pendingApproval && (
          <div className="mx-auto max-w-3xl">
            <ApprovalRequest
              sessionId={sessionId}
              request={pendingApproval}
              onResolved={() => {
                useChatStore.getState().updateSession(sessionId, {
                  pendingApproval: null,
                })
              }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t bg-card/50 backdrop-blur-sm">
        <ChatInput
          ref={chatInputRef}
          sessionId={sessionId}
          isLoading={isLoading}
          onSubmit={actions.handleSend}
          onAbort={actions.handleAbort}
        />
      </div>
    </div>
  )
}
