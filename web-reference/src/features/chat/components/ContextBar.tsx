import { cn } from "@/lib/utils"
import { useChatStore } from "@/features/chat/store"

const FALLBACK_CONTEXT_LIMIT = 256_000

interface ContextBarProps {
  sessionId?: string | null
}

export function ContextBar({ sessionId }: ContextBarProps) {
  const sessions = useChatStore((s) => s.sessions)
  const session = sessionId
    ? sessions.find((sx) => sx.id === sessionId)
    : null

  const inputTokens = session?.inputTokens ?? 0
  const outputTokens = session?.outputTokens ?? 0
  const reasoningTokens = (session as any)?.reasoningTokens ?? 0
  const used = inputTokens + outputTokens + reasoningTokens
  const limit = session?.contextLength || FALLBACK_CONTEXT_LIMIT
  const pct = Math.min((used / limit) * 100, 100)

  if (used === 0) return null

  const barColor =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        {used.toLocaleString()} / {limit.toLocaleString()}
      </span>
    </div>
  )
}
