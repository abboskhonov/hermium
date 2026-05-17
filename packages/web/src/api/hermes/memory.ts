import { request } from "../client.js"
import type { MemoryData } from "@hermium/shared"

export async function fetchMemory(): Promise<MemoryData> {
  return request<MemoryData>("/api/hermes/memory")
}

export async function saveMemory(
  section: "memory" | "user" | "soul",
  content: string,
): Promise<void> {
  await request("/api/hermes/memory", {
    method: "POST",
    body: JSON.stringify({ section, content }),
  })
}
