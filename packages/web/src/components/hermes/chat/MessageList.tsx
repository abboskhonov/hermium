import { useChatStore } from "@/stores/chat"
import { useState, useEffect, useRef } from "react"
import {
  IconCopy,
  IconCheck,
  IconChevronRight,
  IconLoader2,
  IconFile,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import MarkdownMessage from "./MarkdownMessage"

// ── Copy button ──────────────────────────────────────────────────────────

function BubbleCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Copy message"
    >
      {copied ? <IconCheck className="size-3" /> : <IconCopy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

// ── Thinking card with live duration ─────────────────────────────────────

function formatThinkingDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r === 0 ? `${m}m` : `${m}m ${r}s`
}

function ThinkingCard({
  reasoning,
  isStreaming,
  startedAt,
  endedAt,
}: {
  reasoning: string
  isStreaming?: boolean
  startedAt?: number
  endedAt?: number
}) {
  const [open, setOpen] = useState(isStreaming ?? false)
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setOpen(isStreaming ?? false)
  }, [isStreaming])

  useEffect(() => {
    if (isStreaming && startedAt && !endedAt) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000)
      return () => {
        if (tickRef.current) clearInterval(tickRef.current)
      }
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [isStreaming, startedAt, endedAt])

  if (!reasoning.trim()) return null

  const durationMs = startedAt
    ? Math.max(0, (endedAt ?? (isStreaming ? now : startedAt)) - startedAt)
    : null
  const charCount = [...reasoning].length
  const hasThinking = isStreaming && startedAt && !endedAt

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] transition-colors",
          hasThinking
            ? "text-amber-500 dark:text-amber-400 font-medium"
            : "text-muted-foreground/70 hover:text-foreground",
        )}
      >
        <IconChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        {hasThinking ? (
          <span className="inline-flex items-center gap-1">
            <IconLoader2 className="size-2.5 animate-spin" />
            thinking…
          </span>
        ) : (
          <span>thought</span>
        )}
        {durationMs !== null && durationMs > 0 && (
          <span className="text-muted-foreground/60 tabular-nums">
            · {formatThinkingDuration(durationMs)}
          </span>
        )}
        <span className="text-muted-foreground/60">
          · {charCount.toLocaleString()} chars
        </span>
      </button>
      {open && (
        <div className="mt-1 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono border border-amber-200 dark:border-amber-800/30">
          {reasoning}
        </div>
      )}
    </div>
  )
}

// ── Tool invocation card ──────────────────────────────────────────────────

function formatToolPayload(raw?: string): { text: string; isJson: boolean } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return { text: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { text: raw, isJson: false }
  }
}

