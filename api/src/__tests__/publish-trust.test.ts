import { describe, it, expect, vi } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A hook with a command handler — no network or subprocess patterns */
const COMMAND_HOOK_JSON = JSON.stringify({
  name: 'safe-hook',
  version: '1.0.0',
  description: 'A hook with a plain command handler',
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
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: [],
})

/** A hook with an http handler — calls_external_api must be true */
const HTTP_HOOK_JSON = JSON.stringify({
  name: 'http-hook',
  version: '1.0.0',
  description: 'A hook that calls an external HTTP endpoint',
  author: 'testuser',
  license: 'MIT',
  event: 'PostToolUse',
  handler: { type: 'http', url: 'https://example.com/webhook' },
  capabilities: ['read-stdin'],
  tags: ['http'],
  permissions: {
    network: { allowed: true, domains: ['example.com'] },
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
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: [],
})

/** http handler + no-network attestation — should cause ATTESTATION_CONFLICT */
const HTTP_HOOK_WITH_NO_NETWORK_ATTESTATION = JSON.stringify({
  name: 'conflicted-hook',
  version: '1.0.0',
  description: 'A hook that attests no-network but uses http handler',
  author: 'testuser',
  license: 'MIT',
  event: 'PostToolUse',
  handler: { type: 'http', url: 'https://example.com/webhook' },
  capabilities: ['read-stdin'],
  tags: ['http'],
  permissions: {
    network: { allowed: true, domains: ['example.com'] },
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
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: ['no-network'],
})

/** Command that uses spawn() — no-subprocess attestation should conflict */
const SPAWN_HOOK_WITH_NO_SUBPROCESS_ATTESTATION = JSON.stringify({
  name: 'spawn-conflicted-hook',
  version: '1.0.0',
  description: 'A hook that attests no-subprocess but spawns',
  author: 'testuser',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'node -e "spawn(\'ls\')"', async: false },
  capabilities: ['block'],
  tags: ['test'],
  permissions: {
    network: { allowed: false, domains: [] },
    filesystem: { read: [], write: [] },
    env_vars: [],
    spawns_processes: true,
  },
  requires: { os: ['darwin', 'linux'], shell: ['bash', 'zsh', 'sh'] },
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
  attestations: ['no-subprocess'],
})

/** http hook with explicit attestations to preserve */
const HTTP_HOOK_WITH_ATTESTATIONS_JSON = JSON.stringify({
  name: 'attested-hook',
  version: '1.0.0',
  description: 'A hook with attestations that should be preserved',
  author: 'testuser',
  license: 'MIT',
  event: 'PostToolUse',
  handler: { type: 'http', url: 'https://example.com/webhook' },
  capabilities: ['read-stdin'],
  tags: ['http'],
  permissions: {
    network: { allowed: true, domains: ['example.com'] },
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
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: ['read-only'],
})

const ARCHIVE_BYTES = new Uint8Array([0x1f, 0x8b, 0x08, 0x00])

function makeMultipart(hookJson: string, archive = ARCHIVE_BYTES): FormData {
  const form = new FormData()
  form.append('manifest', new Blob([hookJson], { type: 'application/json' }), 'hook.json')
  form.append('archive', new Blob([archive], { type: 'application/gzip' }), 'hook-1.0.0.tar.gz')
  return form
}

// ─── Mock R2 ──────────────────────────────────────────────────────────────────

function makeEnv(opts: { r2Keys?: Set<string> } = {}) {
  const r2Store = new Map<string, string | Uint8Array>()
  const r2Keys = opts.r2Keys ?? new Set<string>()

  return {
    HOOKPM_BUCKET: {
      get: async (key: string) => {
        if (r2Keys.has(key)) {
          return { text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0), httpMetadata: {} }
        }
        return null
      },
      put: vi.fn(async (key: string, value: unknown) => {
        r2Store.set(key, value as string)
      }),
      _store: r2Store,
    },
    __TEST_CLERK_USER: { id: 'user_123', username: 'testuser' },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /registry/hooks — static analysis gate and attestation consistency', () => {
  it('sets calls_external_api: true in stored manifest when handler is http type', async () => {
    const env = makeEnv()
    const form = makeMultipart(HTTP_HOOK_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(201)

    // Retrieve the stored manifest from R2 store
    const stored = env.HOOKPM_BUCKET._store.get('hooks/http-hook/hook.json')
    expect(stored).toBeDefined()
    const manifest = JSON.parse(stored as string) as { security: { calls_external_api: boolean } }
    expect(manifest.security.calls_external_api).toBe(true)
  })

  it('returns 400 ATTESTATION_CONFLICT when no-network attested but http handler detected', async () => {
    const env = makeEnv()
    const form = makeMultipart(HTTP_HOOK_WITH_NO_NETWORK_ATTESTATION)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; error: string; conflicts: { attestation: string; reason: string }[] }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('ATTESTATION_CONFLICT')
    expect(body.conflicts).toHaveLength(1)
    expect(body.conflicts[0]?.attestation).toBe('no-network')
    expect(typeof body.conflicts[0]?.reason).toBe('string')
  })

  it('returns 400 ATTESTATION_CONFLICT when no-subprocess attested but spawn detected', async () => {
    const env = makeEnv()
    const form = makeMultipart(SPAWN_HOOK_WITH_NO_SUBPROCESS_ATTESTATION)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; error: string; conflicts: { attestation: string; reason: string }[] }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('ATTESTATION_CONFLICT')
    expect(body.conflicts).toHaveLength(1)
    expect(body.conflicts[0]?.attestation).toBe('no-subprocess')
  })

  it('preserves attestations in stored manifest after successful publish', async () => {
    const env = makeEnv()
    const form = makeMultipart(HTTP_HOOK_WITH_ATTESTATIONS_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(201)

    const stored = env.HOOKPM_BUCKET._store.get('hooks/attested-hook/hook.json')
    expect(stored).toBeDefined()
    const manifest = JSON.parse(stored as string) as { attestations: string[] }
    expect(manifest.attestations).toContain('read-only')
  })

  it('sets sandbox_level to static-analysis in stored manifest after publish', async () => {
    const env = makeEnv()
    const form = makeMultipart(COMMAND_HOOK_JSON)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(201)

    const stored = env.HOOKPM_BUCKET._store.get('hooks/safe-hook/hook.json')
    expect(stored).toBeDefined()
    const manifest = JSON.parse(stored as string) as { security: { sandbox_level: string } }
    expect(manifest.security.sandbox_level).toBe('static-analysis')
  })

  it('does not store manifest when attestation conflict is detected', async () => {
    const env = makeEnv()
    const form = makeMultipart(HTTP_HOOK_WITH_NO_NETWORK_ATTESTATION)
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks', {
        method: 'POST',
        body: form,
        headers: { Authorization: 'Bearer valid-token' },
      }),
      env,
    )
    expect(res.status).toBe(400)
    // R2 put should NOT have been called for manifest or archive
    expect(env.HOOKPM_BUCKET.put).not.toHaveBeenCalled()
  })
})
