import { get, post } from "@/lib/api"
import type { MemoryData, WriteMemoryResponse } from "./types"

export async function fetchMemory(): Promise<MemoryData> {
  return get<MemoryData>("/api/hermes/memory")
}

export async function saveMemory(section: "memory" | "user", content: string): Promise<WriteMemoryResponse> {
  return post<WriteMemoryResponse>("/api/hermes/memory/write", { section, content })
}
