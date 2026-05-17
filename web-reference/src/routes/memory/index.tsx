import { createFileRoute } from "@tanstack/react-router"
import { MemoryPage } from "@/features/memory/pages"

export const Route = createFileRoute("/memory/")({
  component: MemoryPage,
})
