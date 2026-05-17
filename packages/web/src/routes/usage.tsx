import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState, useCallback, useMemo } from "react"
import { fetchUsageStats, type UsageStatsResponse, type UsageStatsDailyRow } from "@/api/hermes/usage"
import { Button } from "@/components/ui/button"
import { IconChartBar, IconLoader2, IconRefresh } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/usage")({
  component: UsagePage,
})

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
]

const MODEL_COLORS = [
  "#4fd1c5",
  "#63b3ed",
  "#f6ad55",
  "#b794f4",
  "#68d391",
  "#fc8181",
  "#f687b3",
  "#90cdf4",
  "#fbd38d",
  "#9ae6b4",
]

function getModelColor(model: string): string {
  let hash = 0
  for (let i = 0; i < model.length; i++) {
    hash = ((hash << 5) - hash) + model.charCodeAt(i)
    hash |= 0
  }
  return MODEL_COLORS[Math.abs(hash) % MODEL_COLORS.length]
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0.0%"
  return `${((part / total) * 100).toFixed(1)}%`
}

// ── Stat Card ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground/70">{sub}</span>}
    </div>
  )
}

// ── Model Breakdown ──────────────────────────────────────

function ModelBreakdown({
  models,
  totalTokens,
}: {
  models: UsageStatsResponse["model_usage"]
  totalTokens: number
}) {
  if (!models.length) return null
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium">Model Breakdown</h3>
      <div className="flex flex-col gap-2.5">
        {models.map((m) => {
          const color = getModelColor(m.model)
          const modelTotal = m.input_tokens + m.output_tokens + m.cache_read_tokens
          return (
            <div key={m.model} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate font-medium">{m.model || "unknown"}</span>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {formatNumber(modelTotal)} tokens · {formatPercent(modelTotal, totalTokens)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: formatPercent(modelTotal, totalTokens), backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Daily Bar Chart ──────────────────────────────────────

function DailyChart({ days }: { days: UsageStatsDailyRow[] }) {
  const maxTotal = useMemo(
    () => Math.max(...days.map((d) => d.input_tokens + d.output_tokens + d.cache_read_tokens), 1),
    [days],
  )

  const [hovered, setHovered] = useState<{ day: UsageStatsDailyRow; index: number } | null>(null)

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-medium">Daily Activity</h3>
      <div className="relative">
        <div className="flex items-end gap-[2px] h-[140px]">
          {days.map((day, i) => {
            const total = day.input_tokens + day.output_tokens + day.cache_read_tokens
            const heightPct = total > 0 ? Math.max(2, (total / maxTotal) * 100) : 0
            const inputPct = total > 0 ? (day.input_tokens / total) * 100 : 0
            const outputPct = total > 0 ? (day.output_tokens / total) * 100 : 0
            const cachePct = total > 0 ? (day.cache_read_tokens / total) * 100 : 0

            return (
              <div
                key={day.date}
                className="flex-1 min-w-[3px] relative group"
                onMouseEnter={() => setHovered({ day, index: i })}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="h-full flex items-end bg-muted/40 rounded-t-sm overflow-hidden">
                  <div
                    className="w-full flex flex-col-reverse rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%` }}
                  >
                    {cachePct > 0 && (
                      <div className="w-full min-h-[1px]" style={{ flex: cachePct, backgroundColor: "#b794f4" }} />
                    )}
                    {outputPct > 0 && (
                      <div className="w-full min-h-[1px]" style={{ flex: outputPct, backgroundColor: "#f6ad55" }} />
                    )}
                    {inputPct > 0 && (
                      <div className="w-full min-h-[1px]" style={{ flex: inputPct, backgroundColor: "#4fd1c5" }} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tooltip */}
        {hovered && (
          <div
            className={cn(
              "absolute top-2 z-10 rounded-lg border bg-popover px-3 py-2 shadow-lg text-xs pointer-events-none",
              hovered.index >= days.length / 2 ? "right-2" : "left-2",
            )}
          >
            <div className="font-medium mb-1">{hovered.day.date}</div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5 text-muted-foreground">
              <span className="size-2 rounded-full self-center" style={{ backgroundColor: "#4fd1c5" }} />
              <span>Input</span>
              <span className="text-foreground font-medium">{formatNumber(hovered.day.input_tokens)}</span>
              <span className="size-2 rounded-full self-center" style={{ backgroundColor: "#f6ad55" }} />
              <span>Output</span>
              <span className="text-foreground font-medium">{formatNumber(hovered.day.output_tokens)}</span>
              <span className="size-2 rounded-full self-center" style={{ backgroundColor: "#b794f4" }} />
              <span>Cache</span>
              <span className="text-foreground font-medium">{formatNumber(hovered.day.cache_read_tokens)}</span>
            </div>
            <div className="mt-1 pt-1 border-t text-foreground font-medium flex justify-between">
              <span>Total</span>
              <span>{formatNumber(hovered.day.input_tokens + hovered.day.output_tokens + hovered.day.cache_read_tokens)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1.5">
          <span>{days[0]?.date.slice(5)}</span>
          <span>{days[days.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#4fd1c5" }} />
          Input
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#f6ad55" }} />
          Output
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#b794f4" }} />
          Cache
        </span>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────

function UsagePage() {
  const [data, setData] = useState<UsageStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState(30)

  const load = useCallback(
    async (d = days) => {
      try {
        const res = await fetchUsageStats(d)
        setData(res)
      } catch (err) {
        console.error("Failed to load usage stats:", err)
      }
    },
    [days],
  )

  useEffect(() => {
    setLoading(true)
    load(days).finally(() => setLoading(false))
  }, [days, load])

  const totalTokens = data ? data.total_input_tokens + data.total_output_tokens + data.total_cache_read_tokens : 0

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <IconChartBar className="size-5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Usage</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                  days === p.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setRefreshing(true)
              load().finally(() => setRefreshing(false))
            }}
            disabled={refreshing}
          >
            {refreshing ? <IconLoader2 className="size-3 animate-spin" /> : <IconRefresh className="size-3" />}
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading usage stats…
            </span>
          </div>
        ) : !data || data.total_sessions === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">No usage data yet. Start chatting!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Tokens"
                value={formatNumber(totalTokens)}
                sub={`${data.period_days} days`}
              />
              <StatCard
                label="Input Tokens"
                value={formatNumber(data.total_input_tokens)}
                sub={formatPercent(data.total_input_tokens, totalTokens)}
              />
              <StatCard
                label="Output Tokens"
                value={formatNumber(data.total_output_tokens)}
                sub={formatPercent(data.total_output_tokens, totalTokens)}
              />
              <StatCard
                label="Sessions"
                value={formatNumber(data.total_sessions)}
              />
            </div>

            {/* Daily chart + Model breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
              <DailyChart days={data.daily_usage} />
              <ModelBreakdown models={data.model_usage} totalTokens={totalTokens} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
