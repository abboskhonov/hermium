import type { SlashCommand } from "./types"

export const SLASH_COMMANDS: SlashCommand[] = [
  // Chat control (local)
  { name: "/new", description: "Start a new chat", category: "chat", local: true },
  { name: "/clear", description: "Clear conversation history", category: "chat", local: true },

  // Agent commands (sent to backend)
  { name: "/btw", description: "Ask a side question without affecting context", category: "agent" },
  { name: "/approve", description: "Approve a pending action", category: "agent" },
  { name: "/deny", description: "Deny a pending action", category: "agent" },
  { name: "/status", description: "Show current agent status", category: "agent" },
  { name: "/reset", description: "Reset conversation context", category: "agent" },
  { name: "/compact", description: "Compact and summarize the conversation", category: "agent" },
  { name: "/undo", description: "Undo the last action", category: "agent" },
  { name: "/retry", description: "Retry the last failed action", category: "agent" },
  { name: "/compress", description: "Compress conversation with optional focus topic", category: "agent" },
  { name: "/debug", description: "Show diagnostics and debug info", category: "agent" },
  { name: "/goal", description: "Lock the agent onto a persistent cross-turn goal", category: "agent" },
  { name: "/steer", description: "Steer the in-flight agent without interrupting it", category: "agent" },
  { name: "/queue", description: "Queue a follow-up to run after the current turn", category: "agent" },

  // Tools
  { name: "/web", description: "Search the web", category: "tools" },
  { name: "/image", description: "Generate an image", category: "tools" },
  { name: "/browse", description: "Browse a URL", category: "tools" },
  { name: "/code", description: "Write or execute code", category: "tools" },
  { name: "/file", description: "Read or write files", category: "tools" },
  { name: "/shell", description: "Run a shell command", category: "tools" },

  // Info (local)
  { name: "/help", description: "Show available commands and help", category: "info", local: true },
  { name: "/model", description: "Show or switch the current model", category: "info", local: true },
  { name: "/memory", description: "Show agent memory", category: "info", local: true },
  { name: "/persona", description: "Show current persona", category: "info", local: true },
  { name: "/version", description: "Show Hermes version", category: "info", local: true },
  { name: "/usage", description: "Show token usage and cost", category: "info", local: true },
  { name: "/tools", description: "List available tools", category: "info", local: true },
  { name: "/skills", description: "List installed skills", category: "info", local: true },
]

export function isLocalCommand(text: string): boolean {
  if (!text.startsWith("/")) return false
  const cmd = text.split(/\s+/)[0].toLowerCase()
  return SLASH_COMMANDS.some((c) => c.name === cmd && c.local)
}
