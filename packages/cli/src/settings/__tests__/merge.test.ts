import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { mergeHookIntoSettings, removeHookFromSettings, buildHandlerConfig } from '../merge.js'
import { readSettings, readLockfile } from '../index.js'
import { NotInstalledError } from '../types.js'
import type { HookJsonRegistry } from '@hookpm/schema'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const FIXTURES = path.join(import.meta.dirname, 'fixtures')

function copyFixture(name: string, targetDir: string): string {
  const src = path.join(FIXTURES, 'settings', name)
  const dest = path.join(targetDir, 'settings.json')
  fs.copyFileSync(src, dest)
  return dest
}

function makePaths(targetDir: string) {
  return {
    settingsPath: path.join(targetDir, 'settings.json'),
    lockfilePath: path.join(targetDir, 'hookpm.lock'),
  }
}

function makeHook(overrides: Partial<HookJsonRegistry> = {}): HookJsonRegistry {
  return {
    name: 'bash-danger-guard',
    version: '1.0.0',
    description: 'Guards against dangerous bash commands',
    author: 'test-author',
    license: 'MIT',
    event: 'PreToolUse',
    handler: { type: 'command', command: 'python3 guard.py', async: false },
    capabilities: ['block'],
    tags: [],
    permissions: { network: { allowed: false, domains: [] }, filesystem: { read: [], write: [] }, env_vars: [], spawns_processes: false },
    requires: { os: ['darwin', 'linux', 'windows'], shell: ['bash', 'zsh', 'sh'] },
    security: {
      sandbox_level: 'none',
      reviewed: false,
      review_date: null,
      signed: false,
      signed_by: null,
      signature: null,
    },
    ...overrides,
  }
}

// ─── Test setup ───────────────────────────────────────────────────────────────

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-merge-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── buildHandlerConfig ───────────────────────────────────────────────────────

describe('buildHandlerConfig()', () => {
  it('builds command handler config with resolved path', () => {
    const hook = makeHook()
    const config = buildHandlerConfig(hook.handler, '/hooks/bash-danger-guard@1.0.0')
    expect(config.type).toBe('command')
    expect(config.command).toBe('python3 /hooks/bash-danger-guard@1.0.0/guard.py')
  })

  it('includes timeout when set', () => {
    const hook = makeHook({
      handler: { type: 'command', command: 'node script.js', timeout: 30, async: false },
    })
    const config = buildHandlerConfig(hook.handler, '/hooks/foo')
    expect(config.timeout).toBe(30)
  })

  it('builds http handler config', () => {
    const hook = makeHook({
      handler: {
        type: 'http',
        url: 'https://api.example.com/hook',
        headers: { 'X-Token': 'val' },
        allowedEnvVars: ['MY_VAR'],
      },
    })
    const config = buildHandlerConfig(hook.handler, '/hooks/foo')
    expect(config.type).toBe('http')
    expect(config.url).toBe('https://api.example.com/hook')
    expect(config.headers).toEqual({ 'X-Token': 'val' })
    expect(config.allowedEnvVars).toEqual(['MY_VAR'])
  })

  it('builds prompt handler config', () => {
    const hook = makeHook({
      handler: { type: 'prompt', prompt: 'Summarize $ARGUMENTS', model: 'claude-haiku' },
    })
    const config = buildHandlerConfig(hook.handler, '/hooks/foo')
    expect(config.type).toBe('prompt')
    expect(config.prompt).toBe('Summarize $ARGUMENTS')
    expect(config.model).toBe('claude-haiku')
  })

  it('builds agent handler config', () => {
    const hook = makeHook({
      handler: { type: 'agent', prompt: 'Run analysis on $ARGUMENTS' },
    })
    const config = buildHandlerConfig(hook.handler, '/hooks/foo')
    expect(config.type).toBe('agent')
    expect(config.prompt).toBe('Run analysis on $ARGUMENTS')
  })
})

// ─── mergeHookIntoSettings — fresh install ────────────────────────────────────

