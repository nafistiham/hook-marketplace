import { Hono } from 'hono'
import { HookJsonSchema, HookIndexSchema } from '@hookpm/schema'
import type { HookIndexEntry } from '@hookpm/schema'

// ─── Env bindings ─────────────────────────────────────────────────────────────

type ClerkUser = { id: string; username: string }

type Env = {
  HOOKPM_BUCKET: R2Bucket
  CLERK_PUBLIC_KEY?: string
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

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function resolveUser(req: Request, env: Env): Promise<ClerkUser | null> {
  // Test bypass: env.__TEST_CLERK_USER is injected by test suite
  if (env.__TEST_CLERK_USER !== undefined) {
    return env.__TEST_CLERK_USER ?? null
  }

  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null

  // Phase 1B: verify Clerk JWT here using env.CLERK_PUBLIC_KEY
  // Stub: treat any non-empty token as valid in non-test mode
  // Replace with: const payload = await verifyClerkJWT(token, env.CLERK_PUBLIC_KEY)
  return null
}

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
    headers: { 'Content-Type': 'application/json' },
  })
})

app.get('/registry/hooks/:name/hook.json', async (c) => {
  const name = c.req.param('name')
  const obj = await c.env.HOOKPM_BUCKET.get(`hooks/${name}/hook.json`)
  if (!obj) return errorResponse(404, 'NOT_FOUND', `Hook '${name}' not found`)

  const body = await obj.text()
  return new Response(body, { headers: { 'Content-Type': 'application/json' } })
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

  return new Response(body, { headers: { 'Content-Type': contentType } })
})

// ─── Publish (POST /registry/hooks) ──────────────────────────────────────────

app.post('/registry/hooks', async (c) => {
  // 1. Auth
  const user = await resolveUser(c.req.raw, c.env)
  if (!user) {
    const hasHeader = c.req.header('Authorization')
    if (!hasHeader) return errorResponse(401, 'UNAUTHORIZED', 'Authorization header required')
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token')
  }

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
  } catch (_e) {
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

  return c.json({ name: hook.name, version: hook.version }, 201)
})

// ─── Authors ──────────────────────────────────────────────────────────────────

async function getIndex(c: { env: Env }): Promise<HookIndexEntry[] | null> {
  const obj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (!obj) return null
  const raw = JSON.parse(await obj.text()) as unknown
  const parsed = HookIndexSchema.safeParse(raw)
  return parsed.success ? parsed.data.hooks : []
}

app.get('/authors/me', async (c) => {
  const user = await resolveUser(c.req.raw, c.env)
  if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Authorization header required')

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
