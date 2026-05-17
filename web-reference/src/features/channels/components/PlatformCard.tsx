import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  IconPlugConnected,
  IconPlug,
  IconChevronDown,
  IconAlertTriangle,
} from "@tabler/icons-react"

interface PlatformCardProps {
  name: string
  icon: string
  color: string
  configured: boolean
  hasCreds: boolean
  exclusive?: boolean
  children: ReactNode
}

export function PlatformCard({
  name,
  icon,
  color,
  configured,
  hasCreds,
  exclusive,
  children,
}: PlatformCardProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card transition-all duration-200",
        "hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20",
        "hover:border-border/80",
        configured && hasCreds
          ? "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.02]"
          : configured
            ? "border-amber-500/30 dark:border-amber-500/20 bg-amber-500/[0.02]"
            : "border-border",
      )}
    >
      {/* Accent stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl transition-colors",
          configured && hasCreds
            ? "bg-emerald-500/50"
            : configured
              ? "bg-amber-500/50"
              : "bg-border",
        )}
      />

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Platform icon */}
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-lg shrink-0 transition-colors",
              configured
                ? "bg-foreground/5 dark:bg-foreground/10"
                : "bg-muted",
            )}
          >
            <span
              className={cn(
                "size-[18px] flex items-center justify-center",
                configured ? "text-foreground/70" : "text-muted-foreground/50",
              )}
              dangerouslySetInnerHTML={{ __html: icon }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {configured && hasCreds ? (
                <>
                  <IconPlugConnected className="size-3 text-emerald-500" />
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Connected
                  </span>
                </>
              ) : configured ? (
                <>
                  <IconAlertTriangle className="size-3 text-amber-500" />
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Needs credentials
                  </span>
                </>
              ) : (
                <>
                  <IconPlug className="size-3 text-muted-foreground/50" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Not connected
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <IconChevronDown
          className={cn(
            "size-4 text-muted-foreground/50 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40">
          {exclusive && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
              <svg
                className="size-3.5 shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              This platform requires an exclusive/shared token. Ensure only one bot instance uses this token.
            </div>
          )}
          <div className="mt-3 space-y-0.5">{children}</div>
        </div>
      )}
    </div>
  )
}
