import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../index.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ARCHIVE_BYTES = new Uint8Array([0x1f, 0x8b, 0x08])

function makeEnv(opts: { supabaseUrl?: string; supabaseKey?: string } = {}) {
  return {
    HOOKPM_BUCKET: {
      get: async (key: string) => {
        if (key === 'hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz') {
          return {
            text: async () => '',
            arrayBuffer: async () => ARCHIVE_BYTES.buffer,
            httpMetadata: { contentType: 'application/gzip' },
          }
        }
        return null
      },
      put: async () => {},
    },
    SUPABASE_URL: opts.supabaseUrl ?? '',
    SUPABASE_SERVICE_KEY: opts.supabaseKey ?? '',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Download tracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fires a fire-and-forget insert to Supabase when archive is downloaded', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 201 }),
    )

    const env = makeEnv({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-service-key',
    })

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz'),
      env,
    )

    expect(res.status).toBe(200)

    // Allow fire-and-forget microtasks to flush
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]!
    expect(String(url)).toContain('downloads')
    expect(String(url)).toContain('test.supabase.co')
    const body = JSON.parse((init as RequestInit).body as string) as { hook_name: string; version: string }[]
    expect(body[0]?.hook_name).toBe('bash-danger-guard')
    expect(body[0]?.version).toBe('1.0.0')
  })

  it('does not fire insert when SUPABASE_URL is not set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 201 }),
    )

    const env = makeEnv() // no supabase config
    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard/bash-danger-guard-1.0.0.tar.gz'),
      env,
    )

    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not fire insert for manifest (hook.json) requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 201 }),
    )

    const env = {
      HOOKPM_BUCKET: {
        get: async (key: string) => {
          if (key === 'hooks/bash-danger-guard/hook.json') {
            return {
              text: async () => '{}',
              arrayBuffer: async () => new ArrayBuffer(0),
              httpMetadata: { contentType: 'application/json' },
            }
          }
          return null
        },
        put: async () => {},
      },
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
    }

    const res = await app.fetch(
      new Request('http://localhost/registry/hooks/bash-danger-guard/hook.json'),
      env,
    )

    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
