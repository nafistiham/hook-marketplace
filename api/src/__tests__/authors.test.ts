import { describe, it, expect } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INDEX_WITH_TWO_HOOKS = JSON.stringify({
  schema_version: '1',
  generated_at: '2026-03-10T00:00:00Z',
  hooks: [
    {
      name: 'bash-danger-guard',
      description: 'Guards against dangerous bash commands',
      author: 'testuser',
      event: 'PreToolUse',
      tags: ['security'],
      capabilities: ['block'],
      security: { sandbox_level: 'none', reviewed: false, review_date: null, signed: false, signed_by: null, signature: null },
      latest: '1.0.0',
      versions: ['1.0.0'],
      updated_at: '2026-03-10T00:00:00Z',
    },
    {
      name: 'format-on-write',
      description: 'Auto-formats files after edits',
      author: 'otheruser',
      event: 'PostToolUse',
      tags: ['formatting'],
      capabilities: ['side-effects-only'],
      security: { sandbox_level: 'none', reviewed: false, review_date: null, signed: false, signed_by: null, signature: null },
      latest: '1.0.0',
      versions: ['1.0.0'],
      updated_at: '2026-03-10T00:00:00Z',
    },
  ],
})

function makeEnv(opts: {
  indexJson?: string
  clerkUser?: { id: string; username: string } | null
}) {
  return {
    HOOKPM_BUCKET: {
      get: async (key: string) => {
        if (key === 'index.json' && opts.indexJson) {
          return {
            text: async () => opts.indexJson!,
            arrayBuffer: async () => new ArrayBuffer(0),
            httpMetadata: { contentType: 'application/json' },
          }
        }
        return null
      },
      put: async () => {},
    },
    CLERK_PUBLIC_KEY: 'test-key',
    __TEST_CLERK_USER: opts.clerkUser !== undefined ? opts.clerkUser : null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /authors/me', () => {
  it('returns 401 when not authenticated', async () => {
    const env = makeEnv({ clerkUser: null })
    const res = await app.fetch(new Request('http://localhost/authors/me'), env)
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 200 with author profile and their hook names', async () => {
    const env = makeEnv({
      indexJson: INDEX_WITH_TWO_HOOKS,
      clerkUser: { id: 'user_123', username: 'testuser' },
    })
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: 'Bearer valid' },
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; username: string; hookNames: string[] }
    expect(body.username).toBe('testuser')
    expect(body.hookNames).toContain('bash-danger-guard')
    expect(body.hookNames).not.toContain('format-on-write') // owned by otheruser
  })
})

describe('GET /authors/:username/hooks', () => {
  it('returns hooks belonging to the given username', async () => {
    const env = makeEnv({ indexJson: INDEX_WITH_TWO_HOOKS })
    const res = await app.fetch(
      new Request('http://localhost/authors/testuser/hooks'),
      env,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { username: string; hooks: { name: string }[] }
    expect(body.username).toBe('testuser')
    expect(body.hooks).toHaveLength(1)
    expect(body.hooks[0]?.name).toBe('bash-danger-guard')
  })

  it('returns empty hooks array when author has no hooks', async () => {
    const env = makeEnv({ indexJson: INDEX_WITH_TWO_HOOKS })
    const res = await app.fetch(
      new Request('http://localhost/authors/unknown-author/hooks'),
      env,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { hooks: unknown[] }
    expect(body.hooks).toHaveLength(0)
  })

  it('returns 404 when index.json not in R2', async () => {
    const env = makeEnv({})
    const res = await app.fetch(
      new Request('http://localhost/authors/testuser/hooks'),
      env,
    )
    expect(res.status).toBe(404)
  })
})
