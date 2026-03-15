import { describe, it, expect, vi } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HOOK_INDEX = JSON.stringify({
  schema_version: '1',
  generated_at: '2026-03-15T00:00:00Z',
  hooks: [
    {
      name: 'test-hook',
      description: 'A test hook',
      author: 'testuser',
      event: 'PreToolUse',
      tags: [],
      capabilities: ['block'],
      security: {
        sandbox_level: 'static-analysis',
        reviewed: false,
        review_date: null,
        signed: false,
        signed_by: null,
        signature: null,
        calls_external_api: false,
        spawns_subprocess: false,
      },
      attestations: [],
      rating_count: 3,
      rating_avg: 4.0,
      latest: '1.0.0',
      versions: ['1.0.0'],
      updated_at: '2026-03-15T00:00:00Z',
    },
  ],
})

// ─── Mock env helpers ─────────────────────────────────────────────────────────

type KVStore = Map<string, string>

function makeR2(indexJson?: string) {
  const r2Store = new Map<string, string>()
  if (indexJson !== undefined) {
    r2Store.set('index.json', indexJson)
  }
  return {
    get: vi.fn(async (key: string) => {
      const value = r2Store.get(key)
      if (value === undefined) return null
      return {
        text: async () => value,
        arrayBuffer: async () => new ArrayBuffer(0),
        httpMetadata: {},
      }
    }),
    put: vi.fn(async (key: string, value: unknown) => {
      r2Store.set(key, value as string)
    }),
    _store: r2Store,
  }
}

function makeKV(initial: KVStore = new Map()) {
  const store = new Map(initial)
  return {
    get: vi.fn(async (key: string): Promise<string | null> => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
    delete: vi.fn(async (key: string) => { store.delete(key) }),
    _store: store,
  }
}

function makeEnv(opts: {
  hasIndex?: boolean
  testUser?: { id: string; username: string } | null
  kvCount?: number
  supabaseUrl?: string
  supabaseKey?: string
} = {}) {
  const hasIndex = opts.hasIndex !== false  // default true
  const testUser = opts.testUser !== undefined
    ? opts.testUser
    : { id: 'user_test_123', username: 'testuser' }

  const kvStore: KVStore = new Map()
  if (opts.kvCount !== undefined) {
    kvStore.set('rate:user_test_123:ratings', String(opts.kvCount))
  }

  return {
    HOOKPM_BUCKET: makeR2(hasIndex ? HOOK_INDEX : undefined),
    AUTH_KV: makeKV(kvStore),
    __TEST_CLERK_USER: testUser,
    ...(opts.supabaseUrl ? { SUPABASE_URL: opts.supabaseUrl } : {}),
    ...(opts.supabaseKey ? { SUPABASE_SERVICE_KEY: opts.supabaseKey } : {}),
  }
}

async function postRate(hookName: string, body: unknown, env: ReturnType<typeof makeEnv>) {
  return app.fetch(
    new Request(`http://localhost/registry/hooks/${hookName}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify(body),
    }),
    env,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /registry/hooks/:name/rate', () => {
  it('returns 401 when no auth (TEST_CLERK_USER is null)', async () => {
    const env = makeEnv({ testUser: null })
    const res = await postRate('test-hook', { score: 4 }, env)
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 422 INVALID_SCORE for score = 0 (below range)', async () => {
    const env = makeEnv()
    const res = await postRate('test-hook', { score: 0 }, env)
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
    expect(body.error.message).toBe('score must be an integer between 1 and 5')
  })

  it('returns 422 INVALID_SCORE for score = 6 (above range)', async () => {
    const env = makeEnv()
    const res = await postRate('test-hook', { score: 6 }, env)
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
    expect(body.error.message).toBe('score must be an integer between 1 and 5')
  })

  it('returns 422 INVALID_SCORE for non-integer score (e.g. 3.5)', async () => {
    const env = makeEnv()
    const res = await postRate('test-hook', { score: 3.5 }, env)
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
    expect(body.error.message).toBe('score must be an integer between 1 and 5')
  })

  it('returns 404 HOOK_NOT_FOUND when hook is not in the index', async () => {
    const env = makeEnv({ hasIndex: true })
    const res = await postRate('nonexistent-hook', { score: 4 }, env)
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('HOOK_NOT_FOUND')
    expect(body.error.message).toContain('nonexistent-hook')
  })

  it('returns 200 with ok:true and rating fields when Supabase is not configured', async () => {
    const env = makeEnv()
    const res = await postRate('test-hook', { score: 5 }, env)
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; rating_avg: number; rating_count: number }
    expect(body.ok).toBe(true)
    expect(typeof body.rating_avg).toBe('number')
    expect(typeof body.rating_count).toBe('number')
  })

  it('returns 429 RATE_LIMITED when KV counter is already at 10', async () => {
    const env = makeEnv({ kvCount: 10 })
    const res = await postRate('test-hook', { score: 3 }, env)
    expect(res.status).toBe(429)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('increments KV counter after a successful rating', async () => {
    const env = makeEnv({ kvCount: 2 })
    const res = await postRate('test-hook', { score: 4 }, env)
    expect(res.status).toBe(200)
    expect(env.AUTH_KV.put).toHaveBeenCalledWith(
      'rate:user_test_123:ratings',
      '3',
      { expirationTtl: 3600 },
    )
  })
})
