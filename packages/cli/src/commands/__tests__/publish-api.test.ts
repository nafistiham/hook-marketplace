import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../config.js', () => ({
  config: {
    registryUrl: 'https://test.example.com/registry',
    apiUrl: 'https://test.example.com/api',
    registryTimeout: 5_000,
    downloadTimeout: 10_000,
    hookpmDir: '/tmp/hookpm-test',
    settingsPath: '/tmp/.claude/settings.json',
    lockfilePath: '/tmp/hookpm-test.lock',
    submitUrl: 'https://test.example.com/submit',
  },
}))

import { runPublishApi } from '../publish-api.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_HOOK_JSON = {
  name: 'my-hook',
  version: '1.0.0',
  description: 'A test hook',
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
}

const VALID_AUTH = JSON.stringify({
  clerk_token: 'valid-jwt',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  username: 'testuser',
})

const EXPIRED_AUTH = JSON.stringify({
  clerk_token: 'expired-jwt',
  expires_at: new Date(Date.now() - 1000).toISOString(),
  username: 'testuser',
})

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string

function captureOutput() {
  const lines: string[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { lines.push(String(chunk)); return true })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { lines.push(String(chunk)); return true })
  return { allOutput: () => lines.join('') }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-publish-test-'))
  vi.clearAllMocks()
  process.exitCode = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = 0
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runPublishApi()', () => {
  it('exits 1 with "not logged in" message when auth.json missing', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    fs.writeFileSync(path.join(hookDir, 'hook.json'), JSON.stringify(VALID_HOOK_JSON))

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/not logged in/i)
  })

  it('exits 1 with "session expired" message when token is expired', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, EXPIRED_AUTH)

    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    fs.writeFileSync(path.join(hookDir, 'hook.json'), JSON.stringify(VALID_HOOK_JSON))

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/expired/i)
  })

  it('exits 1 with error when hook.json not found in hookDir', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, VALID_AUTH)

    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    // No hook.json in hookDir

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/hook\.json/i)
  })

  it('exits 1 when hook.json author does not match auth username', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    const authWithDiffUser = JSON.stringify({
      clerk_token: 'valid-jwt',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      username: 'differentuser',
    })
    fs.writeFileSync(authPath, authWithDiffUser)

    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    fs.writeFileSync(path.join(hookDir, 'hook.json'), JSON.stringify(VALID_HOOK_JSON))
    fs.writeFileSync(path.join(hookDir, 'hook.py'), '# stub')

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/author|username/i)
  })

  it('POSTs multipart to API with manifest and archive on success', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, VALID_AUTH)

    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    fs.writeFileSync(path.join(hookDir, 'hook.json'), JSON.stringify(VALID_HOOK_JSON))
    fs.writeFileSync(path.join(hookDir, 'hook.py'), '# stub')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'my-hook', version: '1.0.0' }), { status: 201 }),
    )

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).not.toBe(1)
    expect(allOutput()).toMatch(/my-hook|1\.0\.0/i)

    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(String(url)).toContain('/registry/hooks')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer valid-jwt',
    })
  })

  it('exits 1 and shows specific error for API 409 conflict', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, VALID_AUTH)

    const hookDir = path.join(tmpDir, 'hook')
    fs.mkdirSync(hookDir)
    fs.writeFileSync(path.join(hookDir, 'hook.json'), JSON.stringify(VALID_HOOK_JSON))
    fs.writeFileSync(path.join(hookDir, 'hook.py'), '# stub')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'CONFLICT', message: 'already exists' } }), { status: 409 }),
    )

    const { allOutput } = captureOutput()
    await runPublishApi({ authPath, hookDir })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/already published|version|bump/i)
  })
})
