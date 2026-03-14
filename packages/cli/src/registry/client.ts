import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import * as tar from 'tar'
import { HookIndexSchema, HookJsonRegistrySchema } from '@hookpm/schema'
import type { HookIndex, HookJsonRegistry } from '@hookpm/schema'
import { RegistryError } from './types.js'
import { getCached, setCached } from './cache.js'
import { config } from '../config.js'

export type FetchIndexResult =
  | { ok: true; data: HookIndex }
  | { ok: false; error: RegistryError }

export type FetchHookResult =
  | { ok: true; data: HookJsonRegistry }
  | { ok: false; error: RegistryError }

export type DownloadResult =
  | { ok: true; installedPath: string; integrity: string }
  | { ok: false; error: RegistryError }

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs: number): Promise<
  | { ok: true; json: unknown }
  | { ok: false; error: RegistryError }
> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (cause) {
    return {
      ok: false,
      error: new RegistryError(`Network error fetching ${url}`, 'NETWORK_ERROR', cause),
    }
  }

  if (response.status === 404) {
    return {
      ok: false,
      error: new RegistryError(`Not found: ${url}`, 'NOT_FOUND'),
    }
  }

  if (response.status !== 200) {
    return {
      ok: false,
      error: new RegistryError(
        `Unexpected status ${response.status} from ${url}`,
        'NETWORK_ERROR',
      ),
    }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (cause) {
    return {
      ok: false,
      error: new RegistryError(
        `Registry returned non-JSON response from ${url}`,
        'INVALID_RESPONSE',
        cause,
      ),
    }
  }

  return { ok: true, json }
}

// ─── fetchIndex ───────────────────────────────────────────────────────────────

export async function fetchIndex(): Promise<FetchIndexResult> {
  const cached = getCached('index')
  if (cached) return { ok: true, data: cached }

  const url = `${config.registryUrl}/index.json`
  const result = await fetchJson(url, config.registryTimeout)
  if (!result.ok) return result

  const parsed = HookIndexSchema.safeParse(result.json)
  if (!parsed.success) {
    return {
      ok: false,
      error: new RegistryError(
        `Registry index failed schema validation`,
        'VALIDATION_ERROR',
      ),
    }
  }

  setCached('index', parsed.data, 60_000)
  return { ok: true, data: parsed.data }
}

// ─── fetchHook ────────────────────────────────────────────────────────────────

export async function fetchHook(
  name: string,
  version?: string,
): Promise<FetchHookResult> {
  let resolvedVersion = version

  if (!resolvedVersion) {
    const indexResult = await fetchIndex()
    if (!indexResult.ok) return indexResult

    const entry = indexResult.data.hooks.find((h) => h.name === name)
    if (!entry) {
      return {
        ok: false,
        error: new RegistryError(`Hook '${name}' not found in registry`, 'NOT_FOUND'),
      }
    }
    resolvedVersion = entry.latest
  }

  const url = `${config.registryUrl}/hooks/${name}/hook.json`
  const result = await fetchJson(url, config.registryTimeout)
  if (!result.ok) return result

  const parsed = HookJsonRegistrySchema.safeParse(result.json)
  if (!parsed.success) {
    return {
      ok: false,
      error: new RegistryError(
        `Hook manifest for '${name}' failed schema validation`,
        'VALIDATION_ERROR',
      ),
    }
  }

  // Warn if fetched version doesn't match requested
  if (parsed.data.version !== resolvedVersion) {
    process.stderr.write(
      `hookpm: warning — index says latest is ${resolvedVersion} but hook.json reports ${parsed.data.version} (index may be out of sync)\n`,
    )
  }

  return { ok: true, data: parsed.data }
}

// ─── downloadArchive ──────────────────────────────────────────────────────────

export async function downloadArchive(
  name: string,
  version: string,
): Promise<DownloadResult> {
  const installDir = path.join(config.hookpmDir, 'hooks', `${name}@${version}`)
  const sentinelPath = path.join(installDir, '.hookpm-complete')

  // Idempotency: sentinel means complete prior install
  if (fs.existsSync(sentinelPath)) {
    const integrity = fs.readFileSync(sentinelPath, 'utf8').trim()
    return { ok: true, installedPath: installDir, integrity }
  }

  // Partial install: dir exists without sentinel — clean up and re-download
  if (fs.existsSync(installDir)) {
    fs.rmSync(installDir, { recursive: true, force: true })
  }

  const archiveUrl = `${config.registryUrl}/hooks/${name}/${name}-${version}.tar.gz`

  let response: Response
  try {
    response = await fetch(archiveUrl, {
      signal: AbortSignal.timeout(config.downloadTimeout),
    })
  } catch (cause) {
    return {
      ok: false,
      error: new RegistryError(
        `Network error downloading ${name}@${version}`,
        'NETWORK_ERROR',
        cause,
      ),
    }
  }

  if (response.status === 404) {
    return {
      ok: false,
      error: new RegistryError(`Archive not found: ${archiveUrl}`, 'NOT_FOUND'),
    }
  }

  if (response.status !== 200) {
    return {
      ok: false,
      error: new RegistryError(
        `Unexpected status ${response.status} downloading ${name}@${version}`,
        'NETWORK_ERROR',
      ),
    }
  }

  const arrayBuf = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)

  // Compute SHA-256 before extraction
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const integrity = `sha256-${hash}`

  // Extract archive
  fs.mkdirSync(installDir, { recursive: true })
  try {
    await pipeline(
      Readable.from(buffer),
      tar.x({
        cwd: installDir,
        strip: 1,
        filter: (entryPath: string) => {
          const normalized = path.normalize(entryPath)
          return !path.isAbsolute(normalized) && !normalized.startsWith('..')
        },
      }),
    )
  } catch (cause) {
    fs.rmSync(installDir, { recursive: true, force: true })
    return {
      ok: false,
      error: new RegistryError(
        `Failed to extract archive for ${name}@${version}`,
        'EXTRACT_ERROR',
        cause,
      ),
    }
  }

  // Write sentinel — proof of complete extraction
  fs.writeFileSync(sentinelPath, integrity, 'utf8')

  return { ok: true, installedPath: installDir, integrity }
}
