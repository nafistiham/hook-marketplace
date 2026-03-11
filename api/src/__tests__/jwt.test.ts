import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import app from '../index.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type KeyPairResult = Awaited<ReturnType<typeof generateKeyPair>>

let keyPair: KeyPairResult
let testCounter = 0

function uniqueJwksUrl(): string {
  return `https://clerk.hookpm.dev/.well-known/jwks.json?t=${testCounter}`
}

async function makeSignedJWT(payload: Record<string, unknown>, privateKey: KeyPairResult['privateKey']): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('https://clerk.hookpm.dev')
    .setSubject('user_test123')
    .sign(privateKey)
}

async function makeJWKSResponse(publicKey: KeyPairResult['publicKey']): Promise<Response> {
  const jwk = await exportJWK(publicKey)
  const jwks = { keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'ES256' }] }
  return new Response(JSON.stringify(jwks), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeEnv(opts: { jwksUrl?: string; issuer?: string; clerkUser?: { id: string; username: string } | null } = {}) {
  return {
    HOOKPM_BUCKET: {
      get: async () => null,
      put: async () => {},
    },
    CLERK_JWKS_URL: opts.jwksUrl ?? uniqueJwksUrl(),
    CLERK_ISSUER: opts.issuer ?? 'https://clerk.hookpm.dev',
    __TEST_CLERK_USER: opts.clerkUser !== undefined ? opts.clerkUser : undefined,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  testCounter++
  keyPair = await generateKeyPair('ES256')
  vi.restoreAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveUser() — real JWT verification', () => {
  it('returns ClerkUser when JWT is valid', async () => {
    const jwt = await makeSignedJWT({ username: 'alice' }, keyPair.privateKey)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('jwks')) return makeJWKSResponse(keyPair.publicKey)
      return new Response('not found', { status: 404 })
    })

    // Use a route that requires auth — GET /authors/me
    const env = makeEnv() // no __TEST_CLERK_USER — goes through real JWT path
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      env,
    )

    // index.json is not in R2, so authors/me will 404 on index — but we want 200 or 404 (not 401)
    // A 404 means auth passed and we got to the route handler
    expect(res.status).not.toBe(401)
  })

  it('returns 401 when JWT is expired', async () => {
    const expiredJWT = await new SignJWT({ username: 'alice' })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // issued 2h ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1h ago
      .setIssuer('https://clerk.hookpm.dev')
      .setSubject('user_test123')
      .sign(keyPair.privateKey)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('jwks')) return makeJWKSResponse(keyPair.publicKey)
      return new Response('not found', { status: 404 })
    })

    const env = makeEnv()
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: `Bearer ${expiredJWT}` },
      }),
      env,
    )
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when JWT has wrong issuer', async () => {
    // Sign with correct key but wrong issuer
    const jwt = await new SignJWT({ username: 'alice' })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer('https://malicious.example.com') // wrong issuer
      .setSubject('user_test123')
      .sign(keyPair.privateKey)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('jwks')) return makeJWKSResponse(keyPair.publicKey)
      return new Response('not found', { status: 404 })
    })

    const env = makeEnv()
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      env,
    )
    expect(res.status).toBe(401)
  })

  it('returns 500 when JWKS endpoint is unreachable', async () => {
    const jwt = await makeSignedJWT({ username: 'alice' }, keyPair.privateKey)

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    const env = makeEnv()
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      env,
    )
    expect(res.status).toBe(500)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('still uses __TEST_CLERK_USER bypass when set', async () => {
    // No fetch mock — if real verification runs it would fail
    const env = makeEnv({ clerkUser: { id: 'user_123', username: 'testuser' } })
    const res = await app.fetch(
      new Request('http://localhost/authors/me', {
        headers: { Authorization: 'Bearer any-token' },
      }),
      env,
    )
    // 404 because index.json is not in R2 — but NOT 401 (auth passed via bypass)
    expect(res.status).not.toBe(401)
  })
})
