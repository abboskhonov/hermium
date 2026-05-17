import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  IconCirclePlus,
  IconBrain,
  IconPuzzle,
  IconChartBar,
  IconHash,
  IconRobot,
  IconSettings,
  IconSun,
  IconMoon,
  IconDots,
  IconTrash,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconCopy,
  IconSearch,
  IconX,
  IconArrowLeft,
  IconPaint,
  IconBrandGithub,
  IconDownload,
} from "@tabler/icons-react"
import { Link, useLocation } from "@tanstack/react-router"
// import { Logo } from "@/components/sidebar-02/logo"
import type { Route } from "./nav-main"
import { DashboardNavigation } from "@/components/sidebar-02/nav-main"
import { useTheme } from "@/lib/theme-provider"
import { useEffect, useState, useRef, useCallback } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQueryClient } from "@tanstack/react-query"
import { useChatStore } from "@/features/chat/store"
import { deleteSessionApi, renameSession } from "@/features/chat/apis"
import { useVersionCheck, useTriggerUpdate } from "@/features/version/queries"
import type { SessionItem as SessionItemType } from "@/features/chat/types"
import { prefetchSessionMessages } from "@/features/chat/queries-session"

const dashboardRoutes: Route[] = [
  {
    id: "dashboard",
    title: "New Chat",
    icon: <IconCirclePlus className="size-4" />,
    link: "/",
  },
  {
    id: "memory",
    title: "Memory",
    icon: <IconBrain className="size-4" />,
    link: "/memory",
  },
  {
    id: "skills",
    title: "Skills",
    icon: <IconPuzzle className="size-4" />,
    link: "/skills",
  },

  {
    id: "automations",
    title: "Automations",
    icon: <IconRobot className="size-4" />,
    link: "/automations",
  },
  {
    id: "channels",
    title: "Channels",
    icon: <IconHash className="size-4" />,
    link: "/channels",
  },
  {
    id: "usage",
    title: "Usage",
    icon: <IconChartBar className="size-4" />,
    link: "/usage",
  },
]

type Panel = "main" | "settings"

function isSettingsPath(pathname: string) {
  return pathname.startsWith("/settings")
}

