import * as fs from 'node:fs'
import * as path from 'node:path'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthFile = {
  clerk_token: string
  expires_at: string  // ISO 8601
  username: string
}

// ─── readAuth ─────────────────────────────────────────────────────────────────

/**
 * Reads and parses ~/.hookpm/auth.json (or the given path).
 * Returns null if the file does not exist.
 * Throws if the file exists but cannot be parsed (corrupt auth.json).
 */
export function readAuth(authPath: string): AuthFile | null {
  if (!fs.existsSync(authPath)) return null
  const raw = fs.readFileSync(authPath, 'utf8')
  const parsed = JSON.parse(raw) as AuthFile
  return parsed
}

// ─── saveAuth ────────────────────────────────────────────────────────────────

/**
 * Writes auth.json atomically with mode 0o600.
 * Creates parent directory (~/.hookpm/) with mode 0o700 if absent.
 */
export function saveAuth(authPath: string, data: AuthFile): void {
  const dir = path.dirname(authPath)
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  fs.writeFileSync(authPath, JSON.stringify(data, null, 2), { mode: 0o600 })
}

// ─── isExpired ────────────────────────────────────────────────────────────────

export function isExpired(auth: AuthFile): boolean {
  return Date.now() >= new Date(auth.expires_at).getTime()
}
