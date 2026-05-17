import { memo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconDots,
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useChatStore } from "./store"
import { renameSession, deleteSessionApi } from "./apis"

interface ChatHeaderProps {
  sessionId: string
  title?: string | null
  hasMessages: boolean
  onNewChat: () => void
  onClear: () => void
  queueLength?: number
  isAborting?: boolean
}

export const ChatHeader = memo(function ChatHeader({
  sessionId,
  title,
  hasMessages,
  onNewChat,
  onClear,
  queueLength,
  isAborting,
}: ChatHeaderProps) {
  const navigate = useNavigate()
  const deleteStoreSession = useChatStore((s) => s.deleteSession)

  const handleDelete = async () => {
    try {
      await deleteSessionApi(sessionId)
      deleteStoreSession(sessionId)
      navigate({ to: "/chat" })
    } catch {
      // ignore
    }
  }

  return (
    <div className="group/header shrink-0 px-2 py-1 flex items-center gap-1.5 min-w-0">
      <span className="text-xs font-medium text-muted-foreground truncate flex-1 select-none">
        {title || "Conversation"}
      </span>

      {isAborting && (
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-md">
          Aborting…
        </span>
      )}

      {!!queueLength && queueLength > 0 && (
        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-md">
          +{queueLength} queued
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
        <button
          onClick={onNewChat}
          className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors"
          title="New chat"
        >
          <IconPlus className="size-3.5" />
        </button>

        {hasMessages && (
          <button
            onClick={onClear}
            className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors"
            title="Clear chat"
          >
            <IconTrash className="size-3.5" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-sidebar-muted hover:text-foreground transition-colors">
              <IconDots className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={() => {
                const newTitle = prompt("Rename conversation", title || "")
                if (newTitle?.trim()) {
                  renameSession(sessionId, newTitle.trim())
                  useChatStore
                    .getState()
                    .updateSession(sessionId, { title: newTitle.trim() })
                }
              }}
            >
              <IconPencil className="size-3" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs text-destructive"
              onClick={handleDelete}
            >
              <IconTrash className="size-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})
