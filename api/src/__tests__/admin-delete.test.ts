import { describe, it, expect, vi } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INDEX_WITH_HOOK = JSON.stringify({
  schema_version: '1',
  generated_at: '2026-03-10T00:00:00Z',
  hooks: [
    {
      name: 'bash-danger-guard',
      description: 'Guards against dangerous bash commands',
      author: 'hookpm',
      event: 'PreToolUse',
      tags: ['security'],
      capabilities: ['block'],
      security: {
        sandbox_level: 'none',
        reviewed: false,
        review_date: null,
        signed: false,
        signed_by: null,
        signature: null,
        calls_external_api: false,
        spawns_subprocess: false,
      },
      attestations: [],
      rating_count: 0,
      rating_avg: 0,
      latest: '1.0.0',
      versions: ['1.0.0'],
      updated_at: '2026-03-10T00:00:00Z',
    },
  ],
})

const ADMIN_TOKEN = 'test-admin-secret'

// ─── Mock factory ─────────────────────────────────────────────────────────────

function makeEnv(store: Map<string, string | Uint8Array>) {
  const deleteSpy = vi.fn(async (_key: string) => undefined)
  const putSpy = vi.fn(async (_key: string, _value: unknown) => undefined)

  const bucket = {
    get: async (key: string) => {
      const val = store.get(key)
      if (val === undefined) return null
      return {
        text: async () => (typeof val === 'string' ? val : new TextDecoder().decode(val)),
        arrayBuffer: async () => (typeof val === 'string' ? new TextEncoder().encode(val).buffer : val.buffer),
        httpMetadata: { contentType: 'application/json' },
      }
    },
    put: putSpy,
    delete: deleteSpy,
    list: vi.fn(async (opts: { prefix: string }) => ({
      objects: [...store.keys()]
        .filter((k) => k.startsWith(opts.prefix))
        .map((k) => ({ key: k })),
      truncated: false,
    })),
  }

  return { HOOKPM_BUCKET: bucket, ADMIN_TOKEN, deleteSpy, putSpy }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DELETE /registry/hooks/:name', () => {
  it('returns 403 when admin token is missing', async () => {
    const store = new Map([['index.json', INDEX_WITH_HOOK]])
    const { HOOKPM_BUCKET, ADMIN_TOKEN: token } = makeEnv(store)

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard', { method: 'DELETE' }),
      { HOOKPM_BUCKET, ADMIN_TOKEN: token },
    )

    expect(res.status).toBe(403)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 403 when admin token is wrong', async () => {
    const store = new Map([['index.json', INDEX_WITH_HOOK]])
    const { HOOKPM_BUCKET, ADMIN_TOKEN: token } = makeEnv(store)

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard', {
        method: 'DELETE',
        headers: { 'X-Admin-Token': 'wrong-token' },
      }),
      { HOOKPM_BUCKET, ADMIN_TOKEN: token },
    )

    expect(res.status).toBe(403)
  })

  it('returns 404 when hook is not in the index', async () => {
    const store = new Map([['index.json', INDEX_WITH_HOOK]])
    const { HOOKPM_BUCKET, ADMIN_TOKEN: token } = makeEnv(store)

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/nonexistent-hook', {
        method: 'DELETE',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
      }),
      { HOOKPM_BUCKET, ADMIN_TOKEN: token },
    )

    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('deletes hook from R2 and removes it from index.json', async () => {
    const store = new Map<string, string | Uint8Array>([
      ['index.json', INDEX_WITH_HOOK],
      ['hooks/bash-danger-guard/hook.json', '{}'],
      ['hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz', new Uint8Array([0x1f, 0x8b])],
    ])
    const { HOOKPM_BUCKET, ADMIN_TOKEN: token, deleteSpy, putSpy } = makeEnv(store)

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard', {
        method: 'DELETE',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
      }),
      { HOOKPM_BUCKET, ADMIN_TOKEN: token },
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { deleted: boolean; name: string }
    expect(body.deleted).toBe(true)
    expect(body.name).toBe('bash-danger-guard')

    // All R2 objects under hooks/bash-danger-guard/ were deleted
    expect(deleteSpy).toHaveBeenCalled()
    // index.json was rewritten without the deleted hook
    expect(putSpy).toHaveBeenCalledWith(
      'index.json',
      expect.stringContaining('"hooks":'),
      expect.any(Object),
    )

    // The rewritten index should not contain the deleted hook
    const indexArg = putSpy.mock.calls.find(([key]) => key === 'index.json')
    expect(indexArg).toBeDefined()
    const updatedIndex = JSON.parse(indexArg![1] as string)
    expect(updatedIndex.hooks.find((h: { name: string }) => h.name === 'bash-danger-guard')).toBeUndefined()
  })
})
