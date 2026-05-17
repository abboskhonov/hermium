import { useState, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { fetchSkills, fetchSkillContent, toggleSkill } from "../apis"
import type { SkillCategory } from "../types"
import {
  IconPuzzle,
  IconSearch,
  IconX,
  IconLoader2,
  IconAlertCircle,
  IconRefresh,
  IconChevronDown,
  IconTag,
  IconLink,
  IconVersions,
} from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"

// ── Markdown component overrides ──────────────────────────────────────────

const markdownComponents = {
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-600/60 transition-colors"
      >
        {children}
      </a>
    )
  },
  img({ src, alt }: { src?: string; alt?: string }) {
    return <img src={src} alt={alt} className="rounded-xl max-w-full my-4" loading="lazy" />
  },
  pre({ children }: { children?: React.ReactNode }) {
    return <pre className="my-5 rounded-xl bg-muted/50 border border-border/60 px-5 py-4 text-[13px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap">{children}</pre>
  },
  code({ children, className }: { children?: React.ReactNode; className?: string }) {
    const isInline = !className
    if (isInline) {
      return <code className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[13px] font-mono text-foreground/90 border border-border/50">{children}</code>
    }
    return <code className={className}>{children}</code>
  },
}

// ── Main component ────────────────────────────────────────────────────────

