import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, post, patch, del } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  IconClock,
  IconRefresh,
  IconChevronRight,
  IconLoader2,
  IconCalendar,
  IconPlayerPlay,
  IconPlus,
  IconPencil,
  IconTrash,
  IconPower,

} from "@tabler/icons-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface CronRun {
  jobId: string
  fileName: string
  runTime: string
  size: number
}

interface CronRunDetail {
  content: string
}

interface CronJob {
  job_id?: string; id?: string; name?: string
  prompt?: string
  schedule?: string | { kind?: string; display?: string; expr?: string }
  enabled?: boolean
  last_run_at?: string | null
  last_status?: string | null
  last_error?: string | null
  run_count?: number
  next_run_at?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function jobId(job: CronJob): string {
  return job.job_id || job.id || ""
}

function jobName(job: CronJob): string {
  return job.name || jobId(job) || "Untitled"
}

function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 2) return cron
  const minute = parseInt(parts[0], 10)
  const hour = parseInt(parts[1], 10)
  if (isNaN(minute) || isNaN(hour)) return cron

  if (parts[1] === "*") {
    return `At minute ${minute} past every hour`
  }

  const timeStr = new Date(0, 0, 0, hour, minute).toLocaleTimeString([], {
    hour: "numeric", minute: "2-digit", hour12: true,
  })

  if (parts.length >= 5) {
    const dayField = parts.slice(2, 5).join(" ")
    if (dayField === "* * 1-5") return `${timeStr} weekdays`
    if (dayField === "* * 0,6") return `${timeStr} weekends`
  }

  return `${timeStr} daily`
}

