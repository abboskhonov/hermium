// ─── Core Types ───────────────────────────────────────────────
// Shared between packages/api and packages/web

export interface Session {
  id: string
  title: string
  source?: string
  createdAt: number
  updatedAt: number
  model?: string
  provider?: string
  messageCount?: number
  inputTokens?: number
  outputTokens?: number
  endedAt?: number | null
  lastActiveAt?: number
  workspace?: string | null
}

export interface ToolCall {
  name: string
  preview: string
  callId?: string
  output?: string
  status: 'running' | 'done' | 'error'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool' | 'command'
  content: string
  timestamp: number
  toolName?: string
  toolCallId?: string
  toolArgs?: string
  toolResult?: string
  toolStatus?: 'running' | 'done' | 'error'
  toolDuration?: number
  isStreaming?: boolean
  reasoning?: string
  reasoningStartedAt?: number
  reasoningEndedAt?: number
  toolCalls?: ToolCall[]
  queued?: boolean
  systemType?: 'command' | 'error'
  commandAction?: string
  commandData?: Record<string, unknown>
}

export interface Profile {
  name: string
  path: string
  isActive: boolean
}

export interface Provider {
  id: string
  name: string
  url: string
  apiKey?: string
  models: string[]
  defaultModel?: string
}

export interface UsageRecord {
  sessionId: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  model: string
  profile: string
  timestamp: number
}

export interface MemoryData {
  memory: string
  user: string
  soul: string
  memory_mtime: number | null
  user_mtime: number | null
  soul_mtime: number | null
}

export interface Job {
  id: string
  name: string
  cron: string
  command: string
  enabled: boolean
  profile: string
  createdAt: number
  updatedAt: number
}

export interface ChatRunPayload {
  input: string
  session_id?: string
  model?: string
  instructions?: string
  queue_id?: string
  source?: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: { message: string; code?: string }
}
