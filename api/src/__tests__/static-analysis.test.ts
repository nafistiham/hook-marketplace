import { describe, it, expect } from 'vitest'
import { detectCallsExternalApi, detectSpawnsSubprocess, runStaticAnalysis } from '../static-analysis.js'
import type { HookJson } from '@hookpm/schema'

// Minimal valid HookJson — command handler, no network patterns
const BASE: HookJson = {
  name: 'test-hook',
  version: '1.0.0',
  description: 'test',
  author: 'test',
  license: 'MIT',
  event: 'PreToolUse',
  handler: { type: 'command', command: 'python3 guard.py', async: false },
  capabilities: ['block'],
  tags: [],
  permissions: {
    network: { allowed: false, domains: [] },
    filesystem: { read: [], write: [] },
    env_vars: [],
    spawns_processes: false,
  },
  requires: { os: ['darwin', 'linux', 'windows'], shell: ['bash', 'zsh', 'sh'] },
  attestations: [],
}

describe('detectCallsExternalApi', () => {
  it('returns true for http handler type — unconditionally', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'http', url: 'https://example.com/hook' } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('returns false for command handler with no network patterns', () => {
    expect(detectCallsExternalApi(BASE)).toBe(false)
  })

  it('detects fetch( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: "node -e \"fetch('https://x.com')\"", async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('detects curl in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'curl https://example.com/api', async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('detects wget in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: 'wget -q https://x.com', async: false } }
    expect(detectCallsExternalApi(hook)).toBe(true)
  })

  it('returns false for prompt handler with no network patterns', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'prompt', prompt: 'Summarize changes' } }
    expect(detectCallsExternalApi(hook)).toBe(false)
  })

  it('returns false for agent handler with no network patterns', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'agent', prompt: 'Review code' } }
    expect(detectCallsExternalApi(hook)).toBe(false)
  })
})

describe('detectSpawnsSubprocess', () => {
  it('returns false for command handler with no subprocess patterns', () => {
    expect(detectSpawnsSubprocess(BASE)).toBe(false)
  })

  it('detects exec( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: "node -e \"exec('ls')\"", async: false } }
    expect(detectSpawnsSubprocess(hook)).toBe(true)
  })

  it('detects spawn( in command string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'command', command: "node -e \"spawn('git', [])\"", async: false } }
    expect(detectSpawnsSubprocess(hook)).toBe(true)
  })

  it('detects subprocess.run in prompt string', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'prompt', prompt: 'Run subprocess.run to check git status' } }
    expect(detectSpawnsSubprocess(hook)).toBe(true)
  })

  it('returns false for http handler', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'http', url: 'https://x.com' } }
    expect(detectSpawnsSubprocess(hook)).toBe(false)
  })
})

describe('runStaticAnalysis', () => {
  it('returns both flags for a hook with no patterns', () => {
    const result = runStaticAnalysis(BASE)
    expect(result).toEqual({ calls_external_api: false, spawns_subprocess: false })
  })

  it('returns calls_external_api: true for http handler', () => {
    const hook: HookJson = { ...BASE, handler: { type: 'http', url: 'https://x.com' } }
    const result = runStaticAnalysis(hook)
    expect(result.calls_external_api).toBe(true)
  })
})
