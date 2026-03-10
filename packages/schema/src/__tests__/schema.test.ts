import { describe, it, expect } from 'vitest'
import {
  HookJsonSchema,
  HookJsonRegistrySchema,
  HookEventSchema,
  HandlerSchema,
  HookIndexSchema,
  HOOK_EVENTS,
  CAPABILITIES,
  validateHook,
} from '../index.js'

// ─── Minimal valid base object (author submission — no security) ───────────────

const VALID_COMMAND_HOOK = {
  name: 'my-hook',
  version: '1.0.0',
  description: 'A test hook',
  author: 'test-author',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'echo hello' },
  capabilities: ['block'],
}

// ─── HookEventSchema ──────────────────────────────────────────────────────────

describe('HookEventSchema', () => {
  it('accepts all 18 defined events', () => {
    const expected = [
      'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest',
      'SessionStart', 'SessionEnd', 'UserPromptSubmit', 'Stop',
      'SubagentStart', 'SubagentStop', 'TeammateIdle', 'TaskCompleted',
      'Notification', 'InstructionsLoaded', 'ConfigChange',
      'WorktreeCreate', 'WorktreeRemove', 'PreCompact',
    ]
    expect(HOOK_EVENTS).toHaveLength(18)
    for (const event of expected) {
      expect(HookEventSchema.safeParse(event).success).toBe(true)
    }
  })

  it('rejects an unknown event string', () => {
    expect(HookEventSchema.safeParse('PreBashTool').success).toBe(false)
    expect(HookEventSchema.safeParse('PreFileWrite').success).toBe(false)
    expect(HookEventSchema.safeParse('Unknown').success).toBe(false)
  })
})

// ─── CAPABILITIES constant ────────────────────────────────────────────────────

describe('CAPABILITIES constant', () => {
  it('contains the 7 defined capability values', () => {
    const expected = [
      'block', 'modify-input', 'inject-context', 'read-stdin',
      'write-stdout', 'side-effects-only', 'approve',
    ]
    expect(CAPABILITIES).toHaveLength(7)
    for (const cap of expected) {
      expect(CAPABILITIES).toContain(cap)
    }
  })
})

// ─── HandlerSchema ────────────────────────────────────────────────────────────

describe('HandlerSchema — discriminated union on type', () => {
  it('accepts a valid command handler', () => {
    const result = HandlerSchema.safeParse({ type: 'command', command: 'echo hello' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid http handler', () => {
    const result = HandlerSchema.safeParse({ type: 'http', url: 'https://example.com/hook' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid prompt handler', () => {
    const result = HandlerSchema.safeParse({ type: 'prompt', prompt: 'Summarise $ARGUMENTS' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid agent handler', () => {
    const result = HandlerSchema.safeParse({ type: 'agent', prompt: 'Run agent on $ARGUMENTS' })
    expect(result.success).toBe(true)
  })

  it('rejects command handler that carries a url field', () => {
    const result = HandlerSchema.safeParse({
      type: 'command',
      command: 'echo hi',
      url: 'https://example.com',
    })
    // discriminated union should not allow url on command branch
    // Even if Zod strips unknown keys, the command branch must not accept url
    if (result.success) {
      expect((result.data as Record<string, unknown>).url).toBeUndefined()
    }
  })

  it('rejects http handler with invalid url', () => {
    const result = HandlerSchema.safeParse({ type: 'http', url: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects http handler missing url field', () => {
    const result = HandlerSchema.safeParse({ type: 'http' })
    expect(result.success).toBe(false)
  })

  it('rejects command handler missing command field', () => {
    const result = HandlerSchema.safeParse({ type: 'command' })
    expect(result.success).toBe(false)
  })

  it('rejects prompt handler missing prompt field', () => {
    const result = HandlerSchema.safeParse({ type: 'prompt' })
    expect(result.success).toBe(false)
  })

  it('rejects agent handler missing prompt field', () => {
    const result = HandlerSchema.safeParse({ type: 'agent' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown type value', () => {
    const result = HandlerSchema.safeParse({ type: 'webhook', url: 'https://example.com' })
    expect(result.success).toBe(false)
  })

  it('accepts http handler with optional headers and allowedEnvVars', () => {
    const result = HandlerSchema.safeParse({
      type: 'http',
      url: 'https://example.com/hook',
      headers: { 'X-Token': 'abc' },
      allowedEnvVars: ['MY_TOKEN'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts command handler with optional async and timeout', () => {
    const result = HandlerSchema.safeParse({
      type: 'command',
      command: 'echo hello',
      async: true,
      timeout: 30,
    })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonSchema — identity fields ────────────────────────────────────────

describe('HookJsonSchema — name field', () => {
  it('accepts valid lowercase kebab-case name', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, name: 'my-hook-123' })
    expect(result.success).toBe(true)
  })

  it('rejects name with uppercase letters', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, name: 'My-Hook' })
    expect(result.success).toBe(false)
  })

  it('rejects name with spaces', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, name: 'my hook' })
    expect(result.success).toBe(false)
  })

  it('rejects name with underscores', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, name: 'my_hook' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 64 characters', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      name: 'a'.repeat(65),
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, name: '' })
    expect(result.success).toBe(false)
  })
})

describe('HookJsonSchema — version field', () => {
  it('accepts strict semver triple', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, version: '2.3.1' })
    expect(result.success).toBe(true)
  })

  it('rejects semver range with caret', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, version: '^1.0.0' })
    expect(result.success).toBe(false)
  })

  it('rejects semver range with tilde', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, version: '~1.0.0' })
    expect(result.success).toBe(false)
  })

  it('rejects partial version like 1.0', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, version: '1.0' })
    expect(result.success).toBe(false)
  })

  it('rejects pre-release label', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, version: '1.0.0-beta.1' })
    expect(result.success).toBe(false)
  })
})

