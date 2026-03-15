#!/usr/bin/env tsx
/**
 * sync-to-r2.ts — Upload all registry hooks to the R2-backed API.
 *
 * Reads auth token from ~/.hookpm/auth.json (written by `hookpm login`).
 * Uploads each hook as multipart/form-data to POST /registry/hooks.
 *
 * Run: npx tsx registry/scripts/sync-to-r2.ts
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryDir = path.resolve(__dirname, '..')
const hooksDir = path.join(registryDir, 'hooks')

const API_URL = process.env['HOOKPM_API_URL'] ?? 'https://api.nafistiham.com'
const ADMIN_TOKEN = process.env['HOOKPM_ADMIN_TOKEN'] ?? ''
const AUTH_PATH = path.join(os.homedir(), '.hookpm', 'auth.json')

// ─── Load auth token ──────────────────────────────────────────────────────────

function loadToken(): string {
  if (!fs.existsSync(AUTH_PATH)) {
    console.error('Not logged in. Run: node dist/index.js login')
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')) as { token?: string; clerk_token?: string }
  const token = raw.token ?? raw.clerk_token
  if (!token) {
    console.error('Auth file missing token. Run: node dist/index.js login')
    process.exit(1)
  }
  return token
}

// ─── Upload one hook ──────────────────────────────────────────────────────────

async function uploadHook(hookName: string, token: string): Promise<'ok' | 'skip' | 'error'> {
  const hookDir = path.join(hooksDir, hookName)
  const manifestPath = path.join(hookDir, 'hook.json')

  if (!fs.existsSync(manifestPath)) return 'skip'

  let hook: { name: string; version: string }
  try {
    hook = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    console.error(`  ✗ ${hookName}: invalid hook.json`)
    return 'error'
  }

  const archiveName = `${hook.name}-${hook.version}.tar.gz`
  const archivePath = path.join(hookDir, archiveName)

  if (!fs.existsSync(archivePath)) {
    console.error(`  ✗ ${hookName}: archive not found — run npm run build-archives first`)
    return 'error'
  }

  const form = new FormData()
  form.append('manifest', new Blob([fs.readFileSync(manifestPath)], { type: 'application/json' }), 'hook.json')
  form.append('archive', new Blob([fs.readFileSync(archivePath)], { type: 'application/gzip' }), archiveName)

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (ADMIN_TOKEN) headers['X-Admin-Token'] = ADMIN_TOKEN

  const res = await fetch(`${API_URL}/registry/hooks`, {
    method: 'POST',
    headers,
    body: form,
  })

  if (res.status === 409) {
    console.log(`  · ${hookName}@${hook.version} — already exists, skipping`)
    return 'ok'
  }

  if (!res.ok) {
    const body = await res.text()
    console.error(`  ✗ ${hookName}: HTTP ${res.status} — ${body}`)
    return 'error'
  }

  console.log(`  ✓ ${hookName}@${hook.version}`)
  return 'ok'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token = loadToken()

  const hookDirs = fs
    .readdirSync(hooksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  console.log(`Syncing ${hookDirs.length} hooks to ${API_URL}...\n`)

  let ok = 0
  let errors = 0

  for (const name of hookDirs) {
    const result = await uploadHook(name, token)
    if (result === 'error') errors++
    else ok++
    // Small delay to avoid any transient throttling
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\n${ok} synced, ${errors} error(s)`)
  if (errors > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
