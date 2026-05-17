"use client";

import { useEffect, useState, useRef } from "react";
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  IconCirclePlus,
  IconMessage,
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
  IconBrain,
  IconChartBar,
} from "@tabler/icons-react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import type { Route } from "./nav-main";
import { DashboardNavigation } from "@/components/sidebar-02/nav-main";
import { useChatStore } from "@/stores/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renameSession } from "@/api/hermes/sessions";

const dashboardRoutes: Route[] = [];

const Logo = () => (
  <img
    src="/logo.png"
    alt="Hermium"
    className="h-7 w-7 rounded-md object-cover shrink-0"
  />
);

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessionsLoaded = useChatStore((s) => s.sessionsLoaded);
  const pinnedIds = useChatStore((s) => s.pinnedSessionIds);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const deleteStoreSession = useChatStore((s) => s.deleteSession);
  const togglePin = useChatStore((s) => s.togglePin);
  const updateStoreSession = useChatStore((s) => s.updateSession);

  const handleNewChat = () => {
    navigate({ to: "/" });
  };

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Rename
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Theme
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    import("@/lib/theme").then(({ getStoredTheme, resolveTheme }) => {
      setResolvedTheme(resolveTheme(getStoredTheme()))
    })
  }, []);

  const handleToggleTheme = () => {
    import("@/lib/theme").then(({ toggleTheme }) => {
      const next = toggleTheme()
      setResolvedTheme(next === "dark" ? "dark" : "light")
    })
  };

  useEffect(() => {
    if (!sessionsLoaded) {
      loadSessions();
    }
  }, [sessionsLoaded, loadSessions]);

  const handleDeleteSession = async (sid: string) => {
    try {
      await deleteStoreSession(sid);
    } catch {
      // silently fail
    }
  };

  const handleRename = async (sid: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }
    try {
      await renameSession(sid, trimmed);
      updateStoreSession(sid, { title: trimmed });
    } catch {
      // silently fail
    }
    setEditingSessionId(null);
  };

  const handleCopyId = (sid: string) => {
    navigator.clipboard.writeText(sid).catch(() => {});
  };

  const startRename = (s: { id: string; title: string }) => {
    setEditingSessionId(s.id);
    setEditTitle(s.title);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const isOnChatRoute = location.pathname.startsWith("/chat/")

  const visibleSessions = sessions.filter(
    (s) => (s.messageCount ?? 0) > 0,
  );

  const filteredSessions = searchQuery
    ? visibleSessions.filter((s) =>
        (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleSessions;

  const pinnedSessions = filteredSessions.filter((s) => pinnedIds.includes(s.id));
  const unpinnedSessions = filteredSessions.filter((s) => !pinnedIds.includes(s.id));

  const openSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-2 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          {!isCollapsed && (
            <span className="font-semibold text-sm text-foreground tracking-tight">
              Hermium
            </span>
          )}
        </Link>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <div className="relative flex flex-col flex-1 min-h-0 gap-1 px-0.5 py-1">
          <div className="flex flex-col gap-1 h-full justify-between">
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              {/* New Chat */}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleNewChat}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-muted transition-colors"
                  >
                    <IconCirclePlus className="size-4" />
                    {!isCollapsed && <span>New Chat</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {/* Memory */}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Memory"
                    render={
                      <Link
                        to="/memory"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                          location.pathname === "/memory"
                            ? "bg-sidebar-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-muted",
                        )}
                      />
                    }
                  >
                    <IconBrain className="size-4" />
                    {!isCollapsed && <span>Memory</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {/* Usage */}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Usage"
                    render={
                      <Link
                        to="/usage"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                          location.pathname === "/usage"
                            ? "bg-sidebar-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-muted",
                        )}
                      />
                    }
                  >
                    <IconChartBar className="size-4" />
                    {!isCollapsed && <span>Usage</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {/* Nav routes */}
              <DashboardNavigation routes={dashboardRoutes} />

              {/* Chats */}
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
                            if (e.key === "Escape") closeSearch();
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

                      {/* Pinned */}
                      {pinnedSessions.map((s) => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          isActive={isOnChatRoute && activeSessionId === s.id}
                          isEditing={editingSessionId === s.id}
                          editTitle={editTitle}
                          setEditTitle={setEditTitle}
                          renameInputRef={renameInputRef}
                          onRename={(sid) => handleRename(sid)}
                          onCancelRename={() => setEditingSessionId(null)}
                          onStartRename={() => startRename(s)}
                          onTogglePin={() => togglePin(s.id)}
                          onCopyId={() => handleCopyId(s.id)}
                          onDelete={() => handleDeleteSession(s.id)}
                          isPinned
                        />
                      ))}

                      {/* Unpinned */}
                      {unpinnedSessions.slice(0, 20).map((s) => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          isActive={isOnChatRoute && activeSessionId === s.id}
                          isEditing={editingSessionId === s.id}
                          editTitle={editTitle}
                          setEditTitle={setEditTitle}
                          renameInputRef={renameInputRef}
                          onRename={(sid) => handleRename(sid)}
                          onCancelRename={() => setEditingSessionId(null)}
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

              {/* Collapsed: icon-only sessions */}
              {isCollapsed && (
                <SidebarMenu>
                  {sessions.slice(0, 6).map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        tooltip={s.title || `Chat ${s.id.slice(0, 6)}`}
                        render={
                          <Link
                            to="/chat/$sessionId"
                            params={{ sessionId: s.id }}
                            className={cn(
                              "flex items-center justify-center rounded-lg transition-colors",
                              isOnChatRoute && s.id === activeSessionId
                                ? "bg-sidebar-muted text-foreground"
                                : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                            )}
                          />
                        }
                      >
                        <IconMessage className="size-4" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 space-y-1">
              <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1" : "flex-row gap-1")}>
                <Link
                  to="/settings"
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
                  onClick={handleToggleTheme}
                  className={cn(
                    "flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors",
                    isCollapsed ? "p-1.5 w-full" : "p-1.5",
                  )}
                  aria-label="Toggle theme"
                  title={isCollapsed ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : undefined}
                >
                  <IconSun className={cn("size-3.5", resolvedTheme === "dark" && "hidden")} />
                  <IconMoon className={cn("size-3.5", resolvedTheme === "light" && "hidden")} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// ── Session item with pin, copy-id, rename, and double-click edit ──

function SessionItem({
  session,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  renameInputRef,
  onRename,
  onCancelRename,
  onStartRename,
  onTogglePin,
  onCopyId,
  onDelete,
  isPinned = false,
}: {
  session: { id: string; title: string };
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onRename: (id: string) => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onTogglePin: () => void;
  onCopyId: () => void;
  onDelete: () => void;
  isPinned?: boolean;
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
              if (e.key === "Enter") onRename(session.id);
              if (e.key === "Escape") onCancelRename();
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
                  to="/chat/$sessionId"
                  params={{ sessionId: session.id }}
                  className="flex items-center gap-1.5"
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
  );
}
