import { get, post, patch, del } from "@/lib/api"
import type { StreamStartResponse, SessionCompact } from "./types"
import type { ModelsResponse } from "./model-types"

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function startChat(params: {
  session_id: string
  message: string
  model: string
  workspace?: string
  attachments?: Record<string, unknown>[]
}): Promise<StreamStartResponse> {
  return post<StreamStartResponse>("/api/chat/start", params)
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function listSessions(): Promise<{ sessions: SessionCompact[] }> {
  const data = await get<{
    sessions: Array<{
      id: string
      title: string | null
      source: string
      model: string
      started_at: number
      ended_at: number | null
      message_count: number
      input_tokens: number
      output_tokens: number
    }>
  }>("/api/sessions", { limit: "50" })

  return {
    sessions: (data.sessions ?? []).map((s) => ({
      id: s.id,
      session_id: s.id,
      title: s.title || "Untitled",
      source: s.source || "webui",
      model: s.model || "",
      started_at: s.started_at ?? 0,
      ended_at: s.ended_at ?? null,
      message_count: s.message_count ?? 0,
      input_tokens: s.input_tokens ?? 0,
      output_tokens: s.output_tokens ?? 0,
      workspace: "",
      created_at: s.started_at ?? 0,
      updated_at: s.started_at ?? 0,
    })),
  }
}

export async function createSession(params?: {
  workspace?: string
  model?: string
}): Promise<SessionCompact & { session_id: string; title: string }> {
  const data = await post<{
    id: string
    title: string | null
    model: string
    source: string
    started_at: number
    input_tokens: number
    output_tokens: number
    message_count: number
  }>("/api/sessions", { model: params?.model })

  return {
    id: data.id,
    session_id: data.id,
    title: data.title || "New Conversation",
    workspace: params?.workspace || "",
    model: data.model || "",
    source: data.source || "webui",
    message_count: data.message_count ?? 0,
    started_at: data.started_at,
    ended_at: null,
    created_at: data.started_at,
    updated_at: data.started_at,
    input_tokens: data.input_tokens ?? 0,
    output_tokens: data.output_tokens ?? 0,
  }
}

export async function renameSession(
  sessionId: string,
  title: string,
): Promise<{ ok: boolean }> {
  return patch(`/api/sessions/${sessionId}`, { title })
}

export async function deleteSessionApi(sessionId: string): Promise<{ ok: boolean }> {
  return del(`/api/sessions/${sessionId}`)
}

// ─── Models ────────────────────────────────────────────────────────────────

export async function fetchModels(): Promise<ModelsResponse> {
  return get<ModelsResponse>("/api/config/models")
}

export async function updateModelConfig(params: {
  model: string
  session_id?: string
}): Promise<{ ok: boolean; model: string }> {
  return post<{ ok: boolean; model: string }>("/api/config/model", params)
}

// ─── Approval ───────────────────────────────────────────────────────────────

export async function respondApproval(params: {
  session_id: string
  choice: "once" | "session" | "always" | "deny"
}): Promise<{ ok: boolean }> {
  return post("/api/approval/respond", params)
}

export async function checkPendingApproval(sessionId: string): Promise<{
  pending: Record<string, unknown> | null
}> {
  return get("/api/approval/pending", { session_id: sessionId })
}
