import { Hono } from 'hono'
import { HookJsonSchema, HookIndexSchema } from '@hookpm/schema'
import type { HookIndexEntry } from '@hookpm/schema'
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose'

// ─── Env bindings ─────────────────────────────────────────────────────────────

type ClerkUser = { id: string; username: string }

type KVNamespace = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

type RateLimiter = {
  limit(opts: { key: string }): Promise<{ success: boolean }>
}

type Env = {
  HOOKPM_BUCKET: R2Bucket
  AUTH_KV?: KVNamespace
  RATE_LIMITER?: RateLimiter
  CLERK_JWKS_URL?: string
  CLERK_ISSUER?: string
  CLERK_OAUTH_URL?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
  // Test-only: injected by test env to bypass JWT verification
  __TEST_CLERK_USER?: ClerkUser | null
}

type Variables = {
  user: ClerkUser
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── Error helpers ────────────────────────────────────────────────────────────

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status })
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

async function checkRateLimit(env: Env, req: Request): Promise<Response | null> {
  if (!env.RATE_LIMITER) return null  // Not configured — allow (dev/test)
  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('X-Forwarded-For') ?? 'unknown'
  const { success } = await env.RATE_LIMITER.limit({ key: ip })
  if (!success) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many requests — please slow down')
  }
  return null
}

// ─── JWKS cache (module scope — keyed by URL; survives across requests in one Worker instance) ─

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJWKS(url: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)))
  }
  return jwksCache.get(url)!
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

type ClerkJWTPayload = {
  sub?: string
  username?: string
}

async function resolveUser(req: Request, env: Env): Promise<ClerkUser | Response> {
  // Test bypass: env.__TEST_CLERK_USER is injected by test suite
  if (env.__TEST_CLERK_USER !== undefined) {
    return env.__TEST_CLERK_USER ?? errorResponse(401, 'UNAUTHORIZED', 'Authorization header required')
  }

  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return errorResponse(401, 'UNAUTHORIZED', 'Authorization header required')
  }

  const token = auth.slice('Bearer '.length)
  const jwksUrl = env.CLERK_JWKS_URL ?? 'https://clerk.hookpm.dev/.well-known/jwks.json'
  const issuer = env.CLERK_ISSUER ?? 'https://clerk.hookpm.dev'

  try {
    const { payload } = await jwtVerify(token, getJWKS(jwksUrl), { issuer }) as { payload: ClerkJWTPayload }

    const id = payload.sub
    const username = payload.username
    if (!id || !username) {
      return errorResponse(401, 'UNAUTHORIZED', 'Token missing required claims')
    }

    return { id, username }
  } catch (err) {
    if (
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JWTInvalid
    ) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token')
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'JWT verification failed')
  }
}

// ─── Auth (login / token polling) ────────────────────────────────────────────

const AUTH_KV_TTL_SECONDS = 600 // 10 minutes

app.get('/auth/login', async (c) => {
  const rateLimited = await checkRateLimit(c.env, c.req.raw)
  if (rateLimited) return rateLimited

  const state = c.req.query('state')
  if (!state) return errorResponse(400, 'BAD_REQUEST', 'state parameter required')

  const clerkOauthUrl = c.env.CLERK_OAUTH_URL ?? 'https://clerk.hookpm.dev/oauth/authorize'
  const redirectUrl = `${clerkOauthUrl}?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent('https://api.nafistiham.com/auth/callback')}`

  return Response.redirect(redirectUrl, 302)
})

app.get('/auth/token', async (c) => {
  const state = c.req.query('state')
  if (!state) return errorResponse(400, 'BAD_REQUEST', 'state parameter required')

  const kv = c.env.AUTH_KV
  if (!kv) return new Response(null, { status: 202 })

  const value = await kv.get(`auth:${state}`)
  if (!value) return new Response(null, { status: 202 })

  // Token ready — delete KV entry and return token
  await kv.delete(`auth:${state}`)
  return new Response(value, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ─── Auth callback (called by Clerk after OAuth) ──────────────────────────────

app.get('/auth/callback', async (c) => {
  const state = c.req.query('state')
  const token = c.req.query('token')     // Clerk passes the JWT here
  const username = c.req.query('username')
  const expiresAt = c.req.query('expires_at')

  if (!state || !token || !username) {
    return errorResponse(400, 'BAD_REQUEST', 'Missing required callback parameters')
  }

  const kv = c.env.AUTH_KV
  if (!kv) return errorResponse(500, 'INTERNAL_ERROR', 'Auth storage not configured')

  const tokenData = JSON.stringify({
    token,
    expires_at: expiresAt ?? new Date(Date.now() + 3600_000).toISOString(),
    username,
  })

  await kv.put(`auth:${state}`, tokenData, { expirationTtl: AUTH_KV_TTL_SECONDS })

  // Return a simple success page
  return new Response('<html><body><h2>Logged in! You can close this tab.</h2></body></html>', {
    headers: { 'Content-Type': 'text/html' },
  })
})

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({ status: 'ok', phase: '1B' })
})

// ─── Registry reads (R2-backed) ───────────────────────────────────────────────

app.get('/registry/index.json', async (c) => {
  const obj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (!obj) return errorResponse(404, 'NOT_FOUND', 'Registry index not found')

  const body = await obj.text()
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  })
})

