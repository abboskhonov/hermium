import { z } from "zod"

export const MemoryDataSchema = z.object({
  memory: z.string(),
  user: z.string(),
  memory_path: z.string(),
  user_path: z.string(),
  memory_mtime: z.number().nullable(),
  user_mtime: z.number().nullable(),
})

export type MemoryData = z.infer<typeof MemoryDataSchema>

export const WriteMemorySchema = z.object({
  section: z.enum(["memory", "user"]),
  content: z.string(),
})

export type WriteMemory = z.infer<typeof WriteMemorySchema>

export const WriteMemoryResponseSchema = z.object({
  ok: z.boolean(),
  section: z.string(),
  path: z.string(),
  mtime: z.number(),
})

export type WriteMemoryResponse = z.infer<typeof WriteMemoryResponseSchema>

export type MemorySection = "memory" | "user"
