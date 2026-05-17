import { get, post } from "@/lib/api"
import type { Session, CreateSession, UpdateSession } from "./types"

export async function fetchSessions(): Promise<Session[]> {
  return get<Session[]>("/api/sessions")
}

export async function fetchSession(sessionId: string): Promise<Session> {
  return get<Session>("/api/session", { session_id: sessionId })
}

export async function createSession(params: CreateSession): Promise<Session> {
  return post<Session>("/api/session/new", params)
}

export async function updateSession(params: UpdateSession): Promise<{ ok: boolean }> {
  return post("/api/session/update", params)
}

export async function deleteSession(sessionId: string): Promise<{ ok: boolean }> {
  return post("/api/session/delete", { session_id: sessionId })
}

export async function searchSessions(query: string): Promise<Session[]> {
  return get<Session[]>("/api/sessions/search", { q: query })
}