function scheduleText(schedule: CronJob["schedule"]): string {
  if (!schedule) return "—"
  if (typeof schedule === "string") return describeCron(schedule)
  const raw = schedule.display || schedule.expr || JSON.stringify(schedule)
  return describeCron(raw)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── API hooks ────────────────────────────────────────────────────────────

function useJobs() {
  return useQuery({
    queryKey: ["cron", "jobs"],
    queryFn: () => get<{ jobs: CronJob[] }>("/api/cron-history/jobs"),
    refetchInterval: 30_000,
  })
}

function useCronRuns(jobId?: string | null) {
  return useQuery({
    queryKey: ["cron", "runs", jobId],
    queryFn: () =>
      get<{ runs: CronRun[] }>(
        `/api/cron-history${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""}`,
      ),
    refetchInterval: 15_000,
  })
}

// ─── Job form ─────────────────────────────────────────────────────────────

interface JobFormData { name: string; schedule: string; prompt: string }

// ─── Schedule Picker ─────────────────────────────────────────────────────

function toCron(hour: number, minute: number, dayMode: string): string {
  if (dayMode === "hourly") return `${minute} * * * *`
  const base = `${minute} ${hour}`
  if (dayMode === "weekdays") return `${base} * * 1-5`
  if (dayMode === "weekends") return `${base} * * 0,6`
  return `${base} * * *`  // daily
}

function describeSchedule(hour: number, minute: number, dayMode: string): string {
  if (dayMode === "hourly") return `At minute ${minute} past every hour`
  const timeStr = new Date(0, 0, 0, hour, minute).toLocaleTimeString([], {
    hour: "numeric", minute: "2-digit", hour12: true,
  })
  const suffix =
    dayMode === "weekdays" ? "on weekdays" :
    dayMode === "weekends" ? "on weekends" :
    "daily"
  return `Runs ${timeStr} ${suffix}`
}

const PRESETS = [
  { label: "Every hour", dayMode: "hourly", hour: 0, minute: 0 },
  { label: "Daily 9AM", dayMode: "daily", hour: 9, minute: 0 },
  { label: "Daily noon", dayMode: "daily", hour: 12, minute: 0 },
  { label: "Daily 6PM", dayMode: "daily", hour: 18, minute: 0 },
  { label: "Weekdays 9AM", dayMode: "weekdays", hour: 9, minute: 0 },
  { label: "Weekdays noon", dayMode: "weekdays", hour: 12, minute: 0 },
]

function SchedulePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (cron: string) => void
}) {
  const [dayMode, setDayMode] = useState("daily")
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)
  const [showRaw, setShowRaw] = useState(false)
  const [rawCron, setRawCron] = useState(value || "")

  // Parse initial cron value if editing
  const parsed = useMemo(() => {
    if (!value) return null
    const parts = value.trim().split(/\s+/)
    if (parts.length < 2) return null
    const m = parseInt(parts[0], 10)
    const h = parseInt(parts[1], 10)
    if (isNaN(m) || isNaN(h)) return null
    return { hour: h, minute: m }
  }, [])

  // Initialize from parsed value on mount (editing existing job)
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !parsed) return
    initialized.current = true
    setHour(parsed.hour)
    setMinute(parsed.minute)
    const parts = value.trim().split(/\s+/)
    if (parts.length >= 5) {
      const dayField = parts.slice(2, 5).join(" ")
      if (dayField === "* * 1-5") setDayMode("weekdays")
      else if (dayField === "* * 0,6") setDayMode("weekends")
      else if (dayField === "* * *" || parts[2] === "*") setDayMode("daily")
      if (parts[1] === "*") setDayMode("hourly")
    }
    setRawCron(value)
  }, [parsed, value])

  const cronExpr = useMemo(() => toCron(hour, minute, dayMode), [hour, minute, dayMode])
  const description = useMemo(() => describeSchedule(hour, minute, dayMode), [hour, minute, dayMode])

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number)
    if (!isNaN(h)) setHour(h)
    if (!isNaN(m)) setMinute(m)
    if (dayMode === "hourly") setDayMode("daily")
  }

  const handlePreset = (preset: typeof PRESETS[number]) => {
    setHour(preset.hour)
    setMinute(preset.minute)
    setDayMode(preset.dayMode)
  }

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawCron(e.target.value)
  }

  // Sync cron expression to parent
  const effectiveCron = showRaw ? rawCron : cronExpr

  // Notify parent whenever the cron value changes
  useEffect(() => {
    onChange(effectiveCron)
  }, [effectiveCron])

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        Schedule
      </label>

      {!showRaw ? (
        <>
          {/* Time input */}
          <input
            type="time"
            value={`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
            onChange={handleTimeChange}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Days — segmented pill control */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            {[
              { value: "daily", label: "Every day" },
              { value: "weekdays", label: "Weekdays" },
              { value: "weekends", label: "Weekends" },
            ].map((d, i) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDayMode(d.value)}
                className={cn(
                  "flex-1 px-3 py-1.5 transition-colors text-center",
                  i > 0 && "border-l border-border",
                  dayMode === d.value
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  hour === p.hour && minute === p.minute && dayMode === p.dayMode
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Human-friendly description */}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <IconClock className="h-3.5 w-3.5" />
            {description}
          </p>

          {/* Cron preview + raw edit toggle */}
          <div className="flex items-center justify-between">
            <code className="text-[11px] text-muted-foreground/60 font-mono">
              {cronExpr}
            </code>
            <button
              type="button"
              onClick={() => {
                setRawCron(cronExpr)
                setShowRaw(true)
              }}
              className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground underline underline-offset-2 transition-colors"
            >
              Raw cron
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Input
            value={rawCron}
            onChange={handleRawChange}
            placeholder="0 9 * * *"
            className="h-9 text-sm font-mono"
          />
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            minute hour day month weekday
            <button
              type="button"
              onClick={() => setShowRaw(false)}
              className="underline underline-offset-2 hover:text-foreground ml-auto transition-colors"
            >
              Use time picker
            </button>
          </p>
        </div>
      )}

    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status?: string | null }) {
  if (!status) return <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
  const ok = status === "ok" || status === "success" || status === "completed"
  return <div className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} />
}

function JobCard({
  job, onEdit, onDelete, onToggle,
}: {
  job: CronJob
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 transition-colors group relative",
      job.enabled !== false ? "border-border hover:border-emerald-500/30" : "border-border opacity-60",
    )}>
      {/* Hover actions */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon-sm" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          title={job.enabled !== false ? "Disable" : "Enable"}>
          <IconPower className={cn("h-3.5 w-3.5", job.enabled !== false ? "text-emerald-500" : "text-muted-foreground")} />
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit() }} title="Edit">
          <IconPencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7 hover:text-red-500"
          onClick={(e) => { e.stopPropagation(); onDelete() }} title="Delete">
          <IconTrash className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            job.enabled !== false ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
            <IconClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate pr-20">{jobName(job)}</h3>
            <p className="text-[11px] text-muted-foreground font-mono">{scheduleText(job.schedule)}</p>
          </div>
        </div>
        <StatusDot status={job.last_status} />
      </div>

      {job.prompt && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{job.prompt}</p>
      )}

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {job.run_count != null && (
          <span className="flex items-center gap-1"><IconPlayerPlay className="h-3 w-3" />{job.run_count} runs</span>
        )}
        {job.next_run_at && (
          <span className="flex items-center gap-1"><IconCalendar className="h-3 w-3" />Next: {formatTime(job.next_run_at)}</span>
        )}
        {job.last_run_at && <span>{timeAgo(job.last_run_at)}</span>}
      </div>
    </div>
  )
}

function RunRow({ run }: { run: CronRun }) {
  const [open, setOpen] = useState(false)
  const detail = useQuery({
    queryKey: ["cron", "run", run.jobId, run.fileName],
    queryFn: () => get<CronRunDetail>(
      `/api/cron-history/${encodeURIComponent(run.jobId)}/${encodeURIComponent(run.fileName)}`),
    enabled: open,
  })

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors group">
        <IconChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="text-xs font-medium text-foreground/80 min-w-[80px]">{run.jobId}</span>
        <span className="text-xs text-muted-foreground flex-1">{run.runTime}</span>
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{formatSize(run.size)}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-10">
          {detail.isLoading ? (
            <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
              <IconLoader2 className="h-3.5 w-3.5 animate-spin" />Loading...
            </div>
          ) : (
            <pre className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap text-foreground/80 bg-muted/30 rounded-lg p-3 border border-border/50 max-h-[400px] overflow-auto">
              {detail.data?.content || "No output"}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const queryClient = useQueryClient()
  const jobs = useJobs()
  const runs = useCronRuns(null)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [formName, setFormName] = useState("")
  const [formSchedule, setFormSchedule] = useState("")
  const [formPrompt, setFormPrompt] = useState("")
  const refresh = useCallback(() => { jobs.refetch(); runs.refetch() }, [jobs, runs])

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: JobFormData) => post("/api/cron-history/jobs", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] }); setShowForm(false) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobFormData> }) =>
      patch(`/api/cron-history/jobs/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] }); setEditingJob(null); setShowForm(false) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => del(`/api/cron-history/jobs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] }),
  })
  const toggleMut = useMutation({
    mutationFn: (id: string) => post(`/api/cron-history/jobs/${id}/toggle`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] }),
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Automations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Scheduled cron jobs managed by the Hermes agent
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              setEditingJob(null)
              setFormName("")
              setFormSchedule("")
              setFormPrompt("")
              setShowForm(true)
            }}>
              <IconPlus className="h-4 w-4" />
              New Job
            </Button>
            <button onClick={refresh}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <IconRefresh className={cn("h-4 w-4", (jobs.isFetching || runs.isFetching) && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* New/Edit dialog */}
        <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingJob(null) } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Cron Job" : "New Cron Job"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Daily weather report"
                  className="h-9 text-sm"
                />
              </div>
              <SchedulePicker
                value={formSchedule}
                onChange={setFormSchedule}
              />
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prompt</label>
                <Textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="What should the agent do when this job runs?"
                  className="min-h-[80px] text-sm"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingJob(null) }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!formName.trim() || !formSchedule.trim()}
                onClick={() => {
                  const data = { name: formName.trim(), schedule: formSchedule.trim(), prompt: formPrompt.trim() }
                  if (editingJob) {
                    updateMut.mutate({ id: jobId(editingJob), data })
                  } else {
                    createMut.mutate(data)
                  }
                }}
              >
                {editingJob ? "Save Changes" : "Create Job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Job cards */}
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Jobs</h2>
          {jobs.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-36 animate-pulse">
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.data?.jobs?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.data.jobs.map((job) => (
                <JobCard key={jobId(job)} job={job}
                  onEdit={() => {
                    setEditingJob(job)
                    setFormName(job.name || "")
                    setFormSchedule(scheduleText(job.schedule))
                    setFormPrompt(job.prompt || "")
                    setShowForm(true)
                  }}
                  onDelete={() => deleteMut.mutate(jobId(job))}
                  onToggle={() => toggleMut.mutate(jobId(job))}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
              <IconClock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No cron jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <span className="font-medium">New Job</span> to create one
              </p>
            </div>
          )}
        </div>

        {/* Run history */}
        <div className="px-6 pb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">Run History</h2>
          {runs.isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
            </div>
          ) : runs.data?.runs?.length ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {runs.data.runs.slice(0, 50).map((run) => (
                <RunRow key={`${run.jobId}/${run.fileName}`} run={run} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
              <p className="text-sm text-muted-foreground">No runs yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
