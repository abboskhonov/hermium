import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { fetchUsageStats, type UsageStatsResponse } from "@/api/hermes/usage"

export const Route = createFileRoute("/usage")({
  component: UsagePage,
})

const MODEL_COLORS = [
  "#4fd1c5", "#63b3ed", "#f6ad55", "#b794f4", "#68d391",
  "#fc8181", "#f687b3", "#90cdf4", "#fbd38d", "#9ae6b4",
]

function normalizeModel(model: string | null | undefined): string {
  return (model || "").trim() || "unknown"
}

function getModelColor(model: string): string {
  const normalized = normalizeModel(model)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i)
    hash |= 0
  }
  return MODEL_COLORS[Math.abs(hash) % MODEL_COLORS.length]
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function formatCost(n: number): string {
  if (n === 0) return "$0.00"
  if (n < 0.01) return "<$0.01"
  return "$" + n.toFixed(2)
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function cacheHitRate(input: number, cacheRead: number): string {
  const total = input + cacheRead
  if (total === 0) return "--"
  return ((cacheRead / total) * 100).toFixed(1) + "%"
}

function useUsageStats(days = 30) {
  const [stats, setStats] = useState<UsageStatsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchUsageStats(days)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  return { stats, loading }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

function StatCards({ stats }: { stats: UsageStatsResponse }) {
  const totalTokens = stats.total_input_tokens + stats.total_output_tokens
  const totalCache = stats.total_cache_read_tokens
  const cacheRate = totalTokens + totalCache > 0
    ? ((totalCache / (stats.total_input_tokens + totalCache)) * 100).toFixed(1) + "%"
    : "--"

  const daysWithActivity = stats.daily_usage.filter((d) => d.sessions > 0).length
  const avgPerDay = daysWithActivity > 0 ? (stats.total_sessions / daysWithActivity).toFixed(1) : "0.0"

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <StatCard
        label="Total Tokens"
        value={formatTokens(totalTokens)}
        sub={`${formatTokens(stats.total_input_tokens)} input / ${formatTokens(stats.total_output_tokens)} output`}
      />
      <StatCard label="Total Sessions" value={String(stats.total_sessions)} sub={`${avgPerDay} avg/day`} />
      <StatCard label="Estimated Cost" value={formatCost(stats.total_cost ?? 0)} />
      <StatCard label="Cache Hit Rate" value={cacheRate} sub={totalCache > 0 ? `${formatTokens(totalCache)} tokens` : undefined} />
    </div>
  )
}

function DailyTrend({ stats }: { stats: UsageStatsResponse }) {
  const daily = useMemo(() => {
    return (stats.daily_usage ?? []).map((d) => {
      const visual = d.input_tokens + d.output_tokens + d.cache_read_tokens
      return {
        ...d,
        visualTokens: visual,
        inputPercent: percent(d.input_tokens, visual),
        outputPercent: percent(d.output_tokens, visual),
        cachePercent: percent(d.cache_read_tokens, visual),
      }
    })
  }, [stats])

  const maxTokens = useMemo(() => Math.max(...daily.map((d) => d.visualTokens), 1), [daily])

  if (daily.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4 mb-5">
      <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Daily Trend</h3>

      <div className="flex gap-0.5 mb-2">
        {daily.map((d) => (
          <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center relative group">
            <div className="w-full h-36 bg-muted/40 rounded-t-sm flex items-end overflow-hidden">
              <div
                className="w-full flex flex-col-reverse justify-start transition-all"
                style={{ height: `${(d.visualTokens / maxTokens) * 100}%` }}
              >
                {d.output_tokens > 0 && (
                  <div className="w-full bg-emerald-500/80" style={{ height: `${d.outputPercent}%` }} />
                )}
                {d.input_tokens > 0 && (
                  <div className="w-full bg-indigo-500/80" style={{ height: `${d.inputPercent}%` }} />
                )}
                {d.cache_read_tokens > 0 && (
                  <div className="w-full bg-amber-400/80" style={{ height: `${d.cachePercent}%` }} />
                )}
              </div>
            </div>
            {/* Tooltip */}
            <div className="hidden group-hover:block absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[11px] whitespace-nowrap z-10 rounded-md border px-2 py-1.5 shadow-md">
              <div className="font-semibold mb-0.5">{d.date}</div>
              <div>Input: {formatTokens(d.input_tokens)}</div>
              <div>Output: {formatTokens(d.output_tokens)}</div>
              <div>Cache read: {formatTokens(d.cache_read_tokens)}</div>
              <div>Cache write: {formatTokens(d.cache_write_tokens)}</div>
              <div>Hit rate: {cacheHitRate(d.input_tokens, d.cache_read_tokens)}</div>
              <div>Sessions: {d.sessions}</div>
              <div>Cost: {formatCost(d.cost ?? 0)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
        <span>{daily[0]?.date.slice(5)}</span>
        <span>{daily[daily.length - 1]?.date.slice(5)}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-4">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500/80" /> Input</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/80" /> Output</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/80" /> Cache read</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="pb-1.5 pr-2 font-medium">Date</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Input</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Output</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Cache read</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Cache write</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Hit rate</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Sessions</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {[...daily].reverse().map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1.5 pr-2">{d.date}</td>
                <td className="py-1.5 pr-2 text-right">{formatTokens(d.input_tokens)}</td>
                <td className="py-1.5 pr-2 text-right">{formatTokens(d.output_tokens)}</td>
                <td className="py-1.5 pr-2 text-right">{formatTokens(d.cache_read_tokens)}</td>
                <td className="py-1.5 pr-2 text-right">{formatTokens(d.cache_write_tokens)}</td>
                <td className="py-1.5 pr-2 text-right">{cacheHitRate(d.input_tokens, d.cache_read_tokens)}</td>
                <td className="py-1.5 pr-2 text-right">{d.sessions}</td>
                <td className="py-1.5 pr-2 text-right">{formatCost(d.cost ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModelBreakdown({ stats }: { stats: UsageStatsResponse }) {
  const models = useMemo(() => {
    return (stats.model_usage ?? []).map((m) => {
      const total = m.input_tokens + m.output_tokens
      const visual = total + m.cache_read_tokens
      return {
        model: normalizeModel(m.model),
        inputTokens: m.input_tokens,
        outputTokens: m.output_tokens,
        cacheTokens: m.cache_read_tokens,
        cacheWriteTokens: m.cache_write_tokens,
        totalTokens: total,
        visualTokens: visual,
        sessions: m.sessions,
        color: getModelColor(m.model),
        inputPercent: percent(m.input_tokens, visual),
        outputPercent: percent(m.output_tokens, visual),
        cachePercent: percent(m.cache_read_tokens, visual),
      }
    }).sort((a, b) => b.visualTokens - a.visualTokens)
  }, [stats])

  const maxTokens = useMemo(() => Math.max(...models.map((m) => m.visualTokens), 1), [models])

  if (models.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4 mb-5">
      <h3 className="text-sm font-semibold text-secondary-foreground mb-3">Model Breakdown</h3>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500/80" /> Input</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/80" /> Output</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/80" /> Cache read</span>
      </div>

      <div className="flex flex-col gap-2">
        {models.map((m) => (
          <div key={m.model} className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: m.color }} />
            <span className="text-xs font-mono text-secondary-foreground w-32 shrink-0 truncate" title={m.model}>{m.model}</span>
            <div className="flex-1 h-4 bg-muted/40 rounded-sm overflow-hidden">
              <div className="h-full flex min-w-[2px] transition-all" style={{ width: `${(m.visualTokens / maxTokens) * 100}%` }}>
                {m.inputTokens > 0 && <div className="h-full bg-indigo-500/80" style={{ width: `${m.inputPercent}%` }} />}
                {m.outputTokens > 0 && <div className="h-full bg-emerald-500/80" style={{ width: `${m.outputPercent}%` }} />}
                {m.cacheTokens > 0 && <div className="h-full bg-amber-400/80" style={{ width: `${m.cachePercent}%` }} />}
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
              {formatTokens(m.totalTokens)}
              {m.cacheTokens > 0 && <span className="text-[10px] text-amber-500 ml-1">+{formatTokens(m.cacheTokens)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsagePage() {
  const { stats, loading } = useUsageStats(30)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-lg font-semibold">Usage</h1>
          <p className="text-sm text-muted-foreground">Token consumption and cost estimates over the last 30 days.</p>
        </header>

        {loading && (
          <div className="text-sm text-muted-foreground py-8">Loading usage stats…</div>
        )}

        {!loading && !stats && (
          <div className="text-sm text-muted-foreground py-8">Failed to load usage data.</div>
        )}

        {!loading && stats && stats.total_sessions === 0 && (
          <div className="text-sm text-muted-foreground py-8">No usage data yet.</div>
        )}

        {!loading && stats && stats.total_sessions > 0 && (
          <>
            <StatCards stats={stats} />
            <ModelBreakdown stats={stats} />
            <DailyTrend stats={stats} />
          </>
        )}
      </div>
    </div>
  )
}
