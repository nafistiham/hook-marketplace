import { describe, it, expect } from 'vitest'
import app from '../index.js'

// ─── Mock env ─────────────────────────────────────────────────────────────────

function makeEnv(opts: {
  kvValue?: string | null  // value stored in KV for a given state key
  clerkOauthUrl?: string
} = {}) {
  return {
    HOOKPM_BUCKET: {
      get: async () => null,
      put: async () => {},
    },
    AUTH_KV: {
      get: async (_key: string) => opts.kvValue ?? null,
      put: async () => {},
      delete: async () => {},
    },
    CLERK_OAUTH_URL: opts.clerkOauthUrl ?? 'https://clerk.hookpm.dev/oauth/authorize',
    CLERK_CLIENT_ID: 'test-client-id',
    CLERK_CLIENT_SECRET: 'test-client-secret',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /auth/login', () => {
  it('redirects to Clerk OAuth URL with state parameter', async () => {
    const env = makeEnv({ clerkOauthUrl: 'https://clerk.hookpm.dev/oauth/authorize' })
    const res = await app.fetch(
      new Request('http://localhost/auth/login?state=abc123'),
      env,
    )
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('clerk.hookpm.dev')
    expect(location).toContain('abc123')
  })

  it('returns 400 when state parameter is missing', async () => {
    const env = makeEnv()
    const res = await app.fetch(
      new Request('http://localhost/auth/login'),
      env,
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('BAD_REQUEST')
  })
})

describe('GET /auth/token', () => {
  it('returns 200 with token data when state is ready in KV', async () => {
    const tokenData = JSON.stringify({
      token: 'clerk-jwt-xyz',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      username: 'testuser',
    })
    const env = makeEnv({ kvValue: tokenData })
    const res = await app.fetch(
      new Request('http://localhost/auth/token?state=ready-state'),
      env,
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { token: string; username: string }
    expect(body.token).toBe('clerk-jwt-xyz')
    expect(body.username).toBe('testuser')
  })

  it('returns 202 when state not yet in KV (pending)', async () => {
    const env = makeEnv({ kvValue: null })
    const res = await app.fetch(
      new Request('http://localhost/auth/token?state=pending-state'),
      env,
    )
    expect(res.status).toBe(202)
  })

  it('returns 400 when state parameter is missing', async () => {
    const env = makeEnv()
    const res = await app.fetch(
      new Request('http://localhost/auth/token'),
      env,
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('BAD_REQUEST')
  })
})
