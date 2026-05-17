import { useRef, useCallback } from "react"
import { useChatStore } from "@/stores/chat"
import { runChat, streamChatRun } from "@/api/hermes/chat"
import { saveMessage } from "@/api/hermes/sessions"

export default function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    activeSessionId,
    appendMessage,
    setStreaming,
    createNewSession,
    saveAndAppendMessage,
    updateSessionTitle,
  } = useChatStore()
  const abortRef = useRef<(() => void) | null>(null)

  const send = useCallback(async () => {
    const raw = textareaRef.current?.value ?? ""
    if (!raw.trim()) return

    // Ensure we have an active session
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
    }
    if (!sessionId) return

    const userMsg: import("@hermium/shared").Message = {
      id: Date.now().toString(36),
      role: "user",
      content: raw,
      timestamp: Date.now(),
    }

    // Persist user message and add to UI
    await saveAndAppendMessage(sessionId, userMsg)
    updateSessionTitle(sessionId)

    if (textareaRef.current) textareaRef.current.value = ""
    setStreaming(true)

    try {
      const { run_id } = await runChat({
        input: raw,
        session_id: sessionId,
      })

      // Create assistant message shell
      const assistantId = Date.now().toString(36) + "_ai"
      appendMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      })

      // Start SSE stream
      abortRef.current = streamChatRun(run_id, {
        onEvent: (event) => {
          if (event.event === "message.delta" && event.delta) {
            const state = useChatStore.getState()
            const msg = state.messages.find((m) => m.id === assistantId)
            if (msg) {
              const nextContent = msg.content + event.delta
              useChatStore.setState({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: nextContent } : m
                ),
              })
            }
          }
          if (event.event === "run.completed") {
            const state = useChatStore.getState()
            const finalMsg = state.messages.find((m) => m.id === assistantId)
            if (finalMsg) {
              useChatStore.setState({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                ),
              })
              // Persist final assistant message
              saveMessage(sessionId!, {
                ...finalMsg,
                isStreaming: false,
              }).catch(console.error)
            }
            setStreaming(false)
          }
          if (event.event === "run.error") {
            const state = useChatStore.getState()
            useChatStore.setState({
              messages: state.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      role: "system",
                      content: event.error || "Stream error",
                      systemType: "error",
                      isStreaming: false,
                    }
                  : m
              ),
            })
            setStreaming(false)
          }
        },
        onError: (err) => {
          appendMessage({
            id: Date.now().toString(36) + "_err",
            role: "system",
            content: err.message,
            timestamp: Date.now(),
            systemType: "error",
          })
          setStreaming(false)
        },
        onClose: () => {
          setStreaming(false)
        },
      })
    } catch (err) {
      appendMessage({
        id: Date.now().toString(36) + "_err",
        role: "system",
        content: err instanceof Error ? err.message : "Unknown error",
        timestamp: Date.now(),
        systemType: "error",
      })
      setStreaming(false)
    }
  }, [activeSessionId, appendMessage, createNewSession, saveAndAppendMessage, setStreaming, updateSessionTitle])

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Type a message…"
        rows={1}
        className="min-h-[40px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        onClick={send}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        Send
      </button>
    </div>
  )
}
