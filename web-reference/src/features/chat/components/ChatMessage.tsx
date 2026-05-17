import { memo, useState, lazy, Suspense, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import {
  IconCopy,
  IconCheck,
  IconChevronRight,
  IconLoader2,
} from "@tabler/icons-react"

// Lazy load the syntax highlighter chunk (~600 KB) — only fetched when a code block renders
const SyncHighlighter = lazy(() => import("@/features/chat/components/syntax-highlighter").then(m => ({ default: m.SyncHighlighter })))

export interface ChatMessageData {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  timestamp: number
  isStreaming?: boolean
  reasoning?: string
  reasoningStartedAt?: number
  reasoningEndedAt?: number
  toolName?: string
  toolCalls?: { name: string; preview: string; callId?: string; output?: string; status: string }[]
}

interface ChatMessageProps {
  message: ChatMessageData
}

// ── Copy button (for code blocks) ──────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Copy code"
    >
      {copied ? <IconCheck className="size-3" /> : <IconCopy className="size-3" />}
    </button>
  )
}

// ── Inline copy button (for message bubbles) ───────────────────────────────

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

// ── Compact cards ─────────────────────────────────────────────────────────

// ── Duration formatter ─────────────────────────────────────────────────────

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
  // Auto-open during streaming so the user sees thinking in real-time.
  // Once streaming ends, it stays collapsed until manually opened.
  const [open, setOpen] = useState(isStreaming ?? false)

  // Auto-expand when stream starts, auto-collapse when it ends.
  // Same component instance is reused (memo), so we must sync state
  // when isStreaming transitions.
  useEffect(() => {
    setOpen(isStreaming ?? false)
  }, [isStreaming])

  // Live-ticking duration clock during streaming
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    return undefined
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

function ToolCard({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false)
  const preview = content.length > 60 ? content.slice(0, 60) + "..." : content

  if (!content) return null

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors truncate max-w-full"
      >
        <IconChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        <span className="truncate">
          {name || "tool"}: "{preview}"
        </span>
      </button>
      {open && (
        <div className="mt-1 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono border border-border/50 max-h-[300px] overflow-auto">
          {content}
        </div>
      )}
    </div>
  )
}

// ── Tool payload formatter ─────────────────────────────────────────────────

function formatToolPayload(raw?: string): { text: string; isJson: boolean } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return { text: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { text: raw, isJson: false }
  }
}