describe('mergeHookIntoSettings() — fresh install', () => {
  it('creates hooks.PreToolUse when settings has no hooks key', async () => {
    copyFixture('no-hooks-key.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    const result = await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    expect(result.added).toBe(true)
    expect(result.event).toBe('PreToolUse')
    const settings = readSettings(paths.settingsPath)
    expect(settings.hooks?.['PreToolUse']).toHaveLength(1)
  })

  it('appends to existing hooks in same event without removing user entries', async () => {
    copyFixture('with-existing.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    const settings = readSettings(paths.settingsPath)
    // user entry preserved + hookpm entry appended
    expect(settings.hooks?.['PreToolUse']).toHaveLength(2)
    expect(settings.hooks?.['PreToolUse']?.[0]?.matcher?.tool_name).toBe('^Bash')
  })

  it('does not touch other event arrays', async () => {
    copyFixture('multi-event.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook({ event: 'PreToolUse' })
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    const settings = readSettings(paths.settingsPath)
    expect(settings.hooks?.['PostToolUse']).toHaveLength(1)
    expect(settings.hooks?.['PostToolUse']?.[0]?.hooks?.[0]?.command).toBe('/usr/local/bin/post-hook.sh')
  })

  it('writes lockfile entry after install', async () => {
    copyFixture('empty.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, {
      installedPath: '/hooks/bash-danger-guard@1.0.0',
    })
    const lock = readLockfile(paths.lockfilePath)
    expect(lock.hooks['bash-danger-guard']).toBeDefined()
    expect(lock.hooks['bash-danger-guard']?.version).toBe('1.0.0')
    expect(lock.hooks['bash-danger-guard']?.event).toBe('PreToolUse')
  })

  it('returns correct settingsIndex in MergeResult', async () => {
    copyFixture('with-existing.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    const result = await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })
    // appended after existing user entry → index 1
    expect(result.settingsIndex).toBe(1)
  })
})

// ─── mergeHookIntoSettings — prepend ─────────────────────────────────────────

describe('mergeHookIntoSettings() — prepend', () => {
  it('inserts hookpm entry at index 0', async () => {
    copyFixture('with-existing.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    const result = await mergeHookIntoSettings(hook, paths, {
      installedPath: '/hooks/bash-danger-guard@1.0.0',
      prepend: true,
    })
    expect(result.settingsIndex).toBe(0)
    const settings = readSettings(paths.settingsPath)
    // hookpm entry is at [0], user entry at [1]
    const preToolUse = settings.hooks?.['PreToolUse'] ?? []
    expect(preToolUse[0]?.hooks[0]?.command).toContain('guard.py')
    expect(preToolUse[1]?.matcher?.tool_name).toBe('^Bash')
  })
})

// ─── mergeHookIntoSettings — upgrade (replace) ───────────────────────────────

describe('mergeHookIntoSettings() — upgrade', () => {
  it('replaces existing entry at same index when hook is already installed', async () => {
    // Install first
    copyFixture('empty.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    // Upgrade
    const upgraded = makeHook({ version: '1.1.0' })
    const result = await mergeHookIntoSettings(upgraded, paths, {
      installedPath: '/hooks/bash-danger-guard@1.1.0',
    })

    expect(result.added).toBe(false)
    expect(result.settingsIndex).toBe(0)
    const settings = readSettings(paths.settingsPath)
    // Still only one entry — replaced, not appended
    expect(settings.hooks?.['PreToolUse']).toHaveLength(1)
    const lockfile = readLockfile(paths.lockfilePath)
    expect(lockfile.hooks['bash-danger-guard']?.version).toBe('1.1.0')
  })
})

// ─── mergeHookIntoSettings — matcher ─────────────────────────────────────────

describe('mergeHookIntoSettings() — matcher', () => {
  it('includes matcher in HookEntry when hook has matcher', async () => {
    copyFixture('empty.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook({ matcher: { tool_name: '^Bash' } })
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    const settings = readSettings(paths.settingsPath)
    const entry = settings.hooks?.['PreToolUse']?.[0]
    expect(entry?.matcher?.tool_name).toBe('^Bash')
  })

  it('omits matcher from HookEntry when hook has no matcher', async () => {
    copyFixture('empty.json', tmpDir)
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    const settings = readSettings(paths.settingsPath)
    const entry = settings.hooks?.['PreToolUse']?.[0]
    expect(entry?.matcher).toBeUndefined()
  })
})
