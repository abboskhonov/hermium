import { createFileRoute } from "@tanstack/react-router"
import { UsagePage } from "@/features/usage/pages"

export const Route = createFileRoute("/usage/")({
  component: UsagePage,
})
