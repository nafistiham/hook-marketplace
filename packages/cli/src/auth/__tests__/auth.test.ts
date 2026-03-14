import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readAuth, saveAuth, isExpired } from '../index.js'
import type { AuthFile } from '../index.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-auth-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── readAuth ─────────────────────────────────────────────────────────────────

describe('readAuth()', () => {
  it('returns null when file does not exist', () => {
    const result = readAuth(path.join(tmpDir, 'nonexistent.json'))
    expect(result).toBeNull()
  })

  it('returns parsed AuthFile when file exists', () => {
    const authPath = path.join(tmpDir, 'auth.json')
    const data: AuthFile = {
      clerk_token: 'test-jwt',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      username: 'testuser',
    }
    fs.writeFileSync(authPath, JSON.stringify(data))
    const result = readAuth(authPath)
    expect(result?.clerk_token).toBe('test-jwt')
    expect(result?.username).toBe('testuser')
  })

  it('returns null on corrupt JSON', () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, 'NOT VALID JSON {{{')
    expect(readAuth(authPath)).toBeNull()
  })
})

// ─── saveAuth ────────────────────────────────────────────────────────────────

describe('saveAuth()', () => {
  it('writes auth.json with correct content', () => {
    const authPath = path.join(tmpDir, 'subdir', 'auth.json')
    const data: AuthFile = {
      clerk_token: 'jwt-abc',
      expires_at: '2026-01-01T00:00:00.000Z',
      username: 'alice',
    }
    saveAuth(authPath, data)
    const written = JSON.parse(fs.readFileSync(authPath, 'utf8')) as AuthFile
    expect(written.clerk_token).toBe('jwt-abc')
    expect(written.username).toBe('alice')
  })

  it('creates parent directory if absent', () => {
    const authPath = path.join(tmpDir, 'newdir', 'auth.json')
    saveAuth(authPath, { clerk_token: 'tok', expires_at: 'x', username: 'u' })
    expect(fs.existsSync(path.dirname(authPath))).toBe(true)
  })

  it('writes with mode 0o600', () => {
    const authPath = path.join(tmpDir, 'auth.json')
    saveAuth(authPath, { clerk_token: 'tok', expires_at: 'x', username: 'u' })
    const mode = fs.statSync(authPath).mode & 0o777
    expect(mode).toBe(0o600)
  })
})

// ─── isExpired ────────────────────────────────────────────────────────────────

describe('isExpired()', () => {
  it('returns false when expires_at is in the future', () => {
    const auth: AuthFile = {
      clerk_token: 'tok',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      username: 'u',
    }
    expect(isExpired(auth)).toBe(false)
  })

  it('returns true when expires_at is in the past', () => {
    const auth: AuthFile = {
      clerk_token: 'tok',
      expires_at: new Date(Date.now() - 1000).toISOString(),
      username: 'u',
    }
    expect(isExpired(auth)).toBe(true)
  })
})
