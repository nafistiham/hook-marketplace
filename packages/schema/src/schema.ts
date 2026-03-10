// Full implementation in schema TDD step
// See docs/design/2026-03-10-schema.md
import { z } from 'zod'

export const HookJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
})

export type HookJson = z.infer<typeof HookJsonSchema>

export const HookJsonRegistrySchema = HookJsonSchema

export type HookJsonRegistry = z.infer<typeof HookJsonRegistrySchema>

export const HookIndexSchema = z.object({
  schema_version: z.literal('1'),
  generated_at: z.string(),
  hooks: z.array(z.unknown()),
})

export type HookIndex = z.infer<typeof HookIndexSchema>
