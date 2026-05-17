import { request } from "../client.js"
import type { Session, Message } from "@hermium/shared"

export async function fetchSessions(): Promise<Session[]> {
  const res = await request<{ sessions: Session[] }>("/api/hermes/sessions")
  return res.sessions
}

export async function fetchSession(id: string): Promise<{ session: Session; messages: Message[] } | null> {
  try {
    const res = await request<{ session: Session; messages: Message[] }>(`/api/hermes/sessions/${id}`)
    return res
  } catch {
    return null
  }
}

export async function createSession(payload: {
  id?: string
  title?: string
  model?: string
  source?: string
}): Promise<{ id: string; title: string; createdAt: number; updatedAt: number }> {
  return request("/api/hermes/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function renameSession(id: string, title: string): Promise<void> {
  await request(`/api/hermes/sessions/${id}/rename`, {
    method: "POST",
    body: JSON.stringify({ title }),
  })
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/hermes/sessions/${id}`, { method: "DELETE" })
}

export async function saveMessage(sessionId: string, message: Message): Promise<void> {
  await request(`/api/hermes/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(message),
  })
}
