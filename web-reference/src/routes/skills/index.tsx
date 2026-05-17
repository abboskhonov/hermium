import { createFileRoute } from "@tanstack/react-router"
import { SkillsPage } from "@/features/skills/pages"

export const Route = createFileRoute("/skills/")({
  component: SkillsPage,
})