export function SkillsPage() {
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search + selection
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [selectedSkillName, setSelectedSkillName] = useState<string | null>(null)

  // Skill detail
  const [skillContent, setSkillContent] = useState("")
  const [skillLoading, setSkillLoading] = useState(false)

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchSkills()
      setCategories(result.categories)
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Load skill content when selection changes
  useEffect(() => {
    if (!selectedCategory || !selectedSkill) {
      setSkillContent("")
      return
    }
    let cancelled = false
    setSkillLoading(true)
    fetchSkillContent(selectedCategory, selectedSkill)
      .then((res) => {
        if (!cancelled) {
          // Strip YAML frontmatter for display
          const content = res.content
          if (content.startsWith("---")) {
            const endIdx = content.indexOf("\n---", 3)
            if (endIdx !== -1) {
              setSkillContent(content.slice(endIdx + 4).trim())
            } else {
              setSkillContent(content)
            }
          } else {
            setSkillContent(content)
          }
          setSkillLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setSkillContent(e instanceof Error ? e.message : "Failed to load skill")
          setSkillLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [selectedCategory, selectedSkill])

  // Filtering
  const q = searchQuery.toLowerCase().trim()
  const filteredCategories = q
    ? categories
        .map((cat) => ({
          ...cat,
          skills: (cat.skills ?? []).filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
          ),
        }))
        .filter((cat) => cat.skills.length > 0 || cat.name.toLowerCase().includes(q))
    : categories

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectSkill = (catName: string, skillName: string, displayName: string) => {
    setSelectedCategory(catName)
    setSelectedSkill(skillName)
    setSelectedSkillName(displayName)
  }

  const handleToggle = async (catName: string, skillName: string) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name === catName
          ? {
              ...cat,
              skills: cat.skills.map((s) =>
                s.name === skillName ? { ...s, disabled: !s.disabled } : s,
              ),
            }
          : cat,
      ),
    )
    try {
      await toggleSkill(catName, skillName)
    } catch {
      // Revert on failure
      load()
    }
  }

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading skills...</span>
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
      {/* ── Left sidebar: skill tree ── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-3.5 shrink-0">
          <IconPuzzle className="size-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Skills
            {total > 0 && (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                ({total})
              </span>
            )}
          </span>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full rounded-md border border-border/60 bg-muted/30 pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
              >
                <IconX className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredCategories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No skills match your search" : "No skills found"}
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.name} className="mb-1">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <IconChevronDown
                    className={cn(
                      "size-3 shrink-0 text-muted-foreground/50 transition-transform",
                      collapsedCategories.has(cat.name) && "-rotate-90",
                    )}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                    {cat.name.replace(/-/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                    {cat.skills.length}
                  </span>
                </button>

                {!collapsedCategories.has(cat.name) && (
                  <div className="pb-1">
                    {(cat.skills ?? []).map((skill) => {
                      const isActive =
                        selectedCategory === cat.name && selectedSkill === skill.name
                      return (
                        <button
                          key={skill.name}
                          onClick={() => selectSkill(cat.name, skill.name, skill.name)}
                          className={cn(
                            "flex w-full items-start gap-2 px-3 py-1.5 pl-8 text-left transition-colors",
                            isActive
                              ? "bg-muted text-foreground"
                              : skill.disabled
                                ? "text-muted-foreground/40 hover:bg-muted/20"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                          )}
                        >
                          <div className={cn("min-w-0 flex-1", skill.disabled && "opacity-50")}>
                            <div className={cn("truncate text-xs font-medium", skill.disabled && "line-through")}>
                              {skill.name}
                            </div>
                            {skill.description && (
                              <div className="truncate text-[10px] text-muted-foreground/60 mt-0.5">
                                {skill.description}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={!skill.disabled}
                              onCheckedChange={() => handleToggle(cat.name, skill.name)}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Right panel: skill detail ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {!selectedSkill ? (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-sm text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
                <IconPuzzle className="size-7 text-muted-foreground/25" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/60">
                  Select a skill to view details
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Browse skills from your Hermes agent library. Each skill provides
                  instructions and context for specific tasks.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 border border-border/50">
                  <IconPuzzle className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">
                    {selectedSkillName}
                  </h2>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                      {selectedCategory?.replace(/-/g, " ")}
                    </span>
                    <span className="text-muted-foreground/30">/</span>
                    <span>{selectedSkillName}</span>
                  </p>
                </div>
              </div>

              {/* Tags */}
              {(() => {
                const cat = categories.find((c) => c.name === selectedCategory)
                const skill = cat?.skills.find((s) => s.name === selectedSkill)
                if (!skill) return null
                return (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {skill.version && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/40 rounded-full px-2 py-0.5">
                        <IconVersions className="size-3" />
                        v{skill.version}
                      </span>
                    )}
                    {(skill.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/40 rounded-full px-2 py-0.5"
                      >
                        <IconTag className="size-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
              {skillLoading ? (
                <div className="flex items-center justify-center py-16">
                  <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  <div
                    className={cn(
                      "prose-sm max-w-none",
                      // Headings
                      "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-foreground",
                      "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
                      "[&_h3]:mt-6 [&_h3]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
                      "[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_h4]:text-foreground",
                      // Paragraphs
                      "[&_p]:my-4 [&_p]:leading-[1.75] [&_p]:text-foreground/85",
                      // Lists
                      "[&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:marker:text-muted-foreground/40",
                      "[&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:marker:text-muted-foreground/40",
                      "[&_li]:leading-relaxed [&_li]:text-foreground/85",
                      // Blockquotes
                      "[&_blockquote]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-amber-400 dark:[&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:leading-relaxed",
                      // Horizontal rules
                      "[&_hr]:my-8 [&_hr]:border-border/40",
                      // Tables
                      "[&_table]:w-full [&_table]:my-4 [&_table]:text-sm",
                      "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground/80 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider",
                      "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-foreground/80",
                      // First/last margin reset
                      "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {skillContent}
                    </ReactMarkdown>
                  </div>

                  {/* Related skills */}
                  {(() => {
                    const cat = categories.find((c) => c.name === selectedCategory)
                    const skill = cat?.skills.find((s) => s.name === selectedSkill)
                    const relatedSkills = skill?.related_skills ?? []
                    if (!relatedSkills.length) return null
                    return (
                      <div className="mt-8 pt-6 border-t border-border">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          <IconLink className="size-3" />
                          Related Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {relatedSkills.map((related) => (
                            <span
                              key={related}
                              className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground border border-border/40"
                            >
                              {related}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