function ToolInvocationCard({ tools }: { tools: ChatMessageData["toolCalls"] }) {
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
        <IconChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        <span>used {tools.length} tool{tools.length > 1 ? "s" : ""}</span>
        {runningCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-amber-500">
            <IconLoader2 className="size-2.5 animate-spin" />
            {runningCount}
          </span>
        )}
        {doneCount > 0 && (
          <span className="text-emerald-500">{doneCount} done</span>
        )}
        {errorCount > 0 && (
          <span className="text-red-500">{errorCount} error</span>
        )}
        {tools.length > 0 && runningCount === 0 && (
          <span className="text-muted-foreground/50 truncate max-w-[200px]">
            — {tools.map(t => t.name).join(", ")}
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
                {/* Tool header */}
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
                {/* Args */}
                {formattedArgs && (
                  <div className="border-t border-border/30">
                    <div className="flex items-center justify-between px-2.5 py-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                        Arguments
                      </span>
                      <CopyButton text={formattedArgs.text} />
                    </div>
                    <div className="px-2.5 pb-1.5">
                      <pre className={cn(
                        "text-[10px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto rounded",
                        formattedArgs.isJson
                          ? "bg-slate-900/10 dark:bg-slate-900/40 text-foreground/80 px-2 py-1"
                          : "text-muted-foreground/70",
                      )}>
                        {formattedArgs.text}
                      </pre>
                    </div>
                  </div>
                )}
                {/* Output */}
                {formattedOutput && (
                  <div className="border-t border-border/30">
                    <div className="flex items-center justify-between px-2.5 py-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                        Result
                      </span>
                      <CopyButton text={formattedOutput.text} />
                    </div>
                    <div className="px-2.5 pb-1.5">
                      <pre className={cn(
                        "text-[10px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto rounded",
                        formattedOutput.isJson
                          ? "bg-slate-900/10 dark:bg-slate-900/40 text-foreground/80 px-2 py-1"
                          : "text-muted-foreground/70",
                      )}>
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

// ── Code block ────────────────────────────────────────────────────────────

function CodeBlock({ language, value }: { language: string; value: string }) {
  return (
    <div className="relative group/code my-2">
      <div className="flex items-center justify-between rounded-t-lg bg-muted/80 px-3 py-1.5 border border-border border-b-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {language || "text"}
        </span>
        <CopyButton text={value} />
      </div>
      <Suspense
        fallback={
          <pre className="bg-[#282c34] text-gray-300 rounded-b-lg px-4 py-3 text-[13px] leading-relaxed overflow-x-auto font-mono">
            <code>{value}</code>
          </pre>
        }
      >
        <SyncHighlighter language={language} value={value} />
      </Suspense>
    </div>
  )
}

// ── Markdown content renderer ─────────────────────────────────────────────

const markdownComponents = {
  pre({ children }: { children?: React.ReactNode }) {
    return <div className="overflow-x-auto max-w-full">{children}</div>
  },
  code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
    const match = /language-(\w+)/.exec(className || "")
    const value = String(children).replace(/\n$/, "")

    if (!match) {
      return (
        <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono text-foreground/90" {...props}>
          {children}
        </code>
      )
    }

    // plaintext code blocks — no syntax highlighting, just monospace pre
    if (match[1] === "plaintext") {
      return (
        <pre className="rounded-lg bg-muted/50 border border-border/50 px-4 py-3 text-[13px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap">
          {value}
        </pre>
      )
    }

    return <CodeBlock language={match[1]} value={value} />
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
        {children}
      </a>
    )
  },
  img({ src, alt }: { src?: string; alt?: string }) {
    return <img src={src} alt={alt} className="rounded-lg max-w-full my-2" loading="lazy" />
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    )
  },
  th({ children }: { children?: React.ReactNode }) {
    return <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">{children}</th>
  },
  td({ children }: { children?: React.ReactNode }) {
    return <td className="border border-border px-3 py-1.5">{children}</td>
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return <blockquote className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
  },
}

// ── Detect box-drawing characters (TUI diagrams, ASCII art) ────────────

const BOX_DRAWING_RE = /[\u2500-\u257F]/

function hasBoxDrawing(text: string): boolean {
  return BOX_DRAWING_RE.test(text)
}

// ── Pre-process content: wrap ASCII art lines in plaintext code blocks ──
// This lets ReactMarkdown handle normal markdown (bold, lists, headers)
// while ASCII diagrams render in monospace.

function wrapAsciiArtCodeBlocks(content: string): string {
  const lines = content.split("\n")
  const result: string[] = []
  let inArt = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isArtLine = hasBoxDrawing(line)

    if (isArtLine && !inArt) {
      // Ensure blank line before opening fence (unless at start)
      if (result.length > 0 && result[result.length - 1] !== "") {
        result.push("")
      }
      result.push("```plaintext")
      inArt = true
    } else if (!isArtLine && inArt) {
      result.push("```")
      // Ensure blank line after closing fence
      if (line !== "") {
        result.push("")
      }
      inArt = false
    }

    result.push(line)
  }

  // Close any unclosed fence
  if (inArt) {
    result.push("```")
  }

  return result.join("\n")
}

// ── Message body — renders markdown only when NOT streaming ────────
// During active streaming we render raw text to avoid re-parsing the
// entire markdown AST on every token (ReactMarkdown is expensive).
// When streaming ends (or there's no streaming), we show full markdown.

