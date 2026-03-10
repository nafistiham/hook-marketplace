import { Hono } from 'hono'

type Env = {
  HOOKPM_BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()

// ─── Error helpers ────────────────────────────────────────────────────────────

function notFound(message: string) {
  return Response.json(
    { error: { code: 'NOT_FOUND', message } },
    { status: 404 },
  )
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({ status: 'ok', phase: '1B' })
})

// ─── Registry reads (R2-backed) ───────────────────────────────────────────────

app.get('/registry/index.json', async (c) => {
  const obj = await c.env.HOOKPM_BUCKET.get('index.json')
  if (!obj) return notFound('Registry index not found')

  const body = await obj.text()
  return new Response(body, {
    headers: { 'Content-Type': 'application/json' },
  })
})

app.get('/registry/hooks/:name/hook.json', async (c) => {
  const name = c.req.param('name')
  const key = `hooks/${name}/hook.json`
  const obj = await c.env.HOOKPM_BUCKET.get(key)
  if (!obj) return notFound(`Hook '${name}' not found`)

  const body = await obj.text()
  return new Response(body, {
    headers: { 'Content-Type': 'application/json' },
  })
})

app.get('/registry/hooks/:name/:filename', async (c) => {
  const name = c.req.param('name')
  const filename = c.req.param('filename')
  const key = `hooks/${name}/${filename}`
  const obj = await c.env.HOOKPM_BUCKET.get(key)
  if (!obj) return notFound(`File '${filename}' not found for hook '${name}'`)

  const contentType = obj.httpMetadata?.contentType ?? 'application/octet-stream'
  const body = await obj.arrayBuffer()
  return new Response(body, {
    headers: { 'Content-Type': contentType },
  })
})

export default app
