import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { fetchUsage } from "../apis"
import type { InsightsResponse } from "../types"
import {
  IconChartBar,
  IconRefresh,
} from "@tabler/icons-react"

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return n > 0 ? `$${n.toFixed(6)}` : "$0.00"
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function fmtDate(day: string): string {
  try {
    const d = new Date(day + "T00:00:00")
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return day
  }
}

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
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground/70">{label}</span>
      <span className="text-xl font-semibold text-foreground tracking-tight">{value}</span>
      {sub && <span className="text-xs text-muted-foreground/50">{sub}</span>}
    </div>
  )
}

function ModelBreakdown({ models }: { models: InsightsResponse["models"] }) {
  if (models.length === 0) return null
  const total = models.reduce((s, m) => s + m.sessions, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Model Breakdown</h3>
      <div className="space-y-2.5">
        {models.map((m) => (
          <div key={m.model} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground truncate">{m.model}</span>
                <span className="text-sm text-muted-foreground tabular-nums ml-3">{m.sessions}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/50 transition-all"
                  style={{ width: `${total > 0 ? (m.sessions / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DailyTable({ daily }: { daily: InsightsResponse["daily_tokens"] }) {
  if (daily.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <IconChartBar className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Daily Usage (Last 30 Days)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-t border-border text-muted-foreground/60">
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-right px-2 py-2 font-medium">Input</th>
              <th className="text-right px-2 py-2 font-medium">Output</th>
              <th className="text-right px-2 py-2 font-medium">Cache Hit Rate</th>
              <th className="text-right px-2 py-2 font-medium">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.date} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-foreground font-medium whitespace-nowrap">
                  {fmtDate(d.date)}
                </td>
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                  {d.input_tokens > 0 ? fmt(d.input_tokens) : "—"}
                </td>
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                  {d.output_tokens > 0 ? fmt(d.output_tokens) : "—"}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums"
                    style={{ color: d.cache_hit_rate > 0.8 ? "#22c55e" : d.cache_hit_rate > 0.5 ? "#eab308" : "inherit" }}>
                  {d.cache_hit_rate > 0 ? fmtPct(d.cache_hit_rate) : "—"}
                </td>
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                  {d.sessions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function UsagePage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchUsage(days)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Usage</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setDays(p.days)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    days === p.days
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center justify-center rounded-md size-7 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="size-5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Top stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Tokens"
                value={data.total_tokens > 0 ? fmt(data.total_tokens) : "—"}
                sub={data.total_tokens > 0 ? `${fmt(data.total_input_tokens)} Input / ${fmt(data.total_output_tokens)} Output` : undefined}
              />
              <StatCard
                label="Total Sessions"
                value={String(data.total_sessions)}
                sub={data.total_sessions > 0 ? `~${(data.total_sessions / days).toFixed(1)}/day avg` : undefined}
              />
              <StatCard
                label="Est. Cost"
                value={fmtCost(data.total_cost)}
              />
              <StatCard
                label="Cache Hit Rate"
                value={data.cache_hit_rate > 0 ? fmtPct(data.cache_hit_rate) : "—"}
                sub={data.total_cache_read > 0 ? `${fmt(data.total_cache_read)} Tokens` : undefined}
              />
            </div>

            {/* Model breakdown */}
            <ModelBreakdown models={data.models} />

            {/* Daily usage table */}
            <DailyTable daily={data.daily_tokens} />

            {data.daily_tokens.length === 0 && data.models.length === 0 && (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <IconChartBar className="size-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">No usage data available</p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                  Start a conversation to see usage stats.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
