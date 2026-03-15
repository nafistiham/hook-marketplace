import * as fs from 'node:fs'
import * as path from 'node:path'

const NETWORK_PATTERNS = [
  'fetch(',
  'axios.',
  'https.request',
  'http.request',
  'curl ',
  'wget ',
  'axios(',
  'got(',
  'superagent',
  'node-fetch',
] as const

const SUBPROCESS_PATTERNS = [
  'exec(',
  'execSync(',
  'spawn(',
  'spawnSync(',
  'child_process',
  'subprocess.run',
  'subprocess.Popen',
  'os.system(',
  'os.popen(',
] as const

// Extensions to skip (binary, data, docs)
const SKIP_EXTENSIONS = new Set(['.json', '.md', '.lock', '.png', '.jpg', '.svg', '.gif'])

function readSourceFiles(hookDir: string): string[] {
  try {
    return fs
      .readdirSync(hookDir)
      .filter((f) => !SKIP_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map((f) => {
        try {
          return fs.readFileSync(path.join(hookDir, f), 'utf8')
        } catch {
          return ''
        }
      })
  } catch {
    return []
  }
}

/**
 * Scan all source files in a hook directory for network and subprocess patterns.
 * This runs in Node.js (not Cloudflare Workers) so can read actual files from disk.
 */
export function scanHookDir(hookDir: string): {
  calls_external_api: boolean
  spawns_subprocess: boolean
} {
  const sources = readSourceFiles(hookDir)
  const combined = sources.join('\n')
  return {
    calls_external_api: NETWORK_PATTERNS.some((p) => combined.includes(p)),
    spawns_subprocess: SUBPROCESS_PATTERNS.some((p) => combined.includes(p)),
  }
}