export function DashboardSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { resolvedTheme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const sessions = useChatStore((s) => s.sessions)
  const loadSessions = useChatStore((s) => s.loadSessions)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const deleteStoreSession = useChatStore((s) => s.deleteSession)
  const sessionsLoaded = useChatStore((s) => s.sessionsLoaded)
  const pinnedIds = useChatStore((s) => s.pinnedSessionIds)
  const togglePin = useChatStore((s) => s.togglePin)
  const prefetchSession = useCallback(
    (sid: string) => prefetchSessionMessages(queryClient, sid),
    [queryClient],
  )
  const location = useLocation()
  const currentSection = new URLSearchParams(location.search).get("section") || "appearance"
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<Panel>(
    isSettingsPath(location.pathname) ? "settings" : "main",
  )
  const searchRef = useRef<HTMLInputElement>(null)

  // Sync panel with route
  useEffect(() => {
    setActivePanel(isSettingsPath(location.pathname) ? "settings" : "main")
  }, [location.pathname])

  // Load sessions on mount
  useEffect(() => {
    console.log('[Sidebar] mount effect, sessionsLoaded=', sessionsLoaded)
    if (!sessionsLoaded) {
      loadSessions()
    }
  }, [sessionsLoaded, loadSessions])

  // Rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  const handleDeleteSession = async (sid: string) => {
    try {
      await deleteSessionApi(sid)
      deleteStoreSession(sid)
    } catch {
      // silently fail
    }
  }

  const handleRename = async (sid: string) => {
    const trimmed = editTitle.trim()
    if (!trimmed) {
      setEditingSessionId(null)
      return
    }
    try {
      await renameSession(sid, trimmed)
      useChatStore.getState().updateSession(sid, { title: trimmed })
    } catch {
      // silently fail
    }
    setEditingSessionId(null)
  }

  const handleCopyId = (sid: string) => {
    navigator.clipboard.writeText(sid).catch(() => {})
  }

  const startRename = (s: { id: string; title: string }) => {
    setEditingSessionId(s.id)
    setEditTitle(s.title)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  // Hide empty sessions (0 messages, not active) to avoid clutter from
  // abandoned/incomplete session creations. Active session is always shown.
  // A session is "visible" if it has messages (frontend-loaded), has a
  // messageCount from the API list, or is the active session.
  const visibleSessions = sessions.filter(
    (s) => s.messages.length > 0 || (s.messageCount ?? 0) > 0 || s.id === activeSessionId,
  )

  const filteredSessions = searchQuery
    ? visibleSessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleSessions

  const pinnedSessions = filteredSessions.filter((s) => pinnedIds.includes(s.id))
  const unpinnedSessions = filteredSessions.filter((s) => !pinnedIds.includes(s.id))

  const openSearch = () => {
    setIsSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex px-0.5 md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between",
        )}
      >
        <a href="/" className="flex items-center px-2">
          <img src="/nous-logo.png" alt="Nous" className="h-6 w-6 rounded object-cover shrink-0" />
        </a>

        <div className={cn("flex items-center gap-2", isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row")}>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="relative flex flex-col flex-1 min-h-0 gap-1 px-0.5 py-1">
          {/* Slide container for main ↔ settings */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <div
              className="flex h-full transition-transform duration-150 ease-out"
              style={{
                width: "200%",
                transform:
                  activePanel === "settings"
                    ? "translateX(-50%)"
                    : "translateX(0)",
              }}
            >
              {/* ── Main panel ── */}
              <div className="flex flex-col gap-1 h-full justify-between w-1/2">
                <div className="flex flex-col gap-1 flex-1 min-h-0">
                  <DashboardNavigation routes={dashboardRoutes} />

                  {!isCollapsed && (
                    <SidebarGroup className="px-0 flex flex-col min-h-0">
                      <div className="group/search flex items-center justify-between px-0.5 pb-0.5 shrink-0">
                        {isSearchOpen ? (
                          <div className="flex w-full items-center gap-1 min-w-0">
                            <IconSearch className="size-3.5 shrink-0 text-muted-foreground" />
                            <input
                              ref={searchRef}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") closeSearch()
                              }}
                              placeholder="Search..."
                              className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/50"
                            />
                            <button
                              onClick={closeSearch}
                              className="flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-sidebar-muted transition-colors"
                              aria-label="Close search"
                              title="Close search"
                            >
                              <IconX className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <SidebarGroupLabel className="!text-[11px] !font-normal text-muted-foreground/60">
                              Chats
                            </SidebarGroupLabel>
                            <button
                              onClick={openSearch}
                              className="flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover/search:opacity-100 transition-opacity"
                              aria-label="Search chats"
                            >
                              <IconSearch className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <SidebarMenu>
                          {filteredSessions.length === 0 && searchQuery && (
                            <p className="px-2 py-4 text-xs text-muted-foreground">
                              No chats match &quot;{searchQuery}&quot;
                            </p>
                          )}
                          {filteredSessions.length === 0 && !searchQuery && (
                            <p className="px-2 py-4 text-xs text-muted-foreground">
                              No conversations yet. Start chatting!
                            </p>
                          )}

                          {/* Pinned sessions */}
                          {pinnedSessions.map((s) => (
                            <SessionItem
                              key={s.id}
                              session={s}
                              isActive={activeSessionId === s.id}
                              isEditing={editingSessionId === s.id}
                              editTitle={editTitle}
                              setEditTitle={setEditTitle}
                              renameInputRef={renameInputRef}
                              onRename={(sid) => handleRename(sid)}
                              onCancelRename={() => setEditingSessionId(null)}
                              onPrefetch={() => prefetchSession(s.id)}
                              onStartRename={() => startRename(s)}
                              onTogglePin={() => togglePin(s.id)}
                              onCopyId={() => handleCopyId(s.id)}
                              onDelete={() => handleDeleteSession(s.id)}
                              isPinned
                            />
                          ))}

                          {/* Unpinned sessions */}
                          {unpinnedSessions.slice(0, 20).map((s) => (
                            <SessionItem
                              key={s.id}
                              session={s}
                              isActive={activeSessionId === s.id}
                              isEditing={editingSessionId === s.id}
                              editTitle={editTitle}
                              setEditTitle={setEditTitle}
                              renameInputRef={renameInputRef}
                              onRename={(sid) => handleRename(sid)}
                              onCancelRename={() => setEditingSessionId(null)}
                              onPrefetch={() => prefetchSession(s.id)}
                              onStartRename={() => startRename(s)}
                              onTogglePin={() => togglePin(s.id)}
                              onCopyId={() => handleCopyId(s.id)}
                              onDelete={() => handleDeleteSession(s.id)}
                            />
                          ))}
                        </SidebarMenu>
                      </div>
                    </SidebarGroup>
                  )}
                </div>

                {/* Footer */}
                <div className="shrink-0 space-y-1">
                  <UpdateBanner isCollapsed={isCollapsed} />
                  <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1" : "flex-row gap-1")}>
                    <Link
                      to={"/settings" as string}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors",
                        isCollapsed ? "justify-center p-1.5 w-full" : "flex-1 px-2 py-1",
                      )}
                      aria-label="Settings"
                      title={isCollapsed ? "Settings" : undefined}
                    >
                      <IconSettings className="size-3.5 shrink-0" />
                      {!isCollapsed && <span>Settings</span>}
                    </Link>
                    <button
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      className={cn(
                        "flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors",
                        isCollapsed ? "p-1.5 w-full" : "p-1.5",
                      )}
                      aria-label="Toggle theme"
                      title={isCollapsed ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : undefined}
                    >
                      <IconSun className="size-3.5 dark:hidden" />
                      <IconMoon className="size-3.5 hidden dark:block" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Settings panel ── */}
              <div className="flex flex-col h-full justify-between w-1/2">
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="px-1 pb-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Settings</span>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5 px-0.5">
                    <SettingsGroup
                      icon={<IconPaint className="size-4" />}
                      title="Appearance"
                      section="appearance"
                      activeSection={currentSection}
                    />
                    <SettingsLink
                      icon={<IconBrain className="size-4" />}
                      title="Models"
                      to="/settings/models"
                    />
                    <SettingsGroup
                      icon={<IconBrandGithub className="size-4" />}
                      title="About"
                      section="about"
                      activeSection={currentSection}
                    />
                  </div>
                </div>

                <div className="shrink-0 px-0.5 pb-1">
                  <Link
                    to={"/" as string}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors"
                  >
                    <IconArrowLeft className="size-4 shrink-0" />
                    <span>Back to app</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

