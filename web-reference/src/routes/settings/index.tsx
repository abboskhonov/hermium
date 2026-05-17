import { createFileRoute } from "@tanstack/react-router"
import { SettingsPage } from "@/features/settings/pages"
import { z } from "zod"

const settingsSearchSchema = z.object({
  section: z.string().optional().default("appearance"),
})

function SettingsRoute() {
  const { section } = Route.useSearch()
  return <SettingsPage section={section} />
}

export const Route = createFileRoute("/settings/")({
  component: SettingsRoute,
  validateSearch: (search) => settingsSearchSchema.parse(search),
})
