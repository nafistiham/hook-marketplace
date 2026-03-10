import { describe, it, expect } from 'vitest'
import { checkCapabilities, verifySignature } from '../index.js'

// ─── checkCapabilities ────────────────────────────────────────────────────────

describe('checkCapabilities()', () => {
  it('returns dangerous:false for an empty capabilities array', () => {
    expect(checkCapabilities([])).toEqual({ dangerous: false })
  })

  it('returns dangerous:false for non-dangerous capabilities', () => {
    expect(checkCapabilities(['block', 'read-stdin', 'write-stdout'])).toEqual({ dangerous: false })
  })

  it('returns dangerous:true when network_access is present', () => {
    const result = checkCapabilities(['network_access'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('network_access')
    }
  })

  it('returns dangerous:true when file_write is present', () => {
    const result = checkCapabilities(['file_write'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('file_write')
    }
  })

  it('returns dangerous:true when shell_exec is present', () => {
    const result = checkCapabilities(['shell_exec'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('shell_exec')
    }
  })

  it('returns all dangerous capabilities when multiple are present', () => {
    const result = checkCapabilities(['network_access', 'file_write', 'shell_exec'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toHaveLength(3)
      expect(result.capabilities).toContain('network_access')
      expect(result.capabilities).toContain('file_write')
      expect(result.capabilities).toContain('shell_exec')
    }
  })

  it('filters out non-dangerous capabilities from the result', () => {
    const result = checkCapabilities(['block', 'network_access', 'read-stdin'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toEqual(['network_access'])
    }
  })
})

// ─── verifySignature ──────────────────────────────────────────────────────────

describe('verifySignature() — Phase 1A stub', () => {
  it('returns ok:true with reason not-signed', async () => {
    const result = await verifySignature('my-hook', '/home/user/.hookpm/my-hook')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.reason).toBe('not-signed')
    }
  })

  it('is async and returns a Promise', () => {
    const result = verifySignature('my-hook', '/path')
    expect(result).toBeInstanceOf(Promise)
  })
})
