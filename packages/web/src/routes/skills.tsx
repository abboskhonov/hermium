import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState, useCallback, useMemo } from "react"
import { fetchSkills, fetchSkillContent, fetchSkillFiles, toggleSkill, type SkillInfo, type SkillCategory, type SkillFileEntry } from "@/api/hermes/skills"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import MarkdownMessage from "@/components/hermes/chat/MarkdownMessage"
import {
  IconWand,
  IconSearch,
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconRefresh,
  IconPin,
  IconFile,
  IconArrowLeft,
} from "@tabler/icons-react"

export const Route = createFileRoute("/skills")({
  loader: async () => {
    const data = await fetchSkills()
    return data
  },
  component: SkillsPage,
})

type SourceFilter = "all" | "builtin" | "hub" | "local"

function SourceDot({ source }: { source?: string }) {
  const color =
    source === "builtin"
      ? "bg-muted-foreground"
      : source === "hub"
        ? "bg-blue-400"
        : "bg-emerald-400"
  return <span className={cn("size-2 rounded-full shrink-0", color)} />
}

function SkillsPage() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const data = Route.useLoaderData()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [archiveCollapsed, setArchiveCollapsed] = useState(true)

  // Detail view
  const [selected, setSelected] = useState<{ category: string; skill: string } | null>(null)
  const [skillContent, setSkillContent] = useState("")
  const [skillFiles, setSkillFiles] = useState<SkillFileEntry[]>([])
  const [skillLoading, setSkillLoading] = useState(false)
  const [viewingFile, setViewingFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState("")
  const [, setFileLoading] = useState(false)

  // Load selected skill detail
  useEffect(() => {
    if (!selected) {
      setSkillContent("")
      setSkillFiles([])
      setViewingFile(null)
      setFileContent("")
      return
    }
    setSkillLoading(true)
    const skillPath = `${selected.category}/${selected.skill}/SKILL.md`
    Promise.all([
      fetchSkillContent(skillPath),
      fetchSkillFiles(selected.category, selected.skill),
    ])
      .then(([content, files]) => {
        setSkillContent(content)
        setSkillFiles(files.filter((f) => !f.isDir))
      })
      .catch((err) => {
        setSkillContent(`Failed to load skill: ${err.message}`)
      })
      .finally(() => setSkillLoading(false))
  }, [selected])

  const filteredCategories = useMemo(() => {
    if (!data) return []
    let result = data.categories

    if (sourceFilter !== "all") {
      result = result
        .map((cat) => ({
          ...cat,
          skills: cat.skills.filter((s) => (s.source || "local") === sourceFilter),
        }))
        .filter((cat) => cat.skills.length > 0)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result
        .map((cat) => ({
          ...cat,
          skills: cat.skills.filter(
            (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
          ),
        }))
        .filter((cat) => cat.skills.length > 0 || cat.name.toLowerCase().includes(q))
    }

    return result
  }, [data, sourceFilter, search])

  const filteredArchived = useMemo(() => {
    if (!data) return []
    let result = data.archived
    if (sourceFilter !== "all") {
      result = result.filter((s) => (s.source || "local") === sourceFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    }
    return result
  }, [data, sourceFilter, search])

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleToggle = async (cat: string, name: string, enabled: boolean) => {
    try {
      await toggleSkill(name, enabled)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.name === cat
              ? { ...c, skills: c.skills.map((s) => (s.name === name ? { ...s, enabled } : s)) }
              : c,
          ),
        }
      })
    } catch (err) {
      console.error("Toggle failed:", err)
    }
  }

  const viewFile = async (filePath: string) => {
    if (!selected) return
    setFileLoading(true)
    setViewingFile(filePath)
    try {
      const base = `${selected.category}/${selected.skill}/`
      const content = await fetchSkillContent(`${base}${filePath}`)
      setFileContent(content)
    } catch (err: any) {
      setFileContent(`Failed to load file: ${err.message}`)
    } finally {
      setFileLoading(false)
    }
  }

  const backToSkill = () => {
    setViewingFile(null)
    setFileContent("")
  }

  const sourceOptions: { label: string; value: SourceFilter }[] = [
    { label: "All", value: "all" },
    { label: "Builtin", value: "builtin" },
    { label: "Hub", value: "hub" },
    { label: "Local", value: "local" },
  ]

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between border-b px-4 py-3 shrink-0 relative">
          {/* Left: back button */}
          <div className="flex items-center gap-2 z-10">
            {isCollapsed && (
              <SidebarTrigger
                className={cn(
                  "mr-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                )}
              />
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>
              <IconArrowLeft className="size-3.5 mr-1" />
              Back
            </Button>
          </div>

          {/* Center: skill name — absolutely centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[50%]">
            <span className="text-muted-foreground text-sm truncate">{selected.category}</span>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-medium truncate">{selected.skill}</span>
          </div>

          {/* Right: refresh */}
          <div className="z-10">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSkillLoading(true)
                const skillPath = `${selected.category}/${selected.skill}/SKILL.md`
                Promise.all([
                  fetchSkillContent(skillPath),
                  fetchSkillFiles(selected.category, selected.skill),
                ])
                  .then(([content, files]) => {
                    setSkillContent(content)
                    setSkillFiles(files.filter((f) => !f.isDir))
                  })
                  .finally(() => setSkillLoading(false))
              }}
              disabled={skillLoading}
            >
              {skillLoading ? <IconLoader2 className="size-3 animate-spin" /> : <IconRefresh className="size-3" />}
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {viewingFile ? (
              <>
                <button
                  onClick={backToSkill}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                >
                  <IconArrowLeft className="size-3" />
                  Back to {selected.skill}
                </button>
                <div className="text-sm text-muted-foreground mb-1">{viewingFile}</div>
                <MarkdownMessage content={fileContent} />
              </>
            ) : (
              <>
                <MarkdownMessage content={skillContent} />
                {skillFiles.length > 0 && (
                  <div className="border-t pt-4 mt-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Attached Files
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skillFiles.map((f) => (
                        <button
                          key={f.path}
                          onClick={() => viewFile(f.path)}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <IconFile className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{f.path}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar list */}
      <div className="w-80 border-r flex flex-col h-full shrink-0">
        <header className="flex items-center gap-2 border-b px-3 py-3 shrink-0">
          {isCollapsed && (
            <SidebarTrigger
              className={cn(
                "mr-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              )}
            />
          )}
          <IconWand className="size-5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Skills</h2>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setLoading(true)
              load().finally(() => setLoading(false))
            }}
            disabled={loading}
          >
            {loading ? <IconLoader2 className="size-3 animate-spin" /> : <IconRefresh className="size-3" />}
          </Button>
        </header>

        {/* Search + filter */}
        <div className="px-3 py-2 border-b flex flex-col gap-2 shrink-0">
          <div className="relative">
            <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            {sourceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceFilter(opt.value)}
                className={cn(
                  "px-2 py-0.5 text-[11px] rounded-sm transition-colors",
                  sourceFilter === opt.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !data || filteredCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? "No skills match your search." : "No skills found."}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredCategories.map((cat) => (
                <div key={cat.name} className="flex flex-col">
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {collapsed.has(cat.name) ? (
                      <IconChevronRight className="size-3 shrink-0" />
                    ) : (
                      <IconChevronDown className="size-3 shrink-0" />
                    )}
                    <span className="truncate">{cat.name}</span>
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                      {cat.skills.length}
                    </span>
                  </button>
                  {!collapsed.has(cat.name) && (
                    <div className="flex flex-col">
                      {cat.skills.map((skill) => (
                        <div
                          key={skill.name}
                          className="group flex items-center gap-2 px-2 py-1.5 pl-7 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelected({ category: cat.name, skill: skill.name })}
                        >
                          <SourceDot source={skill.source} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium truncate">{skill.name}</span>
                              {skill.modified && (
                                <span className="text-[10px] text-amber-500" title="Modified">✎</span>
                              )}
                              {skill.pinned && (
                                <IconPin className="size-3 text-amber-500 shrink-0" />
                              )}
                            </div>
                            {skill.description && (
                              <span className="text-[10px] text-muted-foreground truncate">{skill.description}</span>
                            )}
                          </div>
                          <Switch
                            checked={skill.enabled !== false}
                            onCheckedChange={(v: boolean) => handleToggle(cat.name, skill.name, v)}
                            className="scale-75 shrink-0"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Archived */}
              {(filteredArchived.length > 0 || (data?.archived.length ?? 0) > 0) && (
                <div className="flex flex-col mt-2 pt-2 border-t">
                  <button
                    onClick={() => setArchiveCollapsed(!archiveCollapsed)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {archiveCollapsed ? (
                      <IconChevronRight className="size-3 shrink-0" />
                    ) : (
                      <IconChevronDown className="size-3 shrink-0" />
                    )}
                    <span>Archived</span>
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                      {data?.archived.length ?? 0}
                    </span>
                  </button>
                  {!archiveCollapsed &&
                    filteredArchived.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center gap-2 px-2 py-1.5 pl-7 rounded-md hover:bg-muted/50 cursor-pointer transition-colors opacity-60"
                        onClick={() => setSelected({ category: ".archive", skill: skill.name })}
                      >
                        <SourceDot source={skill.source} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium truncate">{skill.name}</span>
                          {skill.description && (
                            <span className="text-[10px] text-muted-foreground truncate">{skill.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconWand className="size-12 opacity-20" />
          <p className="text-sm">Select a skill to view its details</p>
        </div>
      </div>
    </div>
  )
}
