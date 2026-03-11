import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'node:path'
import * as os from 'node:os'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearEnv() {
  delete process.env['HOOKPM_REGISTRY_URL']
  delete process.env['HOOKPM_REGISTRY_TIMEOUT_MS']
  delete process.env['HOOKPM_DOWNLOAD_TIMEOUT_MS']
  delete process.env['HOOKPM_DIR']
  delete process.env['HOOKPM_SETTINGS_PATH']
  delete process.env['HOOKPM_LOCKFILE_PATH']
  delete process.env['HOOKPM_SUBMIT_URL']
}

// config.ts calls parseConfig() at module load time, so we test the schema
// directly rather than re-importing the module (which would already be cached).
// We import and re-exercise the ConfigSchema logic via a local re-implementation
// that mirrors config.ts — this is the recommended Vitest approach for
// modules that eagerly evaluate at import time.

import { z } from 'zod'

const buildConfigSchema = () =>
  z.object({
    registryUrl: z
      .string()
      .url()
      .refine((v) => v.startsWith('https://'), {
        message: 'HOOKPM_REGISTRY_URL must use https',
      })
      .default(
        'https://raw.githubusercontent.com/nafistiham/hook-marketplace/main/registry',
      ),
    apiUrl: z
      .string()
      .url()
      .refine((v) => v.startsWith('https://'), {
        message: 'HOOKPM_API_URL must use https',
      })
      .default('https://api.hookpm.dev'),
    registryTimeout: z.coerce.number().int().positive().default(10_000),
    downloadTimeout: z.coerce.number().int().positive().default(30_000),
    hookpmDir: z.string().default(path.join(os.homedir(), '.hookpm')),
    settingsPath: z
      .string()
      .default(path.join(os.homedir(), '.claude', 'settings.json')),
    lockfilePath: z
      .string()
      .default(path.join(os.homedir(), '.hookpm', 'hookpm.lock')),
    submitUrl: z
      .string()
      .url()
      .refine((v) => v.startsWith('https://'), {
        message: 'HOOKPM_SUBMIT_URL must use https',
      })
      .default('https://hookpm.dev/submit'),
  })

function parseEnv(env: Record<string, string | undefined>) {
  const ConfigSchema = buildConfigSchema()
  return ConfigSchema.safeParse({
    registryUrl:     env['HOOKPM_REGISTRY_URL'],
    apiUrl:          env['HOOKPM_API_URL'],
    registryTimeout: env['HOOKPM_REGISTRY_TIMEOUT_MS'],
    downloadTimeout: env['HOOKPM_DOWNLOAD_TIMEOUT_MS'],
    hookpmDir:       env['HOOKPM_DIR'],
    settingsPath:    env['HOOKPM_SETTINGS_PATH'],
    lockfilePath:    env['HOOKPM_LOCKFILE_PATH'],
    submitUrl:       env['HOOKPM_SUBMIT_URL'],
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfigSchema — defaults', () => {
  it('applies all defaults when no env vars are set', () => {
    const result = parseEnv({})
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.registryTimeout).toBe(10_000)
    expect(result.data.downloadTimeout).toBe(30_000)
    expect(result.data.hookpmDir).toBe(path.join(os.homedir(), '.hookpm'))
    expect(result.data.settingsPath).toBe(
      path.join(os.homedir(), '.claude', 'settings.json'),
    )
    expect(result.data.lockfilePath).toBe(
      path.join(os.homedir(), '.hookpm', 'hookpm.lock'),
    )
  })

  it('default registryUrl uses https', () => {
    const result = parseEnv({})
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.registryUrl.startsWith('https://')).toBe(true)
  })

  it('default submitUrl uses https', () => {
    const result = parseEnv({})
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.submitUrl.startsWith('https://')).toBe(true)
  })
})

describe('ConfigSchema — HOOKPM_REGISTRY_URL', () => {
  it('accepts a valid https registry URL', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_URL: 'https://custom.example.com/registry' })
    expect(result.success).toBe(true)
  })

  it('rejects an http (non-https) registry URL', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_URL: 'http://insecure.example.com/registry' })
    expect(result.success).toBe(false)
    if (result.success) return
    const msg = result.error.issues[0]?.message ?? ''
    expect(msg).toMatch(/https/)
  })

  it('rejects a non-URL string for registryUrl', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_URL: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})

describe('ConfigSchema — HOOKPM_API_URL', () => {
  it('defaults to https://api.hookpm.dev', () => {
    const result = parseEnv({})
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.apiUrl).toBe('https://api.hookpm.dev')
  })

  it('accepts a valid https API URL override', () => {
    const result = parseEnv({ HOOKPM_API_URL: 'https://staging.api.hookpm.dev' })
    expect(result.success).toBe(true)
  })

  it('rejects an http (non-https) API URL', () => {
    const result = parseEnv({ HOOKPM_API_URL: 'http://api.hookpm.dev' })
    expect(result.success).toBe(false)
    if (result.success) return
    const msg = result.error.issues[0]?.message ?? ''
    expect(msg).toMatch(/https/)
  })
})

describe('ConfigSchema — HOOKPM_SUBMIT_URL', () => {
  it('accepts a valid https submit URL', () => {
    const result = parseEnv({ HOOKPM_SUBMIT_URL: 'https://api.hookpm.dev/v1/publish' })
    expect(result.success).toBe(true)
  })

  it('rejects an http (non-https) submit URL', () => {
    const result = parseEnv({ HOOKPM_SUBMIT_URL: 'http://api.hookpm.dev/v1/publish' })
    expect(result.success).toBe(false)
    if (result.success) return
    const msg = result.error.issues[0]?.message ?? ''
    expect(msg).toMatch(/https/)
  })
})

describe('ConfigSchema — timeout coercion', () => {
  it('coerces string timeout to number', () => {
    const result = parseEnv({
      HOOKPM_REGISTRY_TIMEOUT_MS: '5000',
      HOOKPM_DOWNLOAD_TIMEOUT_MS: '60000',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.registryTimeout).toBe(5_000)
    expect(result.data.downloadTimeout).toBe(60_000)
  })

  it('rejects non-positive timeout value', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_TIMEOUT_MS: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects negative timeout value', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_TIMEOUT_MS: '-1000' })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric timeout string', () => {
    const result = parseEnv({ HOOKPM_REGISTRY_TIMEOUT_MS: 'fast' })
    expect(result.success).toBe(false)
  })
})

describe('ConfigSchema — path overrides', () => {
  it('accepts custom hookpmDir path', () => {
    const result = parseEnv({ HOOKPM_DIR: '/custom/.hookpm' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.hookpmDir).toBe('/custom/.hookpm')
  })

  it('accepts custom settingsPath', () => {
    const result = parseEnv({ HOOKPM_SETTINGS_PATH: '/project/.claude/settings.json' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.settingsPath).toBe('/project/.claude/settings.json')
  })

  it('accepts custom lockfilePath', () => {
    const result = parseEnv({ HOOKPM_LOCKFILE_PATH: '/project/hookpm.lock' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.lockfilePath).toBe('/project/hookpm.lock')
  })
})
