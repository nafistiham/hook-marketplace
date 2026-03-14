import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import type { ClaudeSettings, Lockfile } from './types.js'
import { ParseError, WriteError } from './types.js'

export type { ClaudeSettings, Lockfile }
export type { ParseError, WriteError }

export type SettingsPaths = {
  settingsPath: string
  lockfilePath: string
}

function emptyLockfile(): Lockfile {
  return {
    version: '1',
    generated: new Date().toISOString(),
    registry: '',
    hooks: {},
  }
}

// ─── readSettings ─────────────────────────────────────────────────────────────

export function readSettings(settingsPath: string): ClaudeSettings {
  let realPath = settingsPath
  try {
    const stat = fs.lstatSync(settingsPath)
    if (stat.isSymbolicLink()) {
      realPath = fs.realpathSync(settingsPath)
    }
  } catch {
    // File does not exist — return empty settings
    return {}
  }

  let raw: string
  try {
    raw = fs.readFileSync(realPath, 'utf8')
  } catch {
    return {}
  }

  try {
    return JSON.parse(raw) as ClaudeSettings
  } catch (cause) {
    throw new ParseError(
      `settings.json is corrupt or contains invalid JSON at ${settingsPath}`,
      cause,
    )
  }
}

// ─── writeSettingsAtomic ──────────────────────────────────────────────────────

export function writeSettingsAtomic(settingsPath: string, data: ClaudeSettings): void {
  const dir = path.dirname(settingsPath)
  const randomHex = crypto.randomBytes(4).toString('hex')
  const tmpPath = path.join(dir, `.hookpm-tmp-${randomHex}`)
  const serialized = JSON.stringify(data, null, 2)

  try {
    fs.writeFileSync(tmpPath, serialized, 'utf8')
  } catch (cause) {
    try { fs.unlinkSync(tmpPath) } catch { /* best-effort cleanup */ }
    throw new WriteError(`Failed to write settings to ${tmpPath}`, cause)
  }

  try {
    fs.renameSync(tmpPath, settingsPath)
  } catch (cause) {
    throw new WriteError(
      `Failed to rename tmp file to settings.json — settings.json unchanged`,
      cause,
    )
  }
}

// ─── readLockfile ─────────────────────────────────────────────────────────────

export function readLockfile(lockfilePath: string): Lockfile {
  let raw: string
  try {
    raw = fs.readFileSync(lockfilePath, 'utf8')
  } catch {
    // File does not exist — return empty lockfile
    return emptyLockfile()
  }

  try {
    return JSON.parse(raw) as Lockfile
  } catch {
    // Corrupt lockfile — log warning and return empty (recoverable)
    process.stderr.write(
      `hookpm: lockfile at ${lockfilePath} is corrupt — treating as empty\n`,
    )
    return emptyLockfile()
  }
}

// ─── writeLockfile ────────────────────────────────────────────────────────────

export function writeLockfile(lockfilePath: string, data: Lockfile): void {
  const dir = path.dirname(lockfilePath)
  const randomHex = crypto.randomBytes(4).toString('hex')
  const tmpPath = path.join(dir, `.hookpm-lock-tmp-${randomHex}`)
  const serialized = JSON.stringify(data, null, 2)

  try {
    fs.writeFileSync(tmpPath, serialized, 'utf8')
  } catch (cause) {
    try { fs.unlinkSync(tmpPath) } catch { /* best-effort cleanup */ }
    throw new WriteError(`Failed to write lockfile at ${lockfilePath}`, cause)
  }

  try {
    fs.renameSync(tmpPath, lockfilePath)
  } catch (cause) {
    throw new WriteError(
      `Failed to rename tmp file to lockfile — lockfile unchanged`,
      cause,
    )
  }
}
