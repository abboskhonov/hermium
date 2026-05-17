import { createFileRoute } from "@tanstack/react-router"
import { ChannelsPage } from "@/features/channels/pages"

export const Route = createFileRoute("/channels/")({
  component: ChannelsPage,
})
