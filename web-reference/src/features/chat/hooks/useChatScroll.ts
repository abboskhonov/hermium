import { useCallback, useEffect, useRef } from "react"
import type { ChatMessage } from "../types"

/**
 * Auto-scroll behaviour for chat messages.
 * - Tracks whether the user has manually scrolled up; pauses auto-scroll.
 * - Re-engages auto-scroll when a new user message is sent.
 */
export function useChatScroll(messages: ChatMessage[]): {
  containerRef: React.RefObject<HTMLDivElement | null>
  bottomRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const prevCountRef = useRef(messages.length)

  const scrollToBottom = useCallback((force?: boolean) => {
    if (!force && userScrolledUpRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    userScrolledUpRef.current = !atBottom
  }, [])

  // Auto-scroll on incoming messages; force-scroll when user sends a new one
  useEffect(() => {
    const prevCount = prevCountRef.current
    prevCountRef.current = messages.length
    const userJustSent =
      messages.length > prevCount &&
      messages[messages.length - 1]?.role === "user"
    if (userJustSent) {
      userScrolledUpRef.current = false
      scrollToBottom(true)
    } else {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  return { containerRef, bottomRef, onScroll }
}
