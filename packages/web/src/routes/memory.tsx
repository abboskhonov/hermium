import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState, useCallback } from "react"
import { fetchMemory, saveMemory } from "@/api/hermes/memory"
import type { MemoryData } from "@hermium/shared"
import { Button } from "@/components/ui/button"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { IconBrain, IconUser, IconSparkles, IconPencil, IconLoader2, IconRefresh } from "@tabler/icons-react"
import MarkdownMessage from "@/components/hermes/chat/MarkdownMessage"

export const Route = createFileRoute("/memory")({
  component: MemoryPage,
})

type SectionKey = "memory" | "user" | "soul"

const sectionMeta: Record<
  SectionKey,
  { title: string; icon: React.ReactNode; empty: string; placeholder: string }
> = {
  memory: {
    title: "My Notes",
    icon: <IconSparkles className="size-4" />,
    empty: "No notes yet. Write down things you want the AI to remember.",
    placeholder: "Write anything you want the AI to remember about this conversation, context, or preferences...",
  },
  user: {
    title: "User Profile",
    icon: <IconUser className="size-4" />,
    empty: "No user profile. Add details about yourself.",
    placeholder: "Describe yourself — your role, expertise, preferences, communication style...",
  },
  soul: {
    title: "Soul",
    icon: <IconBrain className="size-4" />,
    empty: "No soul defined. Set the AI's personality and behavior.",
    placeholder: "Define the AI's personality, tone, expertise, and how it should behave...",
  },
}

function formatTime(ts: number | null): string {
  if (!ts) return ""
  try {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

function MemorySection({
  section,
  data,
  onSave,
}: {
  section: SectionKey
  data: MemoryData
  onSave: (section: SectionKey, content: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const meta = sectionMeta[section]
  const raw = data[section]
  const mtime = data[`${section}_mtime` as keyof MemoryData] as number | null
  const isEmpty = !raw.trim()

  const startEdit = () => {
    setContent(raw)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setContent("")
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(section, content)
      setEditing(false)
    } catch (err) {
      console.error("Failed to save memory:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{meta.icon}</span>
          <span className="text-sm font-medium">{meta.title}</span>
          {mtime ? (
            <span className="text-[10px] text-muted-foreground/60 ml-1">
              {formatTime(mtime)}
            </span>
          ) : null}
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <IconLoader2 className="size-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={startEdit}
          >
            <IconPencil className="size-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={meta.placeholder}
          spellCheck={false}
          className="flex-1 min-h-0 w-full resize-none border-0 bg-transparent px-3 py-3 text-sm leading-relaxed outline-none focus-visible:ring-0 font-mono"
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground italic">{meta.empty}</p>
          ) : (
            <MarkdownMessage content={raw.replace(/§/g, "\n\n")} />
          )}
        </div>
      )}
    </div>
  )
}

function MemoryPage() {
  const [data, setData] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const load = useCallback(async () => {
    try {
      const d = await fetchMemory()
      setData(d)
    } catch (err) {
      console.error("Failed to load memory:", err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const handleSave = async (section: SectionKey, content: string) => {
    await saveMemory(section, content)
    await load()
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading memory…
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Failed to load memory.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {isCollapsed && (
            <SidebarTrigger
              className={cn(
                "mr-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              )}
            />
          )}
          <IconBrain className="size-5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Memory</h2>
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
          {refreshing ? (
            <IconLoader2 className="size-3 animate-spin" />
          ) : (
            <IconRefresh className="size-3" />
          )}
          Refresh
        </Button>
      </header>

      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
          <MemorySection section="memory" data={data} onSave={handleSave} />
          <MemorySection section="user" data={data} onSave={handleSave} />
          <MemorySection section="soul" data={data} onSave={handleSave} />
        </div>
      </div>
    </div>
  )
}
