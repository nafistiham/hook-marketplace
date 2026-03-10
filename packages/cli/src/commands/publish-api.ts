import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'
import { HookJsonSchema } from '@hookpm/schema'
import { config } from '../config.js'
import { success, error, info, startSpinner } from './output.js'
import { readAuth, isExpired } from '../auth/index.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublishApiOptions {
  authPath?: string
  hookDir?: string
  dryRun?: boolean
}

function buildArchive(hookDir: string, name: string, version: string): string {
  const tmpBase = os.tmpdir()
  const stagingName = `${name}-${version}`
  const stagingDir = path.join(tmpBase, `hookpm-publish-${Date.now()}`, stagingName)
  fs.mkdirSync(stagingDir, { recursive: true })

  const entries = fs.readdirSync(hookDir).filter(
    (f) => f !== 'node_modules' && f !== '.git',
  )
  for (const entry of entries) {
    fs.copyFileSync(path.join(hookDir, entry), path.join(stagingDir, entry))
  }

  const archivePath = path.join(path.dirname(stagingDir), `${stagingName}.tar.gz`)
  execFileSync('tar', ['-czf', archivePath, '-C', path.dirname(stagingDir), stagingName])
  return archivePath
}

// ─── Command ──────────────────────────────────────────────────────────────────

export async function runPublishApi(opts: PublishApiOptions = {}): Promise<void> {
  const authPath = opts.authPath ?? path.join(config.hookpmDir, 'auth.json')
  const hookDir = opts.hookDir ?? process.cwd()

  // 1. Auth check
  const auth = readAuth(authPath)
  if (!auth) {
    error('Not logged in. Run: hookpm login')
    process.exitCode = 1
    return
  }
  if (isExpired(auth)) {
    error('Session expired. Run: hookpm login')
    process.exitCode = 1
    return
  }

  // 2. Read hook.json
  const hookJsonPath = path.join(hookDir, 'hook.json')
  if (!fs.existsSync(hookJsonPath)) {
    error('hook.json not found in current directory')
    process.exitCode = 1
    return
  }

  let hookRaw: unknown
  try {
    hookRaw = JSON.parse(fs.readFileSync(hookJsonPath, 'utf8'))
  } catch {
    error('hook.json is not valid JSON')
    process.exitCode = 1
    return
  }

  // 3. Schema validation
  const parsed = HookJsonSchema.safeParse(hookRaw)
  if (!parsed.success) {
    const summary = parsed.error.errors
      .slice(0, 5)
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    error(`hook.json validation failed:\n${summary}`)
    process.exitCode = 1
    return
  }
  const hook = parsed.data

  // 4. Author check (early, before slow archive build)
  if (hook.author !== auth.username) {
    error(
      `hook.json author '${hook.author}' does not match your username '${auth.username}'`,
    )
    process.exitCode = 1
    return
  }

  if (opts.dryRun) {
    info(`Dry run — ${hook.name}@${hook.version} would be published`)
    return
  }

  // 5. Build archive
  startSpinner(`Building archive for ${hook.name}@${hook.version}…`)
  let archivePath: string
  try {
    archivePath = buildArchive(hookDir, hook.name, hook.version)
  } catch (err) {
    error(`Failed to build archive: ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
    return
  }

  try {
    // 6. POST to API
    startSpinner(`Uploading ${hook.name}@${hook.version}…`)

    const form = new FormData()
    form.append(
      'manifest',
      new Blob([JSON.stringify(hook)], { type: 'application/json' }),
      'hook.json',
    )
    form.append(
      'archive',
      new Blob([fs.readFileSync(archivePath)], { type: 'application/gzip' }),
      `${hook.name}-${hook.version}.tar.gz`,
    )

    const res = await fetch(`${config.apiUrl}/registry/hooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.clerk_token}` },
      body: form,
    })

    if (res.status === 201) {
      success(`Published ${hook.name}@${hook.version}`)
      return
    }

    const body = await res.json() as { error?: { code?: string; message?: string } }
    const code = body.error?.code ?? 'UNKNOWN'
    const message = body.error?.message ?? 'unknown error'

    switch (res.status) {
      case 401:
        error(`Authentication failed. Run: hookpm login`)
        break
      case 403:
        error(`Not authorized to publish as '${hook.author}'`)
        break
      case 409:
        error(`${hook.name}@${hook.version} already published. Bump the version in hook.json.`)
        break
      case 422:
        error(`Server rejected hook.json: ${message}`)
        break
      default:
        error(`Server error (${res.status} ${code}): ${message}. Try again or check status.hookpm.dev`)
    }
    process.exitCode = 1
  } finally {
    // Clean up temp archive
    try {
      const archiveDir = path.dirname(archivePath)
      fs.rmSync(archiveDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
