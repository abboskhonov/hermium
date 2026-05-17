import { memo } from "react"
import {
  IconSearch,
  IconClock,
  IconMail,
  IconCode,
  IconChartLine,
  IconBell,
} from "@tabler/icons-react"

interface Suggestion {
  text: string
  label: string
  Icon: typeof IconSearch
}

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Search the web",
    text: "Search the web for today's top tech news",
    Icon: IconSearch,
  },
  {
    label: "Set a reminder",
    text: "Set a reminder to check emails every day at 9 AM",
    Icon: IconBell,
  },
  {
    label: "Read emails",
    text: "Read my latest emails and summarize them",
    Icon: IconMail,
  },
  {
    label: "Write a script",
    text: "Write a Python script to rename all files in a folder",
    Icon: IconCode,
  },
  {
    label: "Schedule a job",
    text: "Schedule a cron job to back up my database every night",
    Icon: IconClock,
  },
  {
    label: "Analyze data",
    text: "Analyze this CSV file and show key insights",
    Icon: IconChartLine,
  },
]

interface ChatEmptyStateProps {
  onSelectSuggestion: (text: string) => void
}

export const ChatEmptyState = memo(function ChatEmptyState({
  onSelectSuggestion,
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
        <IconSearch className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">How can I help?</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm text-center">
        Ask anything or pick a suggestion to get started.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map(({ text, label, Icon }) => (
          <button
            key={text}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm text-foreground hover:bg-accent hover:border-accent transition-colors group"
            onClick={() => onSelectSuggestion(text)}
          >
            <Icon className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
})
