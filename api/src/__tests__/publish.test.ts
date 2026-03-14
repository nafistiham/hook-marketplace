import { describe, it, expect, vi } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_HOOK_JSON = JSON.stringify({
  name: 'my-hook',
  version: '1.0.0',
  description: 'A test hook for publish endpoint tests',
  author: 'testuser',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'python3 hook.py', async: false },
  capabilities: ['block'],
  tags: ['test'],
  permissions: {
    network: { allowed: false, domains: [] },
    filesystem: { read: [], write: [] },
    env_vars: [],
    spawns_processes: false,
  },
  requires: { os: ['darwin', 'linux'], shell: ['bash', 'zsh', 'sh'] },
  security: {
    sandbox_level: 'none',
    reviewed: false,
    review_date: null,
    signed: false,
    signed_by: null,
    signature: null,
  },
})

const ARCHIVE_BYTES = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]) // minimal gzip bytes

function makeMultipart(hookJson: string, archive = ARCHIVE_BYTES): FormData {
  const form = new FormData()
  form.append('manifest', new Blob([hookJson], { type: 'application/json' }), 'hook.json')
  form.append('archive', new Blob([archive], { type: 'application/gzip' }), 'my-hook-1.0.0.tar.gz')
  return form
}

// ─── Mock R2 and DB ───────────────────────────────────────────────────────────

function makeEnv(opts: {
  r2Keys?: Set<string>
  clerkUserId?: string
  clerkUsername?: string
  dbError?: boolean
}) {
  const r2Store = new Map<string, string | Uint8Array>()
  const r2Keys = opts.r2Keys ?? new Set<string>()

  return {
    HOOKPM_BUCKET: {
      get: async (key: string) => {
        if (r2Keys.has(key)) return { text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0), httpMetadata: {} }
        return null
      },
      put: vi.fn(async (key: string, value: unknown) => {
        r2Store.set(key, value as string)
      }),
    },
    // Clerk public key for JWT verification (stub)
    CLERK_PUBLIC_KEY: 'test-public-key',
    // DB stub
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () =>
            opts.clerkUserId
              ? { id: 'author-uuid', username: opts.clerkUsername ?? 'testuser' }
              : null,
          ),
          run: vi.fn(async () => ({ success: !opts.dbError })),
        })),
      })),
    },
    // Simulated verified Clerk identity (set by auth middleware)
    __TEST_CLERK_USER: opts.clerkUserId
      ? { id: opts.clerkUserId, username: opts.clerkUsername ?? 'testuser' }
      : null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /registry/hooks (publish)', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const env = makeEnv({})
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', { method: 'POST' }),
      env,
    )
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 422 when hook.json fails schema validation', async () => {
    const env = makeEnv({ clerkUserId: 'user_123', clerkUsername: 'testuser' })
    const form = makeMultipart(JSON.stringify({ name: 'INVALID NAME', version: 'not-semver' }))
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 403 when hook author does not match authenticated user', async () => {
    const env = makeEnv({ clerkUserId: 'user_123', clerkUsername: 'differentuser' })
    const form = makeMultipart(VALID_HOOK_JSON) // author is 'testuser'
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(403)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 409 when name@version already exists in R2', async () => {
    const existingKeys = new Set(['hooks/my-hook/my-hook-1.0.0.tar.gz'])
    const env = makeEnv({ clerkUserId: 'user_123', clerkUsername: 'testuser', r2Keys: existingKeys })
    const form = makeMultipart(VALID_HOOK_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('CONFLICT')
  })

  it('returns 201 and uploads to R2 on valid publish', async () => {
    const env = makeEnv({ clerkUserId: 'user_123', clerkUsername: 'testuser' })
    const form = makeMultipart(VALID_HOOK_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(201)
    const body = await res.json() as { name: string; version: string }
    expect(body.name).toBe('my-hook')
    expect(body.version).toBe('1.0.0')
    // R2 put should have been called for manifest and archive
    expect(env.HOOKPM_BUCKET.put).toHaveBeenCalledWith(
      'hooks/my-hook/hook.json',
      expect.any(String),
      expect.objectContaining({ httpMetadata: { contentType: 'application/json' } }),
    )
    expect(env.HOOKPM_BUCKET.put).toHaveBeenCalledWith(
      'hooks/my-hook/my-hook-1.0.0.tar.gz',
      expect.any(ArrayBuffer),
      expect.objectContaining({ httpMetadata: { contentType: 'application/gzip' } }),
    )
  })

  it('regenerates and uploads index.json after successful publish', async () => {
    const existingIndex = JSON.stringify({
      schema_version: '1',
      generated_at: '2026-03-10T00:00:00Z',
      hooks: [],
    })

    const r2Store = new Map<string, string>([['index.json', existingIndex]])

    const env = {
      HOOKPM_BUCKET: {
        get: vi.fn(async (key: string) => {
          const val = r2Store.get(key)
          if (!val) return null
          return { text: async () => val, arrayBuffer: async () => new ArrayBuffer(0), httpMetadata: {} }
        }),
        put: vi.fn(async (key: string, value: unknown) => {
          r2Store.set(key, value as string)
        }),
      },
      CLERK_PUBLIC_KEY: 'test-public-key',
      __TEST_CLERK_USER: { id: 'user_123', username: 'testuser' },
    }

    const form = makeMultipart(VALID_HOOK_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )

    expect(res.status).toBe(201)

    // index.json should have been updated with the new hook
    expect(env.HOOKPM_BUCKET.put).toHaveBeenCalledWith(
      'index.json',
      expect.any(String),
      expect.objectContaining({ httpMetadata: { contentType: 'application/json' } }),
    )

    // Verify the stored index contains the published hook
    const updatedIndex = JSON.parse(r2Store.get('index.json') ?? '{}') as {
      hooks: { name: string; author: string }[]
    }
    expect(updatedIndex.hooks).toHaveLength(1)
    expect(updatedIndex.hooks[0]?.name).toBe('my-hook')
    expect(updatedIndex.hooks[0]?.author).toBe('testuser')
  })
})