function MessageBody({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  // Pre-process: wrap ASCII art sections in ```plaintext code blocks so
  // ReactMarkdown renders them in monospace without mangling markdown text.
  const processed = wrapAsciiArtCodeBlocks(content)

  // During active streaming, render raw text for speed
  if (isStreaming && content) {
    return (
      <div className="max-w-none leading-relaxed">
        <div className="whitespace-pre-wrap text-base leading-relaxed">
          {content}
          <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 align-text-bottom animate-pulse" />
        </div>
      </div>
    )
  }

  // Streaming but no content yet — just show cursor
  if (isStreaming && !content) {
    return (
      <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 align-text-bottom animate-pulse" />
    )
  }

  // Finished streaming — full markdown render
  return (
    <div className="max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-1 [&_li]:leading-relaxed [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h4]:mt-3 [&_h4]:mb-1 [&_blockquote]:my-3 [&_hr]:my-6 [&_table]:my-4 [&_pre]:my-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {processed}
      </ReactMarkdown>
    </div>
  )
}

// ── Time formatter ────────────────────────────────────────────────────────

function formatTime(ts: number | undefined): string | null {
  if (!ts || isNaN(ts)) return null
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return null
  }
}

// ── Main component (memoized) ─────────────────────────────────────────────

function ChatMessageRaw({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isTool = message.role === "tool"
  const hasContent = !!message.content?.trim()
  const hasReasoning = !!message.reasoning?.trim()
  const hasToolCalls = !!message.toolCalls?.length
  const timeLabel = formatTime(message.timestamp)

  // Minimal render for tool messages and reasoning-only assistant messages
  const isMinimal = isTool || (!isUser && !hasContent && (hasReasoning || hasToolCalls))

  if (isMinimal) {
    return (
      <div className="px-4 py-1">
        <div className="flex flex-col gap-1">
          {hasReasoning && <ThinkingCard reasoning={message.reasoning!} isStreaming={message.isStreaming} startedAt={message.reasoningStartedAt} endedAt={message.reasoningEndedAt} />}
          {!isTool && hasToolCalls && <ToolInvocationCard tools={message.toolCalls} />}
          {isTool && <ToolCard name={message.toolName || ""} content={message.content} />}
        </div>
        {timeLabel && <span className="mt-0.5 text-[10px] text-muted-foreground/40">{timeLabel}</span>}
      </div>
    )
  }

  return (
    <div className={cn("flex px-4", isUser ? "py-2 justify-end" : "py-4 justify-start")}>
      <div className={cn("flex min-w-0 flex-col", isUser ? "max-w-[85%] items-end" : "w-full")}>
        {message.isStreaming && !hasContent && !hasReasoning ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground py-1">
            <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking...
          </span>
        ) : (
          <div className="flex flex-col gap-1 w-full">
            {hasReasoning && <ThinkingCard reasoning={message.reasoning!} isStreaming={message.isStreaming} startedAt={message.reasoningStartedAt} endedAt={message.reasoningEndedAt} />}
            {!isTool && !isUser && hasToolCalls && <ToolInvocationCard tools={message.toolCalls} />}
            {hasContent && (isUser ? (
              <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-x-auto bg-primary text-primary-foreground">
                <MessageBody
                  content={message.content}
                  isStreaming={message.isStreaming}
                />
              </div>
            ) : (
              <div className="text-base leading-relaxed">
                <MessageBody
                  content={message.content}
                  isStreaming={message.isStreaming}
                />
              </div>
            ))}
          </div>
        )}
        {hasContent && !isUser && (
          <div className="mt-1 flex items-center gap-2 px-1">
            <BubbleCopyButton text={message.content} />
          </div>
        )}
        {timeLabel && <span className="mt-1 text-[10px] text-muted-foreground/50 px-1">{timeLabel}</span>}
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageRaw)
