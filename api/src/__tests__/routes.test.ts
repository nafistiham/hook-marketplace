import { describe, it, expect, beforeEach } from 'vitest'
import app from '../index.js'

// ─── Mock R2 bucket ───────────────────────────────────────────────────────────

const INDEX_JSON = JSON.stringify({
  schema_version: '1',
  generated_at: '2026-03-10T00:00:00Z',
  hooks: [
    {
      name: 'bash-danger-guard',
      description: 'Guards against dangerous bash commands',
      author: 'hookpm',
      event: 'PreToolUse',
      tags: ['security', 'bash'],
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
    },
  ],
})

const HOOK_JSON = JSON.stringify({
  name: 'bash-danger-guard',
  version: '1.0.0',
  description: 'Guards against dangerous bash commands',
  author: 'hookpm',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'python3 guard.py', async: false },
  capabilities: ['block'],
  tags: ['security', 'bash'],
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

const ARCHIVE_BYTES = new Uint8Array([0x1f, 0x8b, 0x08]) // minimal gzip header

function makeR2Store(store: Map<string, string | Uint8Array>) {
  return {
    get: async (key: string) => {
      const val = store.get(key)
      if (val === undefined) return null
      const body = typeof val === 'string' ? val : val
      const isText = typeof val === 'string'
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(typeof body === 'string' ? new TextEncoder().encode(body) : body)
            controller.close()
          },
        }),
        httpMetadata: {
          contentType: isText ? 'application/json' : 'application/gzip',
        },
        arrayBuffer: async () => {
          if (typeof val === 'string') return new TextEncoder().encode(val).buffer
          return val.buffer
        },
        text: async () => (typeof val === 'string' ? val : new TextDecoder().decode(val)),
      }
    },
  }
}

function makeEnv(store: Map<string, string | Uint8Array>) {
  return { HOOKPM_BUCKET: makeR2Store(store) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const env = makeEnv(new Map())
    const res = await app.fetch(new Request('http://localhost/health'), env)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string }
    expect(body.status).toBe('ok')
  })
})

describe('GET /registry/index.json', () => {
  it('returns 200 with index content from R2', async () => {
    const store = new Map<string, string>([['index.json', INDEX_JSON]])
    const env = makeEnv(store)
    const res = await app.fetch(new Request('http://localhost/registry/index.json'), env)
    expect(res.status).toBe(200)
    const body = await res.json() as { schema_version: string }
    expect(body.schema_version).toBe('1')
  })

  it('returns 404 when index.json not in R2', async () => {
    const env = makeEnv(new Map())
    const res = await app.fetch(new Request('http://localhost/registry/index.json'), env)
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('GET /registry/hooks/:name/hook.json', () => {
  it('returns 200 with hook manifest from R2', async () => {
    const store = new Map<string, string>([
      ['hooks/bash-danger-guard/hook.json', HOOK_JSON],
    ])
    const env = makeEnv(store)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard/hook.json'),
      env,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { name: string }
    expect(body.name).toBe('bash-danger-guard')
  })

  it('returns 404 when hook not in R2', async () => {
    const env = makeEnv(new Map())
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/nonexistent/hook.json'),
      env,
    )
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('GET /registry/hooks/:name/:filename (archive)', () => {
  it('returns 200 with archive bytes from R2', async () => {
    const store = new Map<string, string | Uint8Array>([
      ['hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz', ARCHIVE_BYTES],
    ])
    const env = makeEnv(store)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz'),
      env,
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/gzip')
  })

  it('returns 404 when archive not in R2', async () => {
    const env = makeEnv(new Map())
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/nonexistent/nonexistent-1.0.0.tar.gz'),
      env,
    )
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
