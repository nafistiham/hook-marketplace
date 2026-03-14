import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { readSettings, writeSettingsAtomic } from '../index.js'
import { ParseError, WriteError } from '../types.js'

const FIXTURES = path.join(import.meta.dirname, 'fixtures')

// ─── readSettings ─────────────────────────────────────────────────────────────

describe('readSettings()', () => {
  it('returns empty ClaudeSettings when file does not exist', () => {
    const result = readSettings('/nonexistent/path/settings.json')
    expect(result).toEqual({})
  })

  it('parses settings with no hooks key', () => {
    const p = path.join(FIXTURES, 'settings', 'no-hooks-key.json')
    const result = readSettings(p)
    expect(result).toEqual({ model: 'claude-opus' })
    expect(result.hooks).toBeUndefined()
  })

  it('parses empty settings file', () => {
    const p = path.join(FIXTURES, 'settings', 'empty.json')
    const result = readSettings(p)
    expect(result).toEqual({})
  })

  it('parses settings with existing hooks', () => {
    const p = path.join(FIXTURES, 'settings', 'with-existing.json')
    const result = readSettings(p)
    expect(result.hooks).toBeDefined()
    expect(result.hooks?.['PreToolUse']).toHaveLength(1)
  })

  it('throws ParseError when settings.json is corrupt', () => {
    const p = path.join(FIXTURES, 'settings', 'corrupt.json')
    expect(() => readSettings(p)).toThrow(ParseError)
  })

  it('ParseError message mentions settings.json', () => {
    const p = path.join(FIXTURES, 'settings', 'corrupt.json')
    try {
      readSettings(p)
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError)
      if (e instanceof ParseError) {
        expect(e.message.toLowerCase()).toMatch(/settings\.json|corrupt|invalid json/i)
      }
    }
  })
})

// ─── writeSettingsAtomic + readSettings round-trip ────────────────────────────

describe('writeSettingsAtomic()', () => {
  let tmpDir: string
  let settingsPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-test-'))
    settingsPath = path.join(tmpDir, 'settings.json')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes settings and they can be read back', () => {
    const data = { hooks: { PreToolUse: [] }, model: 'claude-opus' }
    writeSettingsAtomic(settingsPath, data)
    const result = readSettings(settingsPath)
    expect(result.hooks?.['PreToolUse']).toEqual([])
    expect(result.model).toBe('claude-opus')
  })

  it('leaves no tmp file after successful write', () => {
    writeSettingsAtomic(settingsPath, { hooks: {} })
    const files = fs.readdirSync(tmpDir)
    expect(files.every(f => !f.includes('.hookpm-tmp-'))).toBe(true)
  })

  it('written JSON is pretty-printed (2-space indent)', () => {
    writeSettingsAtomic(settingsPath, { hooks: {} })
    const raw = fs.readFileSync(settingsPath, 'utf8')
    expect(raw).toContain('\n')
    expect(raw).toMatch(/^ {2}/m)
  })

  it('overwrites an existing settings file', () => {
    writeSettingsAtomic(settingsPath, { model: 'v1' })
    writeSettingsAtomic(settingsPath, { model: 'v2' })
    expect(readSettings(settingsPath).model).toBe('v2')
  })

  it('throws WriteError when directory does not exist', () => {
    const badPath = path.join(tmpDir, 'nonexistent', 'settings.json')
    expect(() => writeSettingsAtomic(badPath, {})).toThrow(WriteError)
  })
})