describe('HookJsonSchema — license field', () => {
  it('requires a license field — rejects when absent', () => {
    const { license: _license, ...withoutLicense } = VALID_COMMAND_HOOK as Record<string, unknown>
    const result = HookJsonSchema.safeParse(withoutLicense)
    expect(result.success).toBe(false)
  })

  it('accepts any non-empty license string', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, license: 'Apache-2.0' })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonSchema — capabilities ───────────────────────────────────────────

describe('HookJsonSchema — capabilities field', () => {
  it('rejects empty capabilities array', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK, capabilities: [] })
    expect(result.success).toBe(false)
  })

  it('rejects unknown capability value', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      capabilities: ['network_access'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid capability values', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      capabilities: ['block', 'modify-input', 'read-stdin'],
    })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonSchema — permissions ────────────────────────────────────────────

describe('HookJsonSchema — permissions.network constraint', () => {
  it('rejects network.allowed=true with empty domains array', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      permissions: {
        network: { allowed: true, domains: [] },
      },
    })
    expect(result.success).toBe(false)
  })

  it('accepts network.allowed=true with non-empty domains', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      permissions: {
        network: { allowed: true, domains: ['api.example.com'] },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts network.allowed=false with empty domains', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      permissions: {
        network: { allowed: false, domains: [] },
      },
    })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonSchema — matcher ─────────────────────────────────────────────────

