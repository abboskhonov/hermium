/**
 * Clean chat types — minimal, Hermes-inspired.
 */

export type ChatRole = "user" | "assistant" | "system" | "tool"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
  isStreaming?: boolean
  reasoning?: string
  reasoningStartedAt?: number
  reasoningEndedAt?: number
  toolName?: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  name: string
  preview: string
  callId?: string
  output?: string
  status: "running" | "done" | "error"
}

export interface UsageState {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
}

export interface SessionItem {
  id: string
  title: string
  model: string
  source?: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  messageCount?: number
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  contextLength?: number | null
  pendingApproval?: Record<string, unknown> | null
  queueLength?: number
  isAborting?: boolean
}

export interface Attachment {
  id: string
  name: string
  type: string // MIME
  size: number
  file: File
  previewUrl?: string
}

export interface SlashCommand {
  name: string
  description: string
  category: "chat" | "agent" | "tools" | "info"
  local?: boolean
}

export interface StreamStartResponse {
  stream_id: string
  session_id: string
}

export interface SessionCompact {
  id: string
  title: string | null
  source: string
  model: string
  started_at: number
  ended_at: number | null
  message_count: number
  input_tokens: number
  output_tokens: number
}
