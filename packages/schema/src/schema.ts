import { z } from 'zod'

// ─── Event ────────────────────────────────────────────────────────────────────

export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PermissionRequest',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'TeammateIdle',
  'TaskCompleted',
  'Notification',
  'InstructionsLoaded',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'PreCompact',
] as const

export const HookEventSchema = z.enum(HOOK_EVENTS)
export type HookEvent = z.infer<typeof HookEventSchema>

// ─── Capabilities ─────────────────────────────────────────────────────────────

export const CAPABILITIES = [
  'block',
  'modify-input',
  'inject-context',
  'read-stdin',
  'write-stdout',
  'side-effects-only',
  'approve',
] as const

export const CapabilitySchema = z.enum(CAPABILITIES)
export type HookCapability = z.infer<typeof CapabilitySchema>

// ─── Handler — discriminated union ───────────────────────────────────────────

const BaseHandlerSchema = z.object({
  timeout: z.number().int().positive().optional(),
})

const CommandHandlerSchema = BaseHandlerSchema.extend({
  type: z.literal('command'),
  command: z.string().min(1),
  async: z.boolean().default(false),
})

const HttpHandlerSchema = BaseHandlerSchema.extend({
  type: z.literal('http'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  allowedEnvVars: z.array(z.string()).optional(),
})

const PromptHandlerSchema = BaseHandlerSchema.extend({
  type: z.literal('prompt'),
  prompt: z.string().min(1),
  model: z.string().optional(),
})

const AgentHandlerSchema = BaseHandlerSchema.extend({
  type: z.literal('agent'),
  prompt: z.string().min(1),
  model: z.string().optional(),
})

export const HandlerSchema = z.discriminatedUnion('type', [
  CommandHandlerSchema,
  HttpHandlerSchema,
  PromptHandlerSchema,
  AgentHandlerSchema,
])

export type HookHandler = z.infer<typeof HandlerSchema>
export type CommandHandler = z.infer<typeof CommandHandlerSchema>
export type HttpHandler = z.infer<typeof HttpHandlerSchema>
export type PromptHandler = z.infer<typeof PromptHandlerSchema>
export type AgentHandler = z.infer<typeof AgentHandlerSchema>

// ─── Matcher ─────────────────────────────────────────────────────────────────

const regexString = z.string().superRefine((val, ctx) => {
  try {
    new RegExp(val)
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid regex: ${val}` })
  }
})

const MatcherSchema = z
  .object({
    tool_name: regexString.optional(),
    source: regexString.optional(),
    agent_type: regexString.optional(),
    notification_type: regexString.optional(),
  })
  .optional()

// ─── Permissions ─────────────────────────────────────────────────────────────

const NetworkPermissionsSchema = z.object({
  allowed: z.boolean(),
  domains: z.array(z.string()).default([]),
})

const FilesystemPermissionsSchema = z.object({
  read: z.array(z.string()).default([]),
  write: z.array(z.string()).default([]),
})

const PermissionsSchema = z
  .object({
    network: NetworkPermissionsSchema.default({ allowed: false, domains: [] }),
    filesystem: FilesystemPermissionsSchema.default({ read: [], write: [] }),
    env_vars: z.array(z.string()).default([]),
    spawns_processes: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.network.allowed && val.network.domains.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'network.domains must list specific domains when network.allowed is true',
        path: ['network', 'domains'],
      })
    }
  })

// ─── Tags and Requires ───────────────────────────────────────────────────────

const TagsSchema = z.array(z.string().min(1).max(32)).default([])

const RequiresSchema = z
  .object({
    claude_code_version: z.string().optional(),
    os: z
      .array(z.enum(['darwin', 'linux', 'windows']))
      .default(['darwin', 'linux', 'windows']),
    shell: z
      .array(z.enum(['bash', 'zsh', 'sh', 'fish', 'pwsh']))
      .default(['bash', 'zsh', 'sh']),
  })
  .default({})

// ─── Security ────────────────────────────────────────────────────────────────

export const SandboxLevelSchema = z.enum([
  'none',
  'static-analysis',
  'verified',
  'certified',
])

export type SandboxLevel = z.infer<typeof SandboxLevelSchema>

export const SecuritySchema = z.object({
  sandbox_level: SandboxLevelSchema.default('none'),
  reviewed: z.boolean().default(false),
  review_date: z.string().nullable().default(null),
  signed: z.boolean().default(false),
  signed_by: z.string().nullable().default(null),
  signature: z.string().nullable().default(null),
})

export type HookSecurity = z.infer<typeof SecuritySchema>

// ─── Identity ────────────────────────────────────────────────────────────────

const IdentitySchema = z.object({
  $schema: z.string().url().optional(),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'name must be lowercase kebab-case'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'version must be semver (MAJOR.MINOR.PATCH)'),
  description: z.string().min(1).max(280),
  author: z.string().min(1).max(64),
  license: z.string().min(1),
  homepage: z.string().url().optional(),
})

// ─── Provenance ──────────────────────────────────────────────────────────────

const ProvenanceSchema = z
  .object({
    source: z.string().url().optional(),
    submitted_by: z.string().optional(),
  })
  .optional()

// ─── Root schemas ─────────────────────────────────────────────────────────────

export const HookJsonSchema = z.object({
  ...IdentitySchema.shape,
  event: HookEventSchema,
  matcher: MatcherSchema,
  handler: HandlerSchema,
  permissions: PermissionsSchema.default({}),
  capabilities: z.array(CapabilitySchema).min(1),
  tags: TagsSchema,
  requires: RequiresSchema,
  security: SecuritySchema.optional(),
  provenance: ProvenanceSchema,
})

export type HookJson = z.infer<typeof HookJsonSchema>

export const HookJsonRegistrySchema = HookJsonSchema.extend({
  security: SecuritySchema,
})

export type HookJsonRegistry = z.infer<typeof HookJsonRegistrySchema>

// ─── Index Entry ─────────────────────────────────────────────────────────────

export const HookIndexEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  author: z.string(),
  event: HookEventSchema,
  tags: z.array(z.string()),
  capabilities: z.array(CapabilitySchema),
  security: SecuritySchema,
  latest: z.string(),
  versions: z.array(z.string()),
  source: z.string().url().optional(),
  submitted_by: z.string().optional(),
  updated_at: z.string(),
})

export type HookIndexEntry = z.infer<typeof HookIndexEntrySchema>

export const HookIndexSchema = z.object({
  schema_version: z.literal('1'),
  generated_at: z.string(),
  hooks: z.array(HookIndexEntrySchema),
})

export type HookIndex = z.infer<typeof HookIndexSchema>