app.get('/registry/hooks/:name/hook.json', async (c) => {
  const name = c.req.param('name')
  const obj = await c.env.HOOKPM_BUCKET.get(`hooks/${name}/hook.json`)
  if (!obj) return errorResponse(404, 'NOT_FOUND', `Hook '${name}' not found`)

  const body = await obj.text()
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  })
})

// ─── Download tracking (fire-and-forget) ─────────────────────────────────────

function trackDownload(env: Env, hookName: string, version: string): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return
  const url = `${env.SUPABASE_URL}/rest/v1/downloads`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([{ hook_name: hookName, version }]),
  }).catch(() => {
    // Silently ignore — download tracking must not affect response latency or status
  })
}

// ─── Archive download ─────────────────────────────────────────────────────────

app.get('/registry/hooks/:name/:filename', async (c) => {
  const name = c.req.param('name')
  const filename = c.req.param('filename')
  const obj = await c.env.HOOKPM_BUCKET.get(`hooks/${name}/${filename}`)
  if (!obj) return errorResponse(404, 'NOT_FOUND', `File '${filename}' not found for hook '${name}'`)

  const contentType = obj.httpMetadata?.contentType ?? 'application/octet-stream'
  const body = await obj.arrayBuffer()

  // Track archive downloads (not manifest requests)
  if (filename.endsWith('.tar.gz')) {
    // Parse version from <name>-<version>.tar.gz
    const stem = filename.slice(0, -'.tar.gz'.length) // e.g. "bash-danger-guard-1.0.0"
    const version = stem.slice(name.length + 1) // skip "<name>-"
    if (version) trackDownload(c.env, name, version)
  }

  const cacheControl = filename.endsWith('.tar.gz')
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=300, s-maxage=3600'

  return new Response(body, { headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl } })
})

// ─── Publish (POST /registry/hooks) ──────────────────────────────────────────

app.post('/registry/hooks', async (c) => {
  const rateLimited = await checkRateLimit(c.env, c.req.raw)
  if (rateLimited) return rateLimited

  // 1. Auth
  const userOrErr = await resolveUser(c.req.raw, c.env)
  if (userOrErr instanceof Response) return userOrErr
  const user = userOrErr

  // 2. Parse multipart
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Expected multipart/form-data with manifest and archive fields')
  }

  const manifestRaw = form.get('manifest')
  const archiveRaw = form.get('archive')

  if (!manifestRaw || typeof manifestRaw === 'string' || !archiveRaw || typeof archiveRaw === 'string') {
    return errorResponse(400, 'BAD_REQUEST', 'Missing manifest or archive field')
  }

  // Cast to Blob — CF Workers FormData entries are Blob/File
  const manifestFile = manifestRaw as unknown as Blob
  const archiveFile = archiveRaw as unknown as Blob

  // 3. Validate hook.json
  let hookJson: unknown
  try {
    hookJson = JSON.parse(await manifestFile.text())
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'manifest is not valid JSON')
  }

  const parsed = HookJsonSchema.safeParse(hookJson)
  if (!parsed.success) {
    const summary = parsed.error.errors
      .slice(0, 5)
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    return errorResponse(422, 'VALIDATION_ERROR', `hook.json validation failed: ${summary}`)
  }

  const hook = parsed.data

  // 4. Author check
  if (hook.author !== user.username) {
    return errorResponse(
      403,
      'FORBIDDEN',
      `hook.json author '${hook.author}' does not match authenticated user '${user.username}'`,
    )
  }

  // 5. Conflict check
  const archiveKey = `hooks/${hook.name}/${hook.name}-${hook.version}.tar.gz`
  const existing = await c.env.HOOKPM_BUCKET.get(archiveKey)
  if (existing) {
    return errorResponse(409, 'CONFLICT', `${hook.name}@${hook.version} already exists`)
  }

  // 6. Upload to R2
  const manifestKey = `hooks/${hook.name}/hook.json`
  const archiveBuffer = await archiveFile.arrayBuffer()

  await c.env.HOOKPM_BUCKET.put(manifestKey, JSON.stringify(hook), {
    httpMetadata: { contentType: 'application/json' },
  })
  await c.env.HOOKPM_BUCKET.put(archiveKey, archiveBuffer, {
    httpMetadata: { contentType: 'application/gzip' },
  })

  // 7. Regenerate index.json
  let priorHooks: HookIndexEntry[] = []
  const indexObj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (indexObj) {
    try {
      const raw = JSON.parse(await indexObj.text()) as unknown
      const p = HookIndexSchema.safeParse(raw)
      priorHooks = p.success ? p.data.hooks : []
    } catch {
      priorHooks = []
    }
  }

  const newEntry: HookIndexEntry = {
    name: hook.name,
    description: hook.description,
    author: hook.author,
    event: hook.event,
    tags: hook.tags,
    capabilities: hook.capabilities,
    security: hook.security ?? {
      sandbox_level: 'none',
      reviewed: false,
      review_date: null,
      signed: false,
      signed_by: null,
      signature: null,
    },
    latest: hook.version,
    versions: [
      ...priorHooks.find((h) => h.name === hook.name)?.versions ?? [],
      hook.version,
    ],
    updated_at: new Date().toISOString(),
  }

  const updatedHooks = [
    ...priorHooks.filter((h) => h.name !== hook.name),
    newEntry,
  ]

  const updatedIndex = {
    schema_version: '1' as const,
    generated_at: new Date().toISOString(),
    hooks: updatedHooks,
  }

  await c.env.HOOKPM_BUCKET.put('index.json', JSON.stringify(updatedIndex), {
    httpMetadata: { contentType: 'application/json' },
  })

  return c.json({ name: hook.name, version: hook.version }, 201)
})

