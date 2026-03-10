import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { HookJsonRegistry, HookIndex, HookIndexEntry } from '@hookpm/schema'
import type { Lockfile } from '../../settings/types.js'
import { RegistryError } from '../../registry/types.js'
import { NotInstalledError } from '../../settings/types.js'

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

// Import commands AFTER mocks are set up
import { runInstall } from '../install.js'
import { runRemove } from '../remove.js'
import { runList } from '../list.js'
import { runSearch } from '../search.js'
import { runInfo } from '../info.js'

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

const INDEX_ENTRY: HookIndexEntry = {
  name: 'bash-danger-guard',
  description: 'Guards against dangerous bash commands',
  author: 'test-author',
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
}

const VALID_INDEX: HookIndex = {
  schema_version: '1',
  generated_at: '2026-03-10T00:00:00Z',
  hooks: [INDEX_ENTRY],
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

// ─── runList ──────────────────────────────────────────────────────────────────

describe('runList()', () => {
  it('shows no-hooks message when lockfile is empty', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)
    const { allOutput } = captureOutput()
    await runList()
    expect(allOutput()).toMatch(/no hooks installed/i)
  })

  it('shows table of installed hooks', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    const { allOutput } = captureOutput()
    await runList()
    expect(allOutput()).toContain('bash-danger-guard')
    expect(allOutput()).toContain('1.0.0')
    expect(allOutput()).toContain('PreToolUse')
  })
})

// ─── runSearch ────────────────────────────────────────────────────────────────

describe('runSearch()', () => {
  it('shows all hooks when no query provided', async () => {
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: VALID_INDEX })
    const { allOutput } = captureOutput()
    await runSearch()
    expect(allOutput()).toContain('bash-danger-guard')
  })

  it('filters hooks by query matching name', async () => {
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: VALID_INDEX })
    const { allOutput } = captureOutput()
    await runSearch('bash')
    expect(allOutput()).toContain('bash-danger-guard')
  })

  it('shows no results message when query matches nothing', async () => {
    vi.mocked(fetchIndex).mockResolvedValue({ ok: true, data: VALID_INDEX })
    const { allOutput, allErrors } = captureOutput()
    await runSearch('nonexistent-xyz')
    const combined = allOutput() + allErrors()
    expect(combined).toMatch(/no hooks found/i)
  })

  it('sets exitCode 1 on registry error', async () => {
    vi.mocked(fetchIndex).mockResolvedValue({
      ok: false,
      error: new RegistryError('network down', 'NETWORK_ERROR'),
    })
    captureOutput()
    await runSearch()
    expect(process.exitCode).toBe(1)
  })
})

// ─── runInfo ──────────────────────────────────────────────────────────────────

describe('runInfo()', () => {
  it('displays hook details on success', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    const { allOutput } = captureOutput()
    await runInfo('bash-danger-guard')
    expect(allOutput()).toContain('bash-danger-guard')
    expect(allOutput()).toContain('1.0.0')
  })

  it('sets exitCode 1 when hook not found', async () => {
    vi.mocked(fetchHook).mockResolvedValue({
      ok: false,
      error: new RegistryError('not found', 'NOT_FOUND'),
    })
    captureOutput()
    await runInfo('nonexistent')
    expect(process.exitCode).toBe(1)
  })
})

// ─── runRemove ────────────────────────────────────────────────────────────────

describe('runRemove()', () => {
  it('removes hook and shows success message', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    vi.mocked(removeHookFromSettings).mockResolvedValue(undefined)
    const { allOutput } = captureOutput()
    await runRemove('bash-danger-guard')
    expect(allOutput()).toContain('bash-danger-guard')
    expect(process.exitCode).not.toBe(1)
  })

  it('sets exitCode 1 when hook not in lockfile', async () => {
    vi.mocked(readLockfile).mockReturnValue(EMPTY_LOCKFILE)
    captureOutput()
    await runRemove('bash-danger-guard')
    expect(process.exitCode).toBe(1)
  })

  it('sets exitCode 1 on removal error', async () => {
    vi.mocked(readLockfile).mockReturnValue(ONE_HOOK_LOCKFILE)
    vi.mocked(removeHookFromSettings).mockRejectedValue(
      new NotInstalledError('not found'),
    )
    captureOutput()
    await runRemove('bash-danger-guard')
    expect(process.exitCode).toBe(1)
  })
})

// ─── runInstall ───────────────────────────────────────────────────────────────

describe('runInstall()', () => {
  it('installs hook successfully — no dangerous capabilities', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath: '/tmp/hookpm/hooks/bash-danger-guard@1.0.0',
      integrity: 'sha256-abc123',
    })
    vi.mocked(mergeHookIntoSettings).mockResolvedValue({
      added: true,
      settingsIndex: 0,
      event: 'PreToolUse',
    })
    const { allOutput } = captureOutput()
    await runInstall('bash-danger-guard', {})
    expect(allOutput()).toMatch(/installed/i)
    expect(allOutput()).toContain('bash-danger-guard')
    expect(process.exitCode).not.toBe(1)
  })

  it('sets exitCode 1 when fetchHook fails', async () => {
    vi.mocked(fetchHook).mockResolvedValue({
      ok: false,
      error: new RegistryError('not found', 'NOT_FOUND'),
    })
    captureOutput()
    await runInstall('nonexistent', {})
    expect(process.exitCode).toBe(1)
  })

  it('sets exitCode 1 when downloadArchive fails', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: false,
      error: new RegistryError('network error', 'NETWORK_ERROR'),
    })
    captureOutput()
    await runInstall('bash-danger-guard', {})
    expect(process.exitCode).toBe(1)
  })

  it('aborts with exitCode 2 when user declines dangerous capability prompt', async () => {
    const hookWithDanger = {
      ...HOOK,
      capabilities: ['block'] as ('block')[],
    }
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: hookWithDanger })
    vi.mocked(checkCapabilities).mockReturnValue({
      dangerous: true,
      capabilities: ['shell_exec'],
    })
    // Simulate non-TTY (confirm returns false)
    captureOutput()
    await runInstall('bash-danger-guard', {})
    // In non-TTY mode, confirm() returns false → abort
    expect(process.exitCode).toBe(2)
    expect(vi.mocked(downloadArchive)).not.toHaveBeenCalled()
  })
})
