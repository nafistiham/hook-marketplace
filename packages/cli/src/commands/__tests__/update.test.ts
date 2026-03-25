import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { HookJsonRegistry } from '@hookpm/schema'
import type { Lockfile } from '../../settings/types.js'
import { RegistryError } from '../../registry/types.js'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../registry/client.js')
vi.mock('../../settings/merge.js')
vi.mock('../../settings/index.js')
vi.mock('../../security/index.js')
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

import { fetchHook, fetchIndex, downloadArchive } from '../../registry/client.js'
import { mergeHookIntoSettings, removeHookFromSettings } from '../../settings/merge.js'
import { readLockfile } from '../../settings/index.js'
import { checkCapabilities } from '../../security/index.js'

import { runUpdate } from '../update.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HOOK_V1: HookJsonRegistry = {
  name: 'bash-danger-guard',
  version: '1.0.0',
  description: 'Guards against dangerous bash commands',
  author: 'test-author',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'python3 guard.py', async: false },
  capabilities: ['block'],
  tags: ['security'],
  permissions: {
    network: { allowed: false, domains: [] },
    filesystem: { read: [], write: [] },
    env_vars: [],
    spawns_processes: false,
  },
  requires: { os: ['darwin', 'linux'], shell: ['bash'] },
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
}

const HOOK_V2: HookJsonRegistry = { ...HOOK_V1, version: '2.0.0' }

const LOCKFILE_WITH_HOOK: Lockfile = {
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

// ─── runUpdate ────────────────────────────────────────────────────────────────

describe('runUpdate()', () => {
  it('updates hook when newer version is available', async () => {
    vi.mocked(readLockfile).mockReturnValue(LOCKFILE_WITH_HOOK) // installed: 1.0.0
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK_V2 })  // latest: 2.0.0
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath: '/tmp/hookpm/hooks/bash-danger-guard@2.0.0',
      integrity: 'sha256-newchecksum',
    })
    vi.mocked(removeHookFromSettings).mockResolvedValue(undefined)
    vi.mocked(mergeHookIntoSettings).mockResolvedValue({ added: true, settingsIndex: 0, event: 'PreToolUse' })

    const { allOutput } = captureOutput()
    await runUpdate('bash-danger-guard', {})

    expect(vi.mocked(removeHookFromSettings)).toHaveBeenCalledWith('bash-danger-guard', expect.any(Object))
    expect(vi.mocked(downloadArchive)).toHaveBeenCalledWith('bash-danger-guard', '2.0.0')
    expect(vi.mocked(mergeHookIntoSettings)).toHaveBeenCalled()
    expect(allOutput()).toMatch(/updated/i)
    expect(allOutput()).toContain('2.0.0')
    expect(process.exitCode).not.toBe(1)
  })

  it('skips update when already at latest version', async () => {
    vi.mocked(readLockfile).mockReturnValue(LOCKFILE_WITH_HOOK) // installed: 1.0.0
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK_V1 }) // latest: also 1.0.0

    const { allOutput } = captureOutput()
    await runUpdate('bash-danger-guard', {})

    expect(vi.mocked(downloadArchive)).not.toHaveBeenCalled()
    expect(vi.mocked(removeHookFromSettings)).not.toHaveBeenCalled()
    expect(allOutput()).toMatch(/already.*(latest|up.to.date)/i)
    expect(process.exitCode).not.toBe(1)
  })

  it('sets exitCode 1 when hook is not installed', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)

    captureOutput()
    await runUpdate('bash-danger-guard', {})

    expect(process.exitCode).toBe(1)
    expect(vi.mocked(fetchHook)).not.toHaveBeenCalled()
  })

  it('sets exitCode 1 when registry fetch fails', async () => {
    vi.mocked(readLockfile).mockReturnValue(LOCKFILE_WITH_HOOK)
    vi.mocked(fetchHook).mockResolvedValue({
      ok: false,
      error: new RegistryError('not found', 'NOT_FOUND'),
    })

    captureOutput()
    await runUpdate('bash-danger-guard', {})

    expect(process.exitCode).toBe(1)
  })

  it('sets exitCode 1 when download fails', async () => {
    vi.mocked(readLockfile).mockReturnValue(LOCKFILE_WITH_HOOK)
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK_V2 })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: false,
      error: new RegistryError('network error', 'NETWORK_ERROR'),
    })

    captureOutput()
    await runUpdate('bash-danger-guard', {})

    expect(process.exitCode).toBe(1)
  })

  it('--all: updates multiple hooks', async () => {
    const lockfileTwo: Lockfile = {
      ...LOCKFILE_WITH_HOOK,
      hooks: {
        ...LOCKFILE_WITH_HOOK.hooks,
        'format-on-write': {
          version: '1.0.0',
          resolved: 'https://test.example.com/registry/hooks/format-on-write/format-on-write-1.0.0.tar.gz',
          integrity: 'sha256-def456',
          event: 'PostToolUse',
          settings_index: 0,
          installed: '2026-03-10T00:00:00Z',
          range: '^1.0.0',
        },
      },
    }
    vi.mocked(readLockfile).mockReturnValue(lockfileTwo)
    vi.mocked(fetchHook)
      .mockResolvedValueOnce({ ok: true, data: HOOK_V2 })
      .mockResolvedValueOnce({ ok: true, data: { ...HOOK_V1, name: 'format-on-write', version: '2.0.0' } })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath: '/tmp/hookpm/hooks/hook@2.0.0',
      integrity: 'sha256-new',
    })
    vi.mocked(removeHookFromSettings).mockResolvedValue(undefined)
    vi.mocked(mergeHookIntoSettings).mockResolvedValue({ added: true, settingsIndex: 0, event: 'PreToolUse' })

    const { allOutput } = captureOutput()
    await runUpdate(undefined, { all: true })

    expect(vi.mocked(fetchHook)).toHaveBeenCalledTimes(2)
    expect(allOutput()).toMatch(/2 updated/i)
    expect(process.exitCode).not.toBe(1)
  })

  it('--all: sets exitCode 1 when no hooks are installed', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)

    captureOutput()
    await runUpdate(undefined, { all: true })

    expect(process.exitCode).toBe(1)
  })
})
