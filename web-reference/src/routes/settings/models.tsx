import { createFileRoute } from "@tanstack/react-router"
import { ModelSettings } from "@/features/settings/pages"

export const Route = createFileRoute("/settings/models")({
  component: ModelsSettingsRoute,
})

function ModelsSettingsRoute() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Model</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure the AI model used for all conversations.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <ModelSettings />
        </div>
      </div>
    </div>
  )
}
