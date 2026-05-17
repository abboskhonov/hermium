import { cn } from "@/lib/utils"
import { useChatStore } from "@/features/chat/store"

interface ContextCircleProps {
  sessionId?: string | null
  /** Light theme variant — adjusts colors for dark text backgrounds */
  light?: boolean
}

const FALLBACK_CONTEXT_LIMIT = 256_000
const CIRCLE_SIZE = 26
const STROKE_WIDTH = 3
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function ContextCircle({ sessionId, light = false }: ContextCircleProps) {
  const sessions = useChatStore((s) => s.sessions)
  const session = sessionId
    ? sessions.find((sx) => sx.id === sessionId)
    : null

  const inputTokens = session?.inputTokens ?? 0
  const outputTokens = session?.outputTokens ?? 0
  const reasoningTokens = session?.reasoningTokens ?? 0
  const used = inputTokens + outputTokens + reasoningTokens
  // Use session's context_length from API, fall back to 256K
  const limit = session?.contextLength || FALLBACK_CONTEXT_LIMIT
  const pct = Math.min((used / limit) * 100, 100)
  const isEmpty = used === 0

  const strokeColor =
    pct > 80 ? "stroke-red-500"
    : pct > 50 ? "stroke-amber-500"
    : isEmpty ? (light ? "stroke-white/20" : "stroke-muted-foreground/20")
    : "stroke-emerald-500"

  const trackColor = light
    ? "stroke-white/10"
    : "stroke-muted-foreground/15"

  const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE

  return (
    <div
      className="relative flex items-center justify-center cursor-default"
      title={isEmpty ? "No tokens used" : `${fmt(used)} / ${fmt(limit)} tokens · ${pct.toFixed(0)}%`}
    >
      <svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
        className="-rotate-90 shrink-0"
      >
        {/* Background track */}
        <circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className={cn(trackColor, "transition-colors")}
        />
        {/* Foreground arc */}
        <circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className={cn(strokeColor, "transition-all duration-300 ease-out")}
        />
      </svg>
      {/* Center text — only show when > 0% to keep it clean */}
      {!isEmpty && (
        <span
          className={cn(
            "absolute text-[9px] font-semibold tabular-nums leading-none pointer-events-none select-none",
            pct > 80 ? "text-red-400"
            : pct > 50 ? "text-amber-400"
            : "text-emerald-400",
          )}
        >
          {pct >= 99.5 ? "99" : Math.round(pct)}
        </span>
      )}
    </div>
  )
}
