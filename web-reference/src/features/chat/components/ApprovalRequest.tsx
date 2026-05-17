import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  IconCheck,
  IconX,
  IconShieldCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { respondApproval } from "@/features/chat/apis"

export interface ApprovalRequestData {
  tool_name?: string
  command?: string
  description?: string
  risk?: string
  [key: string]: unknown
}

interface ApprovalRequestProps {
  sessionId: string
  request: ApprovalRequestData
  onResolved: () => void
}

export function ApprovalRequest({
  sessionId,
  request,
  onResolved,
}: ApprovalRequestProps) {
  const [responding, setResponding] = useState(false)

  const handleChoice = async (choice: "once" | "session" | "always" | "deny") => {
    setResponding(true)
    try {
      await respondApproval({ session_id: sessionId, choice })
      onResolved()
    } catch {
      // silently handle
    } finally {
      setResponding(false)
    }
  }

  const toolName = request.tool_name || "unknown tool"
  const command =
    typeof request.command === "string"
      ? request.command
      : typeof request.arguments === "string"
        ? request.arguments
        : null
  const description =
    typeof request.description === "string"
      ? request.description
      : typeof request.preview === "string"
        ? request.preview
        : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-3">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <IconShieldCheck className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Approval Required
          </span>
        </div>

        {/* Tool name */}
        <p className="text-sm text-foreground mb-1">
          The agent wants to use <span className="font-medium">{toolName}</span>
        </p>

        {/* Command preview */}
        {command && (
          <div className="mt-2 rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {command}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        {/* Risk warning */}
        {request.risk === "high" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
            <IconAlertTriangle className="h-3.5 w-3.5" />
            High risk operation
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={responding}
            onClick={() => handleChoice("once")}
          >
            <IconCheck className="h-3.5 w-3.5" />
            Approve once
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={responding}
            onClick={() => handleChoice("session")}
          >
            <IconCheck className="h-3.5 w-3.5" />
            Approve all
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={responding}
            onClick={() => handleChoice("always")}
          >
            <IconShieldCheck className="h-3.5 w-3.5" />
            Always allow
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={responding}
            onClick={() => handleChoice("deny")}
          >
            <IconX className="h-3.5 w-3.5" />
            Deny
          </Button>
        </div>
      </div>
    </div>
  )
}
