import type { HookJson } from '@hookpm/schema'

// Patterns that suggest external HTTP calls — scanned in handler/prompt strings
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

// Patterns that suggest subprocess spawning — scanned in handler/prompt strings
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

/** Extract the scannable string from a hook handler */
function handlerString(hook: HookJson): string {
  switch (hook.handler.type) {
    case 'command': return hook.handler.command
    case 'prompt':  return hook.handler.prompt
    case 'agent':   return hook.handler.prompt
    case 'http':    return '' // http type is handled by Stage A; no string to scan
  }
}

/**
 * Detects whether a hook makes external HTTP/API calls.
 * Stage A: http handler type → unconditionally true.
 * Stage B: scan handler string for network patterns.
 * Phase 1B limitation: does not scan archive source files.
 */
export function detectCallsExternalApi(hook: HookJson): boolean {
  if (hook.handler.type === 'http') return true
  const str = handlerString(hook)
  return NETWORK_PATTERNS.some((p) => str.includes(p))
}

/**
 * Detects whether a hook spawns subprocesses.
 * Scans handler/prompt string for known subprocess patterns.
 * Phase 1B limitation: does not scan archive source files.
 */
export function detectSpawnsSubprocess(hook: HookJson): boolean {
  const str = handlerString(hook)
  return SUBPROCESS_PATTERNS.some((p) => str.includes(p))
}

/** Run all static analysis detections and return platform-determined flags. */
export function runStaticAnalysis(hook: HookJson): {
  calls_external_api: boolean
  spawns_subprocess: boolean
} {
  return {
    calls_external_api: detectCallsExternalApi(hook),
    spawns_subprocess: detectSpawnsSubprocess(hook),
  }
}
