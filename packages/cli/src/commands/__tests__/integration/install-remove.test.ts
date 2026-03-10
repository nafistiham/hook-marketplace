/**
 * Integration tests for install + list + remove commands.
 * Mocks: HTTP layer (fetchHook, downloadArchive) + security check.
 * Real: settings.json and lockfile file system writes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { HookJsonRegistry } from '@hookpm/schema'

// ─── Config mock — hoisted so it's available before imports ──────────────────

const mockConfig = vi.hoisted(() => ({
  registryUrl: 'https://test.example.com/registry',
  registryTimeout: 5_000,
  downloadTimeout: 10_000,
  hookpmDir: '',       // set per-test in beforeEach
  settingsPath: '',    // set per-test in beforeEach
  lockfilePath: '',    // set per-test in beforeEach
  submitUrl: 'https://test.example.com/submit',
}))

vi.mock('../../../config.js', () => ({ config: mockConfig }))
vi.mock('../../../registry/client.js')
vi.mock('../../../security/index.js')

import { fetchHook, downloadArchive } from '../../../registry/client.js'
import { checkCapabilities } from '../../../security/index.js'

import { runInstall } from '../../install.js'
import { runRemove } from '../../remove.js'
import { runList } from '../../list.js'

// ─── Fixture ──────────────────────────────────────────────────────────────────

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
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string
let installedPath: string

beforeEach(() => {
  vi.clearAllMocks()
  process.exitCode = 0

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-int-'))
  installedPath = path.join(tmpDir, 'hooks', 'bash-danger-guard@1.0.0')
  fs.mkdirSync(installedPath, { recursive: true })

  mockConfig.hookpmDir = tmpDir
  mockConfig.settingsPath = path.join(tmpDir, 'settings.json')
  mockConfig.lockfilePath = path.join(tmpDir, 'hookpm.lock')

  // Seed an empty settings.json
  fs.writeFileSync(mockConfig.settingsPath, JSON.stringify({}), 'utf8')
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = 0
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('install + list round-trip', () => {
  it('installs a hook and list shows it', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath,
      integrity: 'sha256-abc123',
    })

    captureOutput()
    await runInstall('bash-danger-guard', {})
    expect(process.exitCode).not.toBe(1)

    // Verify lockfile was written
    const lockfile = JSON.parse(fs.readFileSync(mockConfig.lockfilePath, 'utf8'))
    expect(lockfile.hooks['bash-danger-guard']).toBeDefined()
    expect(lockfile.hooks['bash-danger-guard'].version).toBe('1.0.0')

    // Verify settings.json was written
    const settings = JSON.parse(fs.readFileSync(mockConfig.settingsPath, 'utf8'))
    expect(settings.hooks?.PreToolUse).toBeDefined()
    expect(settings.hooks.PreToolUse).toHaveLength(1)

    // runList shows the installed hook
    const { allOutput } = captureOutput()
    await runList()
    expect(allOutput()).toContain('bash-danger-guard')
    expect(allOutput()).toContain('1.0.0')
  })
})

describe('install + remove round-trip', () => {
  it('removes hook and settings.json is restored to pre-install state', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath,
      integrity: 'sha256-abc123',
    })

    const settingsBefore = fs.readFileSync(mockConfig.settingsPath, 'utf8')

    captureOutput()
    await runInstall('bash-danger-guard', {})

    captureOutput()
    await runRemove('bash-danger-guard')
    expect(process.exitCode).not.toBe(1)

    // Lockfile should no longer contain the hook
    const lockfile = JSON.parse(fs.readFileSync(mockConfig.lockfilePath, 'utf8'))
    expect(lockfile.hooks['bash-danger-guard']).toBeUndefined()

    // Settings event array should be empty ([] not deleted)
    const settings = JSON.parse(fs.readFileSync(mockConfig.settingsPath, 'utf8'))
    expect(settings.hooks?.PreToolUse).toHaveLength(0)

    // Structural shape should match pre-install (no extra keys added)
    const before = JSON.parse(settingsBefore)
    expect(Object.keys(settings)).toEqual(expect.arrayContaining(Object.keys(before)))
  })
})

describe('install idempotency', () => {
  it('running install twice does not create duplicate entries', async () => {
    vi.mocked(fetchHook).mockResolvedValue({ ok: true, data: HOOK })
    vi.mocked(checkCapabilities).mockReturnValue({ dangerous: false })
    vi.mocked(downloadArchive).mockResolvedValue({
      ok: true,
      installedPath,
      integrity: 'sha256-abc123',
    })

    captureOutput()
    await runInstall('bash-danger-guard', {})
    await runInstall('bash-danger-guard', {})

    const settings = JSON.parse(fs.readFileSync(mockConfig.settingsPath, 'utf8'))
    // Should only have one entry (upgrade, not duplicate)
    expect(settings.hooks?.PreToolUse).toHaveLength(1)

    const lockfile = JSON.parse(fs.readFileSync(mockConfig.lockfilePath, 'utf8'))
    expect(Object.keys(lockfile.hooks)).toHaveLength(1)
  })
})
