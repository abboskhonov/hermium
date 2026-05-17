import { createFileRoute } from "@tanstack/react-router"
import { AutomationsPage } from "@/features/automations/pages"

export const Route = createFileRoute("/automations/")({
  component: AutomationsPage,
})
