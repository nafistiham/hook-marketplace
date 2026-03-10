// Full implementation in schema TDD step
// See docs/design/2026-03-10-schema.md
import { HookJsonSchema } from './schema.js'
import type { HookJson } from './schema.js'

export type ValidateResult =
  | { ok: true; data: HookJson }
  | { ok: false; errors: string[] }

export function validateHook(input: unknown): ValidateResult {
  const result = HookJsonSchema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  }
}
