import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { mergeHookIntoSettings, removeHookFromSettings } from '../merge.js'
import { readSettings, readLockfile } from '../index.js'
import { NotInstalledError } from '../types.js'
import type { HookJsonRegistry } from '@hookpm/schema'


function makePaths(dir: string) {
  return {
    settingsPath: path.join(dir, 'settings.json'),
    lockfilePath: path.join(dir, 'hookpm.lock'),
  }
}

function makeHook(overrides: Partial<HookJsonRegistry> = {}): HookJsonRegistry {
  return {
    name: 'bash-danger-guard',
    version: '1.0.0',
    description: 'Test hook',
    author: 'test-author',
    license: 'MIT',
    event: 'PreToolUse',
    handler: { type: 'command', command: 'python3 guard.py', async: false },
    capabilities: ['block'],
    tags: [],
    permissions: { network: { allowed: false, domains: [] }, filesystem: { read: [], write: [] }, env_vars: [], spawns_processes: false },
    requires: { os: ['darwin', 'linux', 'windows'], shell: ['bash', 'zsh', 'sh'] },
    security: { sandbox_level: 'none', reviewed: false, review_date: null, signed: false, signed_by: null, signature: null },
    ...overrides,
  }
}

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-remove-'))
  // start with empty settings
  fs.writeFileSync(path.join(tmpDir, 'settings.json'), '{}', 'utf8')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('removeHookFromSettings()', () => {
  it('throws NotInstalledError when hook is not in lockfile', async () => {
    const paths = makePaths(tmpDir)
    await expect(removeHookFromSettings('nonexistent-hook', paths)).rejects.toThrow(NotInstalledError)
  })

  it('removes the hook entry from settings.json', async () => {
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    await removeHookFromSettings('bash-danger-guard', paths)

    const settings = readSettings(paths.settingsPath)
    expect(settings.hooks?.['PreToolUse']).toEqual([])
  })

  it('removes hook from lockfile after removal', async () => {
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    await removeHookFromSettings('bash-danger-guard', paths)

    const lock = readLockfile(paths.lockfilePath)
    expect(lock.hooks['bash-danger-guard']).toBeUndefined()
  })

  it('preserves other user entries in the same event when removing', async () => {
    const paths = makePaths(tmpDir)
    // Start with a user entry
    fs.writeFileSync(
      paths.settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: { tool_name: '^Bash' }, hooks: [{ type: 'command', command: '/usr/local/bin/user-hook.sh' }] },
          ],
        },
      }, null, 2),
      'utf8',
    )
    // Install our hook (appended at index 1)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    await removeHookFromSettings('bash-danger-guard', paths)

    const settings = readSettings(paths.settingsPath)
    expect(settings.hooks?.['PreToolUse']).toHaveLength(1)
    expect(settings.hooks?.['PreToolUse']?.[0]?.matcher?.tool_name).toBe('^Bash')
  })

  it('decrements settings_index for other lockfile entries in the same event when removing at lower index', async () => {
    const paths = makePaths(tmpDir)
    // Install two hooks
    const hook1 = makeHook({ name: 'hook-a' })
    const hook2 = makeHook({ name: 'hook-b' })
    await mergeHookIntoSettings(hook1, paths, { installedPath: '/hooks/hook-a@1.0.0' })
    await mergeHookIntoSettings(hook2, paths, { installedPath: '/hooks/hook-b@1.0.0' })

    // Remove hook-a (index 0) — hook-b's index should decrement from 1 to 0
    await removeHookFromSettings('hook-a', paths)

    const lock = readLockfile(paths.lockfilePath)
    expect(lock.hooks['hook-b']?.settings_index).toBe(0)
  })

  it('leaves event array as [] (not deleted) when removing the last entry', async () => {
    const paths = makePaths(tmpDir)
    const hook = makeHook()
    await mergeHookIntoSettings(hook, paths, { installedPath: '/hooks/bash-danger-guard@1.0.0' })

    await removeHookFromSettings('bash-danger-guard', paths)

    const settings = readSettings(paths.settingsPath)
    // Key should still exist with empty array
    expect(settings.hooks?.['PreToolUse']).toBeDefined()
    expect(settings.hooks?.['PreToolUse']).toEqual([])
  })
})
