import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { HookJsonRegistry, HookIndex, HookIndexEntry } from '@hookpm/schema'
import type { Lockfile } from '../../settings/types.js'
import { RegistryError } from '../../registry/types.js'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../registry/client.js')
vi.mock('../../settings/index.js')
vi.mock('node:child_process')
vi.mock('../../config.js', () => ({
  config: {
    registryUrl: 'https://test.example.com/registry',
    registryTimeout: 5_000,
    downloadTimeout: 10_000,
    hookpmDir: '/tmp/hookpm',
    settingsPath: '/tmp/.claude/settings.json',
    lockfilePath: '/tmp/hookpm.lock',
    submitUrl: 'https://test.example.com/submit',
  },
}))

import { fetchHook } from '../../registry/client.js'
import { readLockfile } from '../../settings/index.js'
import * as cp from 'node:child_process'

import { runVerify } from '../verify.js'
import { runPublish } from '../publish.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HOOK: HookJsonRegistry = {
  name: 'bash-danger-guard',
  version: '1.0.0',
  description: 'Guards against dangerous bash commands',
  author: 'test-author',
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
  requires: { os: ['darwin', 'linux', 'windows'], shell: ['bash', 'zsh', 'sh'] },
  security: {
    sandbox_level: 'none',
    reviewed: false,
    review_date: null,
    signed: false,
    signed_by: null,
    signature: null,
  },
}

const ONE_HOOK_LOCKFILE: Lockfile = {
  version: '1',
  generated: '2026-03-10T00:00:00Z',
  registry: 'https://test.example.com/registry',
  hooks: {
    'bash-danger-guard': {
      version: '1.0.0',
      resolved: 'https://test.example.com/registry/hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz',
      integrity: 'sha256-abc123',
      event: 'PreToolUse',
      settings_index: 0,
      installed: '2026-03-10T00:00:00Z',
      range: '^1.0.0',
    },
  },
}

const EMPTY_LOCKFILE: Lockfile = {
  version: '1',
  generated: '2026-03-10T00:00:00Z',
  registry: 'https://test.example.com/registry',
  hooks: {},
}

// ─── Output capture ───────────────────────────────────────────────────────────

function captureOutput() {
  const stdout: string[] = []
  const stderr: string[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { stderr.push(String(chunk)); return true })
  return {
    stdout,
    stderr,
    allOutput: () => stdout.join(''),
    allErrors: () => stderr.join(''),
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.exitCode = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = 0
})

// ─── runVerify ────────────────────────────────────────────────────────────────

describe('runVerify()', () => {
  it('shows success for each installed hook that passes schema validation', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    const { allOutput } = captureOutput()
    await runVerify()
    expect(allOutput()).toContain('bash-danger-guard')
    expect(process.exitCode).not.toBe(1)
  })

  it('shows no-hooks message when lockfile is empty', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)
    const { allOutput } = captureOutput()
    await runVerify()
    expect(allOutput()).toMatch(/no hooks installed/i)
  })

  it('sets exitCode 1 and continues when fetchHook fails for one hook', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    vi.mocked(fetchHook).mockResolvedValue({
      ok: false,
      error: new RegistryError('not found', 'NOT_FOUND'),
    })
    const { allErrors } = captureOutput()
    await runVerify()
    expect(allErrors()).toContain('bash-danger-guard')
    expect(process.exitCode).toBe(1)
  })

  it('verifies only the named hook when name is provided', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    const { allOutput } = captureOutput()
    await runVerify('bash-danger-guard')
    expect(fetchHook).toHaveBeenCalledWith('bash-danger-guard', '1.0.0')
    expect(allOutput()).toContain('bash-danger-guard')
  })

  it('sets exitCode 1 when named hook is not in lockfile', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)
    captureOutput()
    await runVerify('nonexistent')
    expect(process.exitCode).toBe(1)
  })
})

// ─── runPublish ───────────────────────────────────────────────────────────────

describe('runPublish()', () => {
  it('outputs submission info message', async () => {
    vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)
    const { allOutput } = captureOutput()
    await runPublish()
    expect(allOutput()).toMatch(/submit|publish|browser/i)
  })

  it('calls spawn to open submitUrl in browser', async () => {
    const mockSpawn = vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)
    captureOutput()
    await runPublish()
    expect(mockSpawn).toHaveBeenCalled()
    const args = mockSpawn.mock.calls[0]
    // URL should appear somewhere in the spawn call args
    const allArgs = args ? args.flat().join(' ') : ''
    expect(allArgs).toContain('test.example.com/submit')
  })
})
