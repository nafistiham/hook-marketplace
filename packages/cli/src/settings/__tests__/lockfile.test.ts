import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { readLockfile, writeLockfile } from '../index.js'
import type { Lockfile } from '../types.js'

const FIXTURES = path.join(import.meta.dirname, 'fixtures')
const EMPTY_LOCKFILE: Lockfile = {
  version: '1',
  generated: expect.any(String) as unknown as string,
  registry: '',
  hooks: {},
}

// ─── readLockfile ─────────────────────────────────────────────────────────────

describe('readLockfile()', () => {
  it('returns empty lockfile when file does not exist', () => {
    const result = readLockfile('/nonexistent/path/hookpm.lock')
    expect(result.version).toBe('1')
    expect(result.hooks).toEqual({})
  })

  it('parses a valid empty lockfile', () => {
    const p = path.join(FIXTURES, 'lockfiles', 'empty.lock')
    const result = readLockfile(p)
    expect(result.version).toBe('1')
    expect(result.hooks).toEqual({})
  })

  it('parses a lockfile with one hook entry', () => {
    const p = path.join(FIXTURES, 'lockfiles', 'one-hook.lock')
    const result = readLockfile(p)
    expect(result.hooks['bash-danger-guard']).toBeDefined()
    expect(result.hooks['bash-danger-guard']?.version).toBe('1.0.0')
    expect(result.hooks['bash-danger-guard']?.event).toBe('PreToolUse')
    expect(result.hooks['bash-danger-guard']?.settings_index).toBe(0)
  })

  it('returns empty lockfile (no throw) when file is corrupt JSON', () => {
    let tmpFile: string | undefined
    try {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-test-'))
      tmpFile = path.join(dir, 'hookpm.lock')
      fs.writeFileSync(tmpFile, '{ broken json', 'utf8')
      const result = readLockfile(tmpFile)
      expect(result.version).toBe('1')
      expect(result.hooks).toEqual({})
    } finally {
      if (tmpFile) fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true })
    }
  })
})

// ─── writeLockfile ────────────────────────────────────────────────────────────

describe('writeLockfile()', () => {
  let tmpDir: string
  let lockPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-lock-'))
    lockPath = path.join(tmpDir, 'hookpm.lock')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes lockfile and can be read back', () => {
    const lockfile: Lockfile = {
      version: '1',
      generated: '2026-03-10T00:00:00Z',
      registry: 'https://example.com/registry',
      hooks: {
        'my-hook': {
          version: '1.0.0',
          resolved: 'https://example.com/my-hook-1.0.0.tar.gz',
          integrity: 'sha256-abc',
          event: 'PreToolUse',
          settings_index: 0,
          installed: '2026-03-10T00:00:00Z',
          range: '^1.0.0',
        },
      },
    }
    writeLockfile(lockPath, lockfile)
    const result = readLockfile(lockPath)
    expect(result.hooks['my-hook']?.version).toBe('1.0.0')
  })

  it('overwrites existing lockfile', () => {
    const first: Lockfile = {
      version: '1',
      generated: '2026-03-10T00:00:00Z',
      registry: 'https://example.com',
      hooks: {},
    }
    writeLockfile(lockPath, first)
    const second: Lockfile = { ...first, registry: 'https://other.com' }
    writeLockfile(lockPath, second)
    const result = readLockfile(lockPath)
    expect(result.registry).toBe('https://other.com')
  })
})
