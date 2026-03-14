import { describe, it, expect } from 'vitest'
import { checkCapabilities, verifySignature } from '../index.js'

// ─── checkCapabilities ────────────────────────────────────────────────────────

describe('checkCapabilities()', () => {
  it('returns dangerous:false for an empty capabilities array', () => {
    expect(checkCapabilities([])).toEqual({ dangerous: false })
  })

  it('returns dangerous:false for non-dangerous capabilities', () => {
    expect(checkCapabilities(['block', 'read-stdin', 'write-stdout', 'side-effects-only'])).toEqual({ dangerous: false })
  })

  it('returns dangerous:true when modify-input is present', () => {
    const result = checkCapabilities(['modify-input'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('modify-input')
    }
  })

  it('returns dangerous:true when inject-context is present', () => {
    const result = checkCapabilities(['inject-context'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('inject-context')
    }
  })

  it('returns dangerous:true when approve is present', () => {
    const result = checkCapabilities(['approve'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toContain('approve')
    }
  })

  it('returns all dangerous capabilities when multiple are present', () => {
    const result = checkCapabilities(['modify-input', 'inject-context', 'approve'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toHaveLength(3)
      expect(result.capabilities).toContain('modify-input')
      expect(result.capabilities).toContain('inject-context')
      expect(result.capabilities).toContain('approve')
    }
  })

  it('filters out non-dangerous capabilities from the result', () => {
    const result = checkCapabilities(['block', 'modify-input', 'read-stdin'])
    expect(result.dangerous).toBe(true)
    if (result.dangerous) {
      expect(result.capabilities).toEqual(['modify-input'])
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