function ToolInvocationCard({
  tools,
}: {
  tools: { name: string; preview: string; callId?: string; output?: string; status: string }[]
}) {
  const [open, setOpen] = useState(false)

  if (!tools?.length) return null

  const runningCount = tools.filter((t) => t.status === "running").length
  const doneCount = tools.filter((t) => t.status === "done").length
  const errorCount = tools.filter((t) => t.status === "error").length

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <IconChevronRight
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span>
          used {tools.length} tool{tools.length > 1 ? "s" : ""}
        </span>
        {runningCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-amber-500">
            <IconLoader2 className="size-2.5 animate-spin" />
            {runningCount}
          </span>
        )}
        {doneCount > 0 && <span className="text-emerald-500">{doneCount} done</span>}
        {errorCount > 0 && <span className="text-red-500">{errorCount} error</span>}
        {tools.length > 0 && runningCount === 0 && (
          <span className="text-muted-foreground/50 truncate max-w-[200px]">
            — {tools.map((t) => t.name).join(", ")}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-1.5">
          {tools.map((t, i) => {
            const formattedArgs = formatToolPayload(t.preview)
            const formattedOutput = formatToolPayload(t.output)
            return (
              <div
                key={t.callId || `${t.name}-${i}`}
                className="rounded-md bg-muted/40 border border-border/50 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold text-foreground/80 font-mono">
                    {t.name}
                  </span>
                  {t.status === "running" && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                      <IconLoader2 className="size-2.5 animate-spin" />
                      running
                    </span>
                  )}
                  {t.status === "done" && (
                    <span className="text-[10px] text-emerald-500">✓ done</span>
                  )}
                  {t.status === "error" && (
                    <span className="text-[10px] text-red-500">✗ error</span>
                  )}
                </div>
                {formattedArgs && (
                  <div className="border-t border-border/30">
                    <div className="px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      Arguments
                    </div>
                    <div className="px-2.5 pb-1.5">
                      <pre
                        className={cn(
                          "text-[10px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto rounded",
                          formattedArgs.isJson
                            ? "bg-slate-900/10 dark:bg-slate-900/40 text-foreground/80 px-2 py-1"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {formattedArgs.text}
                      </pre>
                    </div>
                  </div>
                )}
                {formattedOutput && (
                  <div className="border-t border-border/30">
                    <div className="px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      Result
                    </div>
                    <div className="px-2.5 pb-1.5">
                      <pre
                        className={cn(
                          "text-[10px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto rounded",
                          formattedOutput.isJson
                            ? "bg-slate-900/10 dark:bg-slate-900/40 text-foreground/80 px-2 py-1"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {formattedOutput.text}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Message body (streaming-aware) ────────────────────────────────────────

function MessageBody({
  content,
  isStreaming,
  isAssistant,
}: {
  content: string
  isStreaming?: boolean
  isAssistant?: boolean
}) {
  // Use markdown renderer for completed assistant messages
  if (isAssistant && !isStreaming && content) {
    return <MarkdownMessage content={content} />
  }

  if (isStreaming && content) {
    return (
      <div className="text-base leading-relaxed">
        <MarkdownMessage content={content} isStreaming={true} />
      </div>
    )
  }

  if (isStreaming && !content) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
        Thinking…
      </span>
    )
  }

  return (
    <div className="text-base leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  )
}

// ── Time formatter ───────────────────────────────────────────────────────

function formatTime(ts: number | undefined): string | null {
  if (!ts || isNaN(ts)) return null
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return null
  }
}

// ── Main component ───────────────────────────────────────────────────────

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Start a conversation
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {messages.map((msg) => {
        const isUser = msg.role === "user"
        const isSystem = msg.role === "system"
        const isTool = msg.role === "tool"
        const hasContent = !!msg.content?.trim()
        const hasReasoning = !!msg.reasoning?.trim()
        const hasToolCalls = !!msg.toolCalls?.length
        const timeLabel = formatTime(msg.timestamp)

        // Minimal render for tool messages and reasoning-only assistant
        const isMinimal =
          isTool || (!isUser && !hasContent && (hasReasoning || hasToolCalls))

        if (isSystem) {
          return (
            <div key={msg.id} className="px-4 py-2">
              <div className="mx-auto max-w-3xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {msg.content}
              </div>
            </div>
          )
        }

        if (isMinimal) {
          return (
            <div key={msg.id} className="px-4 py-1">
              <div className="mx-auto max-w-3xl flex flex-col gap-1">
                {hasReasoning && (
                  <ThinkingCard
                    reasoning={msg.reasoning!}
                    isStreaming={msg.isStreaming}
                    startedAt={msg.reasoningStartedAt}
                    endedAt={msg.reasoningEndedAt}
                  />
                )}
                {!isTool && hasToolCalls && (
                  <ToolInvocationCard tools={msg.toolCalls!} />
                )}
                {isTool && (
                  <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono border border-border/50">
                    {msg.content}
                  </div>
                )}
              </div>
              {timeLabel && (
                <div className="mx-auto max-w-3xl">
                  <span className="mt-0.5 text-[10px] text-muted-foreground/40">
                    {timeLabel}
                  </span>
                </div>
              )}
            </div>
          )
        }

        // User messages
        if (isUser) {
          const hasAttachments = !!msg.attachments?.length
          return (
            <div key={msg.id} className="flex px-4 py-2 justify-end">
              <div className="flex min-w-0 flex-col max-w-[80%] items-end gap-1.5">
                {hasAttachments && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {msg.attachments!.map((att) => {
                      const isImage = att.type.startsWith('image/')
                      return isImage ? (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-border/50 hover:border-border transition-colors"
                        >
                          <img
                            src={att.url}
                            alt={att.name}
                            className="max-h-[200px] max-w-[260px] object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <IconFile className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{att.name}</span>
                        </a>
                      )
                    })}
                  </div>
                )}
                <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {timeLabel && (
                  <span className="text-[10px] text-muted-foreground/50 px-1">
                    {timeLabel}
                  </span>
                )}
              </div>
            </div>
          )
        }

        // Assistant messages
        return (
          <div key={msg.id} className="flex px-4 py-4 justify-start">
            <div className="flex min-w-0 flex-col w-full max-w-3xl gap-1">
              {hasReasoning && (
                <ThinkingCard
                  reasoning={msg.reasoning!}
                  isStreaming={msg.isStreaming}
                  startedAt={msg.reasoningStartedAt}
                  endedAt={msg.reasoningEndedAt}
                />
              )}
              {hasToolCalls && <ToolInvocationCard tools={msg.toolCalls!} />}
              <MessageBody content={msg.content} isStreaming={msg.isStreaming} isAssistant />
              {hasContent && (
                <div className="mt-1 flex items-center gap-2 px-1">
                  <BubbleCopyButton text={msg.content} />
                </div>
              )}
              {timeLabel && (
                <span className="mt-0.5 text-[10px] text-muted-foreground/50 px-1">
                  {timeLabel}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
