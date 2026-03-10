import type { ZodError } from 'zod'
import { HookJsonSchema } from './schema.js'
import type { HookJson } from './schema.js'

export type ValidationSuccess = {
  success: true
  data: HookJson
}

export type ValidationFailure = {
  success: false
  errors: ZodError
  summary: string
}

export type ValidationResult = ValidationSuccess | ValidationFailure

export function validateHook(json: unknown): ValidationResult {
  const result = HookJsonSchema.safeParse(json)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    errors: result.error,
    summary: result.error.errors
      .slice(0, 5)
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n'),
  }
}
