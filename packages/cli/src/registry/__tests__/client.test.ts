import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as tar from 'tar'

// ─── Config mock — hoisted so it's available before imports ──────────────────

const mockConfig = vi.hoisted(() => ({
  registryUrl: 'https://test-registry.example.com/registry',
  registryTimeout: 5_000,
  downloadTimeout: 10_000,
  hookpmDir: '',        // set per-test in beforeEach
  settingsPath: '',
  lockfilePath: '',
  submitUrl: 'https://test-submit.example.com/submit',
}))

vi.mock('../../config.js', () => ({ config: mockConfig }))

import { fetchIndex, fetchHook, downloadArchive } from '../client.js'
import { clearCache } from '../cache.js'

const FIXTURES = path.join(import.meta.dirname, 'fixtures')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8')
}

function mockFetch(responses: Array<{ status: number; body: string | Uint8Array }>) {
  let call = 0
  return vi.fn(async () => {
    const res = responses[call++] ?? responses[responses.length - 1]!
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => {
        if (typeof res.body !== 'string') throw new Error('body is not string')
        return JSON.parse(res.body)
      },
      arrayBuffer: async () => {
        const buf = typeof res.body === 'string'
          ? Buffer.from(res.body)
          : Buffer.isBuffer(res.body)
            ? res.body
            : Buffer.from(res.body)
        // Ensure we return exactly the bytes of this buffer (not the backing pool)
        const ab = new ArrayBuffer(buf.length)
        new Uint8Array(ab).set(buf)
        return ab
      },
    }
  })
}

async function createTestArchive(hookName: string, version: string): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-archive-src-'))
  const archiveFile = path.join(os.tmpdir(), `${hookName}-${version}.tar.gz`)
  const srcDir = path.join(tmpDir, `${hookName}-${version}`)
  fs.mkdirSync(srcDir)

  // write hook.json and a dummy script
  fs.writeFileSync(
    path.join(srcDir, 'hook.json'),
    readFixture(path.join('bash-danger-guard', 'hook.json')),
    'utf8',
  )
  fs.writeFileSync(path.join(srcDir, 'guard.py'), '# test guard\nprint("ok")\n', 'utf8')

  await tar.c(
    { gzip: true, cwd: tmpDir, file: archiveFile },
    [`${hookName}-${version}`],
  )

  const buf = fs.readFileSync(archiveFile)
  fs.rmSync(tmpDir, { recursive: true, force: true })
  fs.unlinkSync(archiveFile)
  return buf
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let tmpHookpmDir: string

beforeEach(() => {
  clearCache()
  tmpHookpmDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-home-'))
  mockConfig.hookpmDir = tmpHookpmDir
})

afterEach(() => {
  vi.unstubAllGlobals()
  fs.rmSync(tmpHookpmDir, { recursive: true, force: true })
})

// ─── fetchIndex ───────────────────────────────────────────────────────────────

describe('fetchIndex()', () => {
  it('returns ok:true with valid HookIndex on success', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 200, body: readFixture('index.json') }]))
    const result = await fetchIndex()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.schema_version).toBe('1')
    expect(result.data.hooks).toHaveLength(1)
    expect(result.data.hooks[0]?.name).toBe('bash-danger-guard')
  })

  it('returns cached result on second call without re-fetching', async () => {
    const fetchMock = mockFetch([{ status: 200, body: readFixture('index.json') }])
    vi.stubGlobal('fetch', fetchMock)
    await fetchIndex()
    await fetchIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after cache TTL expires', async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetch([
      { status: 200, body: readFixture('index.json') },
      { status: 200, body: readFixture('index.json') },
    ])
    vi.stubGlobal('fetch', fetchMock)
    await fetchIndex()
    vi.advanceTimersByTime(61_000)
    await fetchIndex()
    vi.useRealTimers()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns ok:false with NETWORK_ERROR when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    const result = await fetchIndex()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NETWORK_ERROR')
  })

  it('returns ok:false with NOT_FOUND on 404', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 404, body: 'Not Found' }]))
    const result = await fetchIndex()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NOT_FOUND')
  })

  it('returns ok:false with NETWORK_ERROR on non-200 non-404 status', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 500, body: 'Server Error' }]))
    const result = await fetchIndex()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NETWORK_ERROR')
  })

  it('returns ok:false with INVALID_RESPONSE when body is not JSON', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 200, body: 'not json at all' }]))
    const result = await fetchIndex()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('INVALID_RESPONSE')
  })

  it('returns ok:false with VALIDATION_ERROR when JSON fails HookIndexSchema', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 200, body: readFixture('index-invalid.json') }]))
    const result = await fetchIndex()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('VALIDATION_ERROR')
  })
})

