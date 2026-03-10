import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCached, setCached, clearCache } from '../cache.js'
import type { HookIndex } from '@hookpm/schema'

const VALID_INDEX: HookIndex = {
  schema_version: '1',
  generated_at: '2026-03-10T00:00:00Z',
  hooks: [],
}

describe('cache', () => {
  beforeEach(() => {
    clearCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── getCached — miss ──────────────────────────────────────────────────────

  it('returns undefined for a key that was never set', () => {
    expect(getCached('index')).toBeUndefined()
  })

  it('returns undefined after clearCache()', () => {
    setCached('index', VALID_INDEX, 60_000)
    clearCache()
    expect(getCached('index')).toBeUndefined()
  })

  // ─── setCached + getCached — hit ───────────────────────────────────────────

  it('returns the stored value when within TTL', () => {
    setCached('index', VALID_INDEX, 60_000)
    const result = getCached('index')
    expect(result).toEqual(VALID_INDEX)
  })

  it('returns the same object reference', () => {
    setCached('index', VALID_INDEX, 60_000)
    expect(getCached('index')).toBe(VALID_INDEX)
  })

  // ─── TTL expiry ───────────────────────────────────────────────────────────

  it('returns undefined after TTL has elapsed', () => {
    vi.useFakeTimers()
    setCached('index', VALID_INDEX, 1_000) // 1 second TTL
    vi.advanceTimersByTime(1_001)
    expect(getCached('index')).toBeUndefined()
  })

  it('returns the value just before TTL expires', () => {
    vi.useFakeTimers()
    setCached('index', VALID_INDEX, 1_000)
    vi.advanceTimersByTime(999)
    expect(getCached('index')).toBe(VALID_INDEX)
  })

  // ─── overwrite ────────────────────────────────────────────────────────────

  it('overwrites an existing entry with a new value', () => {
    const first: HookIndex = { ...VALID_INDEX, generated_at: '2026-03-10T00:00:00Z' }
    const second: HookIndex = { ...VALID_INDEX, generated_at: '2026-03-11T00:00:00Z' }
    setCached('index', first, 60_000)
    setCached('index', second, 60_000)
    expect(getCached('index')).toBe(second)
  })

  // ─── clearCache ───────────────────────────────────────────────────────────

  it('clearCache removes all entries', () => {
    setCached('index', VALID_INDEX, 60_000)
    clearCache()
    expect(getCached('index')).toBeUndefined()
  })

  // ─── expired entry is deleted ─────────────────────────────────────────────

  it('expired entries are removed from the store on access', () => {
    vi.useFakeTimers()
    setCached('index', VALID_INDEX, 500)
    vi.advanceTimersByTime(501)
    getCached('index') // triggers delete
    // Re-set with fresh TTL — if old entry was deleted, we get the new value
    const fresh: HookIndex = { ...VALID_INDEX, generated_at: '2026-03-12T00:00:00Z' }
    setCached('index', fresh, 60_000)
    expect(getCached('index')).toBe(fresh)
  })
})
