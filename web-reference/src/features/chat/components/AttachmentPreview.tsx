import { cn } from "@/lib/utils"
import { IconX, IconFile, IconPhoto } from "@tabler/icons-react"
import type { Attachment } from "@/features/chat/types"

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove: (id: string) => void
  compact?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentThumb({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const isImage = attachment.type.startsWith("image/")

  return (
    <div className="group relative flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs">
      {isImage && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : isImage ? (
        <IconPhoto className="size-5 text-muted-foreground" />
      ) : (
        <IconFile className="size-5 text-muted-foreground" />
      )}
      <div className="flex flex-col min-w-0">
        <span className="truncate max-w-[120px] font-medium text-foreground">
          {attachment.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatSize(attachment.size)}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
        aria-label={`Remove ${attachment.name}`}
      >
        <IconX className="size-2.5" />
      </button>
    </div>
  )
}

export function AttachmentPreview({ attachments, onRemove, compact = false }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto",
        compact ? "px-3 pt-3" : "px-3 pt-3",
      )}
    >
      {attachments.map((a) => (
        <AttachmentThumb
          key={a.id}
          attachment={a}
          onRemove={() => onRemove(a.id)}
        />
      ))}
    </div>
  )
}
