import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('node:child_process')
vi.mock('../../config.js', () => ({
  config: {
    registryUrl: 'https://test.example.com/registry',
    apiUrl: 'https://test.example.com/api',
    registryTimeout: 5_000,
    downloadTimeout: 10_000,
    hookpmDir: '/tmp/hookpm-test-login',
    settingsPath: '/tmp/.claude/settings.json',
    lockfilePath: '/tmp/hookpm-test.lock',
    submitUrl: 'https://test.example.com/submit',
  },
}))

import * as cp from 'node:child_process'
import { runLogin } from '../login.js'
import { runLogout } from '../logout.js'

// ─── Output capture ───────────────────────────────────────────────────────────

function captureOutput() {
  const stdout: string[] = []
  const stderr: string[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { stderr.push(String(chunk)); return true })
  return {
    stdout,
    stderr,
    allOutput: () => [...stdout, ...stderr].join(''),
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-login-test-'))
  vi.clearAllMocks()
  process.exitCode = 0
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = 0
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── runLogin ─────────────────────────────────────────────────────────────────

describe('runLogin()', () => {
  it('opens browser with Clerk OAuth URL containing a state parameter', async () => {
    vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)

    // Mock fetch to return token immediately on first poll
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ token: 'clerk-jwt-123', expires_at: new Date(Date.now() + 3600_000).toISOString(), username: 'testuser' }),
        { status: 200 },
      ),
    )

    const authPath = path.join(tmpDir, 'auth.json')
    await runLogin({ authPath })

    expect(cp.spawn).toHaveBeenCalled()
    const spawnArgs = vi.mocked(cp.spawn).mock.calls[0]
    const url = spawnArgs ? spawnArgs.flat().find((a): a is string => typeof a === 'string' && a.startsWith('http')) : ''
    expect(url).toBeTruthy()
    expect(url).toContain('state=')
  })

  it('writes auth.json with token, expires_at, and username on successful login', async () => {
    vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)

    const futureExpiry = new Date(Date.now() + 3600_000).toISOString()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ token: 'clerk-jwt-abc', expires_at: futureExpiry, username: 'alice' }),
        { status: 200 },
      ),
    )

    const authPath = path.join(tmpDir, 'auth.json')
    await runLogin({ authPath })

    expect(fs.existsSync(authPath)).toBe(true)
    const authFile = JSON.parse(fs.readFileSync(authPath, 'utf8')) as {
      clerk_token: string
      expires_at: string
      username: string
    }
    expect(authFile.clerk_token).toBe('clerk-jwt-abc')
    expect(authFile.username).toBe('alice')
    expect(authFile.expires_at).toBe(futureExpiry)
  })

  it('prints the OAuth URL to stdout for SSH/headless environments', async () => {
    vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ token: 'tok', expires_at: new Date(Date.now() + 3600_000).toISOString(), username: 'u' }),
        { status: 200 },
      ),
    )

    const authPath = path.join(tmpDir, 'auth.json')
    const { allOutput } = captureOutput()
    await runLogin({ authPath })

    expect(allOutput()).toContain('http')
  })

  it('sets exitCode 1 and shows error when polling times out', async () => {
    vi.mocked(cp.spawn).mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof cp.spawn>)

    // Always return 202 (pending) — simulates timeout
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 202 }))

    const authPath = path.join(tmpDir, 'auth.json')
    const { allOutput } = captureOutput()

    await runLogin({ authPath, pollTimeoutMs: 100, pollIntervalMs: 10 })

    expect(process.exitCode).toBe(1)
    expect(allOutput()).toMatch(/timed out|timeout/i)
    expect(fs.existsSync(authPath)).toBe(false)
  })
})

// ─── runLogout ────────────────────────────────────────────────────────────────

describe('runLogout()', () => {
  it('deletes auth.json and prints success message', async () => {
    const authPath = path.join(tmpDir, 'auth.json')
    fs.writeFileSync(authPath, JSON.stringify({ clerk_token: 'tok', expires_at: 'x', username: 'u' }))

    const { allOutput } = captureOutput()
    await runLogout({ authPath })

    expect(fs.existsSync(authPath)).toBe(false)
    expect(allOutput()).toMatch(/logged out/i)
  })

  it('prints "not logged in" message when auth.json does not exist', async () => {
    const authPath = path.join(tmpDir, 'auth.json')

    const { allOutput } = captureOutput()
    await runLogout({ authPath })

    expect(allOutput()).toMatch(/not logged in/i)
    expect(process.exitCode).not.toBe(1)
  })
})
