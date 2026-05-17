/**
 * Session feature types — extends shared types with UI-specific fields.
 */
import { z } from "zod"
import { SessionMetaSchema } from "@hermium/types"

// Matches the Session type from lib/types.ts but with feature-specific additions
export const SessionSchema = SessionMetaSchema.extend({
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
})

export type Session = z.infer<typeof SessionSchema>

export const CreateSessionSchema = z.object({
  workspace: z.string().optional(),
  model: z.string().optional(),
})

export type CreateSession = z.infer<typeof CreateSessionSchema>

export const UpdateSessionSchema = z.object({
  session_id: z.string(),
  title: z.string().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
})

export type UpdateSession = z.infer<typeof UpdateSessionSchema>
