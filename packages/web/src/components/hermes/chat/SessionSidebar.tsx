import { useChatStore } from "@/stores/chat"
import { cn } from "@/lib/utils"
import {
  IconMessage,
  IconPlus,
  IconTrash,
  IconLoader2,
} from "@tabler/icons-react"

export default function SessionSidebar() {
  const {
    sessions,
    activeSessionId,
    isStreaming,
    isLoadingSessions,
    switchSession,
    createNewSession,
    deleteSession,
  } = useChatStore()

  return (
    <aside className="flex w-64 flex-col border-r bg-background h-full">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chats
        </span>
        <button
          onClick={() => createNewSession()}
          className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 gap-1"
        >
          <IconPlus className="size-3.5" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingSessions && sessions.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-2 py-8 text-xs text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Loading…
          </div>
        )}
        {!isLoadingSessions && sessions.length === 0 && (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground">
            No chats yet. Start a new conversation!
          </div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors mb-0.5",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
              onClick={() => switchSession(session.id)}
            >
              <IconMessage className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {session.title || `Chat ${session.id.slice(0, 6)}`}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {session.messageCount ?? 0} messages
                </div>
              </div>
              {isActive && isStreaming && (
                <IconLoader2 className="size-3.5 animate-spin text-primary shrink-0" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(session.id)
                }}
                className="ml-1 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:inline-flex"
                title="Delete"
              >
                <IconTrash className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