// ─── Report a hook ────────────────────────────────────────────────────────────

// Must match CHECK constraint in migration 0002
const REPORT_REASONS = new Set(['malware', 'broken', 'misleading', 'spam', 'other'])

app.post('/registry/hooks/:name/report', async (c) => {
  const rateLimited = await checkRateLimit(c.env, c.req.raw)
  if (rateLimited) return rateLimited

  const name = c.req.param('name')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Request body must be valid JSON')
  }

  const { reason, details } = body as { reason?: string; details?: string }
  if (!reason || !REPORT_REASONS.has(reason)) {
    return errorResponse(400, 'BAD_REQUEST', `reason must be one of: ${[...REPORT_REASONS].join(', ')}`)
  }

  // Hash IP to avoid storing raw PII
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
  let reporterHash = 'unknown'
  try {
    const encoder = new TextEncoder()
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(ip))
    reporterHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch { /* non-critical */ }

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
    // Registry not backed by Supabase yet — accept and discard gracefully
    return c.json({ reported: true }, 202)
  }

  const res = await fetch(`${c.env.SUPABASE_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: c.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([{ hook_name: name, reason, details: details ?? null, reporter_ip: reporterHash }]),
  })

  if (!res.ok) {
    return errorResponse(502, 'UPSTREAM_ERROR', 'Failed to record report')
  }

  return c.json({ reported: true }, 202)
})

// ─── Rankings ─────────────────────────────────────────────────────────────────

app.get('/registry/rankings', async (c) => {
  const hooks = await getIndex(c)
  if (hooks === null) return errorResponse(404, 'NOT_FOUND', 'Registry index not found')

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
    // No Supabase — return hooks ordered by name with zero downloads
    const ranked = hooks.map((h) => ({ name: h.name, downloads: 0 }))
    return c.json({ rankings: ranked })
  }

  const res = await fetch(`${c.env.SUPABASE_URL}/rest/v1/download_counts?select=hook_name,total&order=total.desc&limit=50`, {
    headers: {
      apikey: c.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
    },
  })

  if (!res.ok) return errorResponse(502, 'UPSTREAM_ERROR', 'Failed to fetch download counts')

  const counts = await res.json() as Array<{ hook_name: string; total: number }>
  const countMap = new Map(counts.map((r) => [r.hook_name, r.total]))

  const ranked = hooks
    .map((h) => ({ name: h.name, downloads: countMap.get(h.name) ?? 0 }))
    .sort((a, b) => b.downloads - a.downloads)

  return c.json({ rankings: ranked })
})

app.get('/authors/rankings', async (c) => {
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
    return c.json({ rankings: [] })
  }

  const res = await fetch(
    `${c.env.SUPABASE_URL}/rest/v1/author_download_totals?select=username,total_downloads,hook_count&order=total_downloads.desc&limit=50`,
    {
      headers: {
        apikey: c.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
      },
    },
  )

  if (!res.ok) return errorResponse(502, 'UPSTREAM_ERROR', 'Failed to fetch author rankings')

  const rankings = await res.json() as Array<{ username: string; total_downloads: number; hook_count: number }>
  return c.json({ rankings })
})

// ─── Authors ──────────────────────────────────────────────────────────────────

async function getIndex(c: { env: Env }): Promise<HookIndexEntry[] | null> {
  const obj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (!obj) return null
  let raw: unknown
  try {
    raw = JSON.parse(await obj.text())
  } catch {
    return []
  }
  const parsed = HookIndexSchema.safeParse(raw)
  return parsed.success ? parsed.data.hooks : []
}

app.get('/authors/me', async (c) => {
  const userOrErr = await resolveUser(c.req.raw, c.env)
  if (userOrErr instanceof Response) return userOrErr
  const user = userOrErr

  const hooks = await getIndex(c)
  if (hooks === null) return errorResponse(404, 'NOT_FOUND', 'Registry index not found')

  const hookNames = hooks.filter((h) => h.author === user.username).map((h) => h.name)
  return c.json({ id: user.id, username: user.username, hookNames })
})

app.get('/authors/:username/hooks', async (c) => {
  const username = c.req.param('username')
  const hooks = await getIndex(c)
  if (hooks === null) return errorResponse(404, 'NOT_FOUND', 'Registry index not found')

  const authorHooks = hooks.filter((h) => h.author === username)
  return c.json({ username, hooks: authorHooks })
})

export default app