function SettingsGroup({
  icon,
  title,
  section,
  activeSection,
}: {
  icon: React.ReactNode
  title: string
  section: string
  activeSection?: string
}) {
  const isActive = activeSection === section
  return (
    <Link
      to={"/settings" as string}
      search={{ section }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-sidebar-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{title}</span>
    </Link>
  )
}

function SettingsLink({
  icon,
  title,
  to,
}: {
  icon: React.ReactNode
  title: string
  to: string
}) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Link
      to={to as string}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-sidebar-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{title}</span>
    </Link>
  )
}

// ── Inline session item with pin, copy-id, rename, and double-click edit ──

function SessionItem({
  session,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  renameInputRef,
  onRename,
  onCancelRename,
  onPrefetch,
  onStartRename,
  onTogglePin,
  onCopyId,
  onDelete,
  isPinned = false,
}: {
  session: SessionItemType
  isActive: boolean
  isEditing: boolean
  editTitle: string
  setEditTitle: (v: string) => void
  renameInputRef: React.RefObject<HTMLInputElement | null>
  onRename: (id: string) => void
  onCancelRename: () => void
  onPrefetch: () => void
  onStartRename: () => void
  onTogglePin: () => void
  onCopyId: () => void
  onDelete: () => void
  isPinned?: boolean
}) {
  return (
    <SidebarMenuItem className="group/chat">
      <div className="relative">
        {isEditing ? (
          <input
            ref={renameInputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRename(session.id)
              if (e.key === "Escape") onCancelRename()
            }}
            onBlur={() => onCancelRename()}
            className="w-full px-2 py-1 text-xs font-medium bg-transparent border-b border-sidebar-ring text-foreground outline-none"
          />
        ) : (
          <>
            <SidebarMenuButton
              isActive={isActive}
              className="px-2 py-1 pr-8 text-xs font-medium text-muted-foreground hover:text-foreground data-[active=true]:bg-sidebar-muted data-[active=true]:text-foreground"
              onDoubleClick={onStartRename}
              render={
                <Link
                  to={`/chat/${session.id}` as string}
                  className="flex items-center gap-1.5"
                  onPointerEnter={onPrefetch}
                />
              }
            >
              {isPinned && (
                <IconPin className="size-3 shrink-0 text-amber-500" />
              )}
              <span className="truncate">{session.title}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-md p-1 text-muted-foreground opacity-0 hover:bg-sidebar-muted hover:text-foreground group-hover/chat:opacity-100 transition-opacity" />
                }
              >
                <IconDots className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" sideOffset={4}>
                <DropdownMenuItem className="gap-2" onClick={onStartRename}>
                  <IconPencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={onTogglePin}>
                  {isPinned ? (
                    <>
                      <IconPinnedOff className="size-3.5" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <IconPin className="size-3.5" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={onCopyId}>
                  <IconCopy className="size-3.5" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onClick={onDelete}
                >
                  <IconTrash className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </SidebarMenuItem>
  )
}

// ── Update banner ───────────────────────────────────────────────────────────

function UpdateBanner({ isCollapsed }: { isCollapsed: boolean }) {
  const { data, isLoading } = useVersionCheck()
  const updateMutation = useTriggerUpdate()
  const [showPanel, setShowPanel] = useState(false)

  if (isLoading || !data?.outdated) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel((s) => !s)}
        className={cn(
          "flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors w-full",
          isCollapsed
            ? "justify-center p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            : "px-2 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
        )}
        title="Update available"
      >
        <IconDownload className="size-3.5 shrink-0" />
        {!isCollapsed && (
          <span className="truncate">
            Update v{data.latest}
          </span>
        )}
      </button>

      {showPanel && !isCollapsed && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-lg border border-border bg-popover p-3 shadow-lg z-50">
          <div className="space-y-2">
            <div className="text-xs font-medium text-foreground">
              Hermium v{data.latest} is available
            </div>
            <div className="text-[11px] text-muted-foreground">
              You are running v{data.current}.
            </div>

            {updateMutation.isSuccess && updateMutation.data.success ? (
              <div className="rounded-md bg-green-500/10 px-2 py-1.5 text-[11px] text-green-600 dark:text-green-400">
                {updateMutation.data.message}
              </div>
            ) : updateMutation.isSuccess && !updateMutation.data.success ? (
              <div className="space-y-1.5">
                <div className="rounded-md bg-red-500/10 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {updateMutation.data.message}
                </div>
                {updateMutation.data.command && (
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1.5">
                    <code className="flex-1 text-[11px] font-mono text-foreground truncate">
                      {updateMutation.data.command}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(updateMutation.data.command!)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                      title="Copy command"
                    >
                      <IconCopy className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Updating..." : "Update now"}
                </button>
                <button
                  onClick={() => {
                    if (data.updateCommand) {
                      navigator.clipboard.writeText(data.updateCommand)
                    }
                  }}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Copy cmd
                </button>
              </div>
            )}

            <button
              onClick={() => setShowPanel(false)}
              className="w-full rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
