import { useCallback, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "../store"
import { createSession } from "../apis"
import { isLocalCommand, SLASH_COMMANDS } from "../slashCommands"
import type { ChatMessage, Attachment } from "../types"

interface UseChatActionsArgs {
  sessionId: string
  model: string
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (
    text: string,
    sessionId: string,
    model: string,
    options?: { contextLength?: number | null; attachments?: Attachment[] },
  ) => Promise<void>
  abortChat: () => void
}

interface UseChatActionsResult {
  handleSend: (text: string, attachments?: Attachment[]) => Promise<void>
  handleAbort: () => void
  handleApprove: () => Promise<void>
  handleDeny: () => Promise<void>
  handleNewChat: () => Promise<void>
  handleClear: () => void
}

/**
 * Encapsulates chat actions with stable callback identities.
 * Reads mutable state through refs so memoized children never re-render
 * during streaming.
 */
export function useChatActions({
  sessionId,
  model,
  isLoading,
  sendMessage,
  abortChat,
}: UseChatActionsArgs): UseChatActionsResult {
  const navigate = useNavigate()
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      const trimmed = text.trim()
      if (!trimmed || isLoadingRef.current) return

      // Local commands
      if (isLocalCommand(trimmed)) {
        const cmd = trimmed.split(/\s+/)[0].toLowerCase()
        if (cmd === "/new") {
          const id = await createSession({ model })
          navigate({ to: "/chat/$sessionId", params: { sessionId: id.id } })
          return
        }
        if (cmd === "/clear") {
          useChatStore.setState((s) => ({
            sessions: s.sessions.map((sx) =>
              sx.id === sessionId ? { ...sx, messages: [] } : sx,
            ),
          }))
          return
        }
        if (cmd === "/help") {
          const lines = SLASH_COMMANDS.map(
            (c) => `\`${c.name}\` — ${c.description}`,
          ).join("\n")
          useChatStore.setState((s) => ({
            sessions: s.sessions.map((sx) =>
              sx.id === sessionId
                ? {
                    ...sx,
                    messages: [
                      ...sx.messages,
                      {
                        id: `agent-${Date.now()}`,
                        role: "assistant",
                        content: `**Available Commands**\n\n${lines}`,
                        timestamp: Date.now(),
                      },
                    ],
                  }
                : sx,
            ),
          }))
          return
        }
        // Fallback: show a notice for unimplemented local commands
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((sx) =>
            sx.id === sessionId
              ? {
                  ...sx,
                  messages: [
                    ...sx.messages,
                    {
                      id: `agent-${Date.now()}`,
                      role: "assistant",
                      content: `Command \`${cmd}\` is not yet implemented in the web UI.`,
                      timestamp: Date.now(),
                    },
                  ],
                }
              : sx,
          ),
        }))
        return
      }

      await sendMessage(trimmed, sessionId, model, { attachments })
    },
    [sessionId, model, sendMessage, navigate],
  )

  const handleAbort = useCallback(() => {
    abortChat()
  }, [abortChat])

  const handleApprove = useCallback(async () => {
    if (isLoadingRef.current) return
    await sendMessage("/approve", sessionId, model)
  }, [sessionId, model, sendMessage])

  const handleDeny = useCallback(async () => {
    if (isLoadingRef.current) return
    await sendMessage("/deny", sessionId, model)
  }, [sessionId, model, sendMessage])

  const handleNewChat = useCallback(async () => {
    const id = await createSession({ model })
    navigate({ to: "/chat/$sessionId", params: { sessionId: id.id } })
  }, [model, navigate])

  const handleClear = useCallback(() => {
    if (isLoadingRef.current) {
      abortChat()
    }
    useChatStore.setState((s) => ({
      sessions: s.sessions.map((sx) =>
        sx.id === sessionId ? { ...sx, messages: [] } : sx,
      ),
    }))
  }, [sessionId, abortChat])

  return { handleSend, handleAbort, handleApprove, handleDeny, handleNewChat, handleClear }
}
