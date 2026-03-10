import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { config } from '../config.js'
import { info, success, error } from './output.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthFile = {
  clerk_token: string
  expires_at: string
  username: string
}

type TokenPollResponse = {
  token: string
  expires_at: string
  username: string
}

export interface LoginOptions {
  authPath?: string
  pollTimeoutMs?: number
  pollIntervalMs?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open'
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref()
}

function buildOAuthUrl(state: string): string {
  const base = `${config.apiUrl}/auth/login`
  return `${base}?state=${state}`
}

async function pollForToken(
  state: string,
  { pollTimeoutMs = 300_000, pollIntervalMs = 2_000 }: { pollTimeoutMs?: number; pollIntervalMs?: number },
): Promise<TokenPollResponse | null> {
  const deadline = Date.now() + pollTimeoutMs
  const url = `${config.apiUrl}/auth/token?state=${state}`

  while (Date.now() < deadline) {
    const res = await fetch(url)
    if (res.status === 200) {
      return (await res.json()) as TokenPollResponse
    }
    // 202 = pending, anything else = error
    if (res.status !== 202) return null

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return null
}

// ─── Command ──────────────────────────────────────────────────────────────────

export async function runLogin(opts: LoginOptions = {}): Promise<void> {
  const {
    authPath = path.join(config.hookpmDir, 'auth.json'),
    pollTimeoutMs = 300_000,
    pollIntervalMs = 2_000,
  } = opts

  const state = randomBytes(32).toString('hex')
  const oauthUrl = buildOAuthUrl(state)

  info(`Opening browser for GitHub login…`)
  info(`If the browser does not open, visit:\n  ${oauthUrl}`)
  openBrowser(oauthUrl)

  const tokenData = await pollForToken(state, { pollTimeoutMs, pollIntervalMs })

  if (!tokenData) {
    error('Login timed out. Run hookpm login to try again.')
    process.exitCode = 1
    return
  }

  const authDir = path.dirname(authPath)
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 })

  const authFile: AuthFile = {
    clerk_token: tokenData.token,
    expires_at: tokenData.expires_at,
    username: tokenData.username,
  }

  fs.writeFileSync(authPath, JSON.stringify(authFile, null, 2), { mode: 0o600 })

  success(`Logged in as ${tokenData.username}`)
}
