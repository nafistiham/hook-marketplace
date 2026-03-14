import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthFile = {
  clerk_token: string
  expires_at: string  // ISO 8601
  username: string
}

// ─── readAuth ─────────────────────────────────────────────────────────────────

/**
 * Reads and parses ~/.hookpm/auth.json (or the given path).
 * Returns null if the file does not exist or contains corrupt JSON.
 */
export function readAuth(authPath: string): AuthFile | null {
  if (!fs.existsSync(authPath)) return null
  const raw = fs.readFileSync(authPath, 'utf8')
  try {
    return JSON.parse(raw) as AuthFile
  } catch {
    return null
  }
}

// ─── saveAuth ────────────────────────────────────────────────────────────────

/**
 * Writes auth.json atomically with mode 0o600.
 * Creates parent directory (~/.hookpm/) with mode 0o700 if absent.
 */
export function saveAuth(authPath: string, data: AuthFile): void {
  const dir = path.dirname(authPath)
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const tmp = `${authPath}.${crypto.randomBytes(4).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
    fs.renameSync(tmp, authPath)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch { /* best-effort cleanup */ }
    throw err
  }
}

// ─── isExpired ────────────────────────────────────────────────────────────────

export function isExpired(auth: AuthFile): boolean {
  return Date.now() >= new Date(auth.expires_at).getTime()
}