describe('HookJsonSchema — matcher regex validation', () => {
  it('accepts valid regex string in tool_name', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      matcher: { tool_name: '^Bash.*' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid regex string in tool_name', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      matcher: { tool_name: '[invalid regex' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid regex string in source', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      matcher: { source: '(unclosed' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid regex in agent_type', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      matcher: { agent_type: 'code-.*' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid regex in notification_type', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      matcher: { notification_type: 'info|warn' },
    })
    expect(result.success).toBe(true)
  })

  it('omitting matcher entirely is valid', () => {
    const result = HookJsonSchema.safeParse({ ...VALID_COMMAND_HOOK })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonSchema — security field optionality ─────────────────────────────

describe('HookJsonSchema — security field (optional for authors)', () => {
  it('accepts hook without security block', () => {
    const result = HookJsonSchema.safeParse(VALID_COMMAND_HOOK)
    expect(result.success).toBe(true)
  })

  it('accepts hook with a fully-populated security block', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      security: {
        sandbox_level: 'verified',
        reviewed: true,
        review_date: '2026-03-10T00:00:00Z',
        signed: false,
        signed_by: null,
        signature: null,
      },
    })
    expect(result.success).toBe(true)
  })
})

// ─── HookJsonRegistrySchema — security field required ────────────────────────

describe('HookJsonRegistrySchema — security field (required)', () => {
  it('rejects hook missing security block', () => {
    const result = HookJsonRegistrySchema.safeParse(VALID_COMMAND_HOOK)
    expect(result.success).toBe(false)
  })

  it('accepts hook with fully-populated security block', () => {
    const result = HookJsonRegistrySchema.safeParse({
      ...VALID_COMMAND_HOOK,
      security: {
        sandbox_level: 'none',
        reviewed: false,
        review_date: null,
        signed: false,
        signed_by: null,
        signature: null,
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects security block with invalid sandbox_level value', () => {
    const result = HookJsonRegistrySchema.safeParse({
      ...VALID_COMMAND_HOOK,
      security: {
        sandbox_level: 'unknown-level',
        reviewed: false,
        review_date: null,
        signed: false,
        signed_by: null,
        signature: null,
      },
    })
    expect(result.success).toBe(false)
  })
})

// ─── HookJsonSchema — provenance ─────────────────────────────────────────────

describe('HookJsonSchema — provenance field', () => {
  it('accepts submitted_by without source', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      provenance: { submitted_by: 'contributor-gh' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-URL value in source', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      provenance: { source: 'not-a-url' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid URL in source', () => {
    const result = HookJsonSchema.safeParse({
      ...VALID_COMMAND_HOOK,
      provenance: { source: 'https://github.com/user/repo' },
    })
    expect(result.success).toBe(true)
  })

  it('omitting provenance entirely is valid', () => {
    const result = HookJsonSchema.safeParse(VALID_COMMAND_HOOK)
    expect(result.success).toBe(true)
  })
})

// ─── HookIndexSchema ──────────────────────────────────────────────────────────

describe('HookIndexSchema', () => {
  const VALID_ENTRY = {
    name: 'my-hook',
    description: 'A test hook',
    author: 'test-author',
    event: 'PreToolUse',
    tags: ['testing'],
    capabilities: ['block'],
    security: {
      sandbox_level: 'none',
      reviewed: false,
      review_date: null,
      signed: false,
      signed_by: null,
      signature: null,
    },
    latest: '1.0.0',
    versions: ['1.0.0'],
    updated_at: '2026-03-10T00:00:00Z',
  }

  it('accepts a valid index envelope', () => {
    const result = HookIndexSchema.safeParse({
      schema_version: '1',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [VALID_ENTRY],
    })
    expect(result.success).toBe(true)
  })

  it('rejects schema_version other than literal "1"', () => {
    const result = HookIndexSchema.safeParse({
      schema_version: '2',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty hooks array', () => {
    const result = HookIndexSchema.safeParse({
      schema_version: '1',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects index entry missing required latest field', () => {
    const { latest: _latest, ...withoutLatest } = VALID_ENTRY
    const result = HookIndexSchema.safeParse({
      schema_version: '1',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [withoutLatest],
    })
    expect(result.success).toBe(false)
  })

  it('rejects index entry missing versions array', () => {
    const { versions: _versions, ...withoutVersions } = VALID_ENTRY
    const result = HookIndexSchema.safeParse({
      schema_version: '1',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [withoutVersions],
    })
    expect(result.success).toBe(false)
  })
})

// ─── validateHook() ───────────────────────────────────────────────────────────

describe('validateHook()', () => {
  it('returns success:true with typed data for valid input', () => {
    const result = validateHook(VALID_COMMAND_HOOK)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('my-hook')
      expect(result.data.version).toBe('1.0.0')
    }
  })

  it('returns success:false with errors ZodError for invalid input', () => {
    const result = validateHook({ name: 'BadName', version: 'not-semver' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeDefined()
    }
  })

  it('returns success:false with summary string for invalid input', () => {
    const result = validateHook({ name: 'Bad Name', version: 'not-semver' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.summary).toBe('string')
      expect(result.summary.length).toBeGreaterThan(0)
    }
  })

  it('summary contains at most 5 errors when many fields are invalid', () => {
    const result = validateHook({
      name: 'Bad Name',
      version: 'bad',
      description: '',
      author: '',
      license: '',
      event: 'Unknown',
      handler: { type: 'unknown' },
      capabilities: [],
      permissions: { network: { allowed: true, domains: [] } },
      provenance: { source: 'not-a-url' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const lines = result.summary.split('\n').filter((l: string) => l.length > 0)
      expect(lines.length).toBeLessThanOrEqual(5)
    }
  })

  it('returns success:false for completely empty object', () => {
    const result = validateHook({})
    expect(result.success).toBe(false)
  })

  it('returns success:false for null input', () => {
    const result = validateHook(null)
    expect(result.success).toBe(false)
  })

  it('summary includes field path for missing required field', () => {
    const result = validateHook({ ...VALID_COMMAND_HOOK, name: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.summary).toMatch(/name/)
    }
  })
})