// ─── fetchHook ────────────────────────────────────────────────────────────────

describe('fetchHook()', () => {
  it('fetches hook.json when version is provided (skips index)', async () => {
    const fetchMock = mockFetch([
      { status: 200, body: readFixture(path.join('bash-danger-guard', 'hook.json')) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchHook('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.name).toBe('bash-danger-guard')
    // Should not have fetched index (only 1 fetch call)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches index first when no version provided, then fetches hook.json', async () => {
    const fetchMock = mockFetch([
      { status: 200, body: readFixture('index.json') },
      { status: 200, body: readFixture(path.join('bash-danger-guard', 'hook.json')) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchHook('bash-danger-guard')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns NOT_FOUND when hook name is not in index', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 200, body: readFixture('index.json') }]))
    const result = await fetchHook('nonexistent-hook')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NOT_FOUND')
  })

  it('propagates fetchIndex error when no version provided and index fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const result = await fetchHook('bash-danger-guard')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NETWORK_ERROR')
  })

  it('returns VALIDATION_ERROR when hook.json fails HookJsonRegistrySchema', async () => {
    vi.stubGlobal('fetch', mockFetch([
      { status: 200, body: readFixture('hook-invalid.json') },
    ]))
    const result = await fetchHook('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND on 404 hook.json fetch', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 404, body: 'Not Found' }]))
    const result = await fetchHook('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NOT_FOUND')
  })
})

// ─── downloadArchive ──────────────────────────────────────────────────────────

describe('downloadArchive()', () => {
  it('downloads, extracts, writes sentinel, returns installedPath and integrity', async () => {
    const archive = await createTestArchive('bash-danger-guard', '1.0.0')
    vi.stubGlobal('fetch', mockFetch([{ status: 200, body: archive }]))

    const result = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.installedPath).toContain('bash-danger-guard@1.0.0')
    expect(result.integrity).toMatch(/^sha256-[0-9a-f]{64}$/)

    // sentinel file exists
    const sentinel = path.join(result.installedPath, '.hookpm-complete')
    expect(fs.existsSync(sentinel)).toBe(true)
    expect(fs.readFileSync(sentinel, 'utf8')).toBe(result.integrity)

    // extracted files exist
    expect(fs.existsSync(path.join(result.installedPath, 'guard.py'))).toBe(true)
  })

  it('is idempotent: returns cached result when sentinel exists', async () => {
    const archive = await createTestArchive('bash-danger-guard', '1.0.0')
    const fetchMock = mockFetch([{ status: 200, body: archive }])
    vi.stubGlobal('fetch', fetchMock)

    // First download
    const first = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(first.ok).toBe(true)

    // Second download — sentinel exists, should not re-fetch
    const second = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(second.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    if (first.ok && second.ok) {
      expect(second.integrity).toBe(first.integrity)
      expect(second.installedPath).toBe(first.installedPath)
    }
  })

  it('re-downloads when installDir exists but sentinel is absent (partial install)', async () => {
    const archive = await createTestArchive('bash-danger-guard', '1.0.0')
    const fetchMock = mockFetch([
      { status: 200, body: archive },
      { status: 200, body: archive },
    ])
    vi.stubGlobal('fetch', fetchMock)

    // Simulate partial install: create dir but NOT sentinel
    const installDir = path.join(tmpHookpmDir, 'hooks', 'bash-danger-guard@1.0.0')
    fs.mkdirSync(installDir, { recursive: true })
    fs.writeFileSync(path.join(installDir, 'partial.txt'), 'incomplete', 'utf8')
    // no sentinel

    const result = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1) // fetched once since sentinel was missing
    if (!result.ok) return
    // Sentinel now exists
    expect(fs.existsSync(path.join(result.installedPath, '.hookpm-complete'))).toBe(true)
  })

  it('returns NOT_FOUND when archive 404s', async () => {
    vi.stubGlobal('fetch', mockFetch([{ status: 404, body: 'Not Found' }]))
    const result = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NOT_FOUND')
  })

  it('returns NETWORK_ERROR when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection refused') }))
    const result = await downloadArchive('bash-danger-guard', '1.0.0')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('NETWORK_ERROR')
  })
})
