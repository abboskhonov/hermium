/**
 * Re-export shared types from @hermium/types.
 *
 * Kept as a local shim so existing imports don't break.
 * Prefer importing directly from @hermium/types in new code.
 */
export * from "@hermium/types"

import { z } from "zod"

// ─── API response envelopes (web-specific wrappers) ─────────────────────────

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data })

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
})

export const ApiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: z.string(), code: z.string().optional() }),
  ])
