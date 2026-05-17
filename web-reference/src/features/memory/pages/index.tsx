import { useState, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { fetchMemory, saveMemory } from "../apis"
import type { MemoryData, MemorySection } from "../types"
import {
  IconBrain,
  IconUser,
  IconPencil,
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react"

const SECTIONS: { key: MemorySection; label: string; icon: typeof IconBrain; desc: string; emptyLabel: string }[] = [
  { key: "memory", label: "My Notes", icon: IconBrain, desc: "Personal notes & knowledge", emptyLabel: "No notes yet — click Edit to start writing." },
  { key: "user", label: "User Profile", icon: IconUser, desc: "About you & your context", emptyLabel: "No profile yet — click Edit to add details about yourself." },
]

// ── Markdown component overrides ──────────────────────────────────────────

const markdownComponents = {
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-600/60 transition-colors">
        {children}
      </a>
    )
  },
  img({ src, alt }: { src?: string; alt?: string }) {
    return <img src={src} alt={alt} className="rounded-xl max-w-full my-4" loading="lazy" />
  },
}

// ── Main component ────────────────────────────────────────────────────────

export function MemoryPage() {
  const [data, setData] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeSection, setActiveSection] = useState<MemorySection>("memory")
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMemory()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load memory")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const activeContent = data
    ? activeSection === "memory" ? data.memory : data.user
    : ""

  const activeMtime = data
    ? activeSection === "memory" ? data.memory_mtime : data.user_mtime
    : null

  const activeMeta = SECTIONS.find((s) => s.key === activeSection)!

  const handleEdit = () => {
    setEditContent(activeContent)
    setSaveError(null)
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await saveMemory(activeSection, editContent)
      const updated = await fetchMemory()
      setData(updated)
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const switchSection = (section: MemorySection) => {
    if (editing) {
      if (!confirm("You have unsaved changes. Discard them?")) return
      setEditing(false)
    }
    setActiveSection(section)
    setSaveError(null)
  }

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading memory...</span>
        </div>
      </div>
    )
  }

  // ── Error state ──

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconAlertCircle className="size-8 text-red-500" />
          <span className="text-sm">{error}</span>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
          >
            <IconRefresh className="size-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Main layout ──

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar navigation ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border">
        {/* Sidebar header — matching DashboardSidebar header style */}
        <div className="flex items-center gap-2.5 px-3 py-3.5">
          <IconBrain className="size-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Memory</span>
        </div>

        {/* Section list — matching SettingsGroup item styling */}
        <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = activeSection === s.key
            return (
              <button
                key={s.key}
                onClick={() => switchSection(s.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-foreground" : "text-muted-foreground/60")} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.label}</div>
                  <div className="truncate text-[10px] text-muted-foreground/70">{s.desc}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-8">
          {/* Header — matching SettingsPage header */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {activeMeta.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeMeta.desc}
                </p>
                {activeMtime && !editing && (
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Last modified {new Date(activeMtime * 1000).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <IconX className="size-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        saving && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {saving ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : (
                        <IconCheck className="size-4" />
                      )}
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <IconPencil className="size-4" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 px-4 py-2.5">
              <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <IconAlertCircle className="size-3.5 shrink-0" />
                {saveError}
              </p>
            </div>
          )}

          {/* Content card */}
          <div className="rounded-xl border border-border bg-card p-8">
            {editing ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={cn(
                    "w-full min-h-[420px] rounded-lg border border-border bg-background p-4 font-mono text-sm leading-relaxed",
                    "focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40",
                    "resize-y placeholder:text-muted-foreground/30",
                  )}
                  placeholder={`Write your ${activeMeta.label.toLowerCase()} using Markdown...`}
                  spellCheck={false}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Markdown formatting is supported — headers, lists, code blocks, links, and more.
                </p>
              </div>
            ) : activeContent ? (
              <div
                className={cn(
                  "max-w-none",
                  // Headings — generous spacing for readability
                  "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-foreground",
                  "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
                  "[&_h3]:mt-6 [&_h3]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
                  "[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_h4]:text-foreground",
                  "[&_h5]:mt-4 [&_h5]:mb-1.5 [&_h5]:text-sm [&_h5]:font-medium [&_h5]:text-foreground/90",
                  "[&_h6]:mt-4 [&_h6]:mb-1.5 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:text-muted-foreground",
                  // Paragraphs
                  "[&_p]:my-4 [&_p]:leading-[1.75] [&_p]:text-foreground/85",
                  // Lists — proper indentation and spacing
                  "[&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:marker:text-muted-foreground/40",
                  "[&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:marker:text-muted-foreground/40",
                  "[&_li]:leading-relaxed [&_li]:text-foreground/85",
                  // Inline code
                  "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted/70 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[13px] [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-foreground/90 [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border/50",
                  // Code blocks
                  "[&_pre]:my-5 [&_pre]:rounded-xl [&_pre]:bg-muted/50 [&_pre]:border [&_pre]:border-border/60 [&_pre]:px-5 [&_pre]:py-4 [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:whitespace-pre-wrap",
                  // Blockquotes
                  "[&_blockquote]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-amber-400 dark:[&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:leading-relaxed",
                  // Horizontal rules
                  "[&_hr]:my-8 [&_hr]:border-border/40",
                  // Tables
                  "[&_table]:w-full [&_table]:my-4 [&_table]:text-sm",
                  "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground/80 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider",
                  "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-foreground/80",
                  // Images
                  "[&_img]:rounded-xl [&_img]:my-5 [&_img]:max-w-full",
                  // First/last margin reset
                  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {activeContent}
                </ReactMarkdown>
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                  <activeMeta.icon className="size-6 text-muted-foreground/30" />
                </div>
                <div className="text-center max-w-xs">
                  <p className="text-sm font-medium text-foreground/70">
                    {activeMeta.emptyLabel}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1.5">
                    You can format your content with Markdown — headers, lists, code blocks, and more.
                  </p>
                </div>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground/80 transition-colors"
                >
                  <IconPencil className="size-3.5" />
                  Start Editing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
