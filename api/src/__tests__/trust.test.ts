import { describe, it, expect } from 'vitest'
import { computeHealthTier, formatHealthTier, TRUST_THRESHOLDS } from '../trust.js'
import type { HookIndexEntry } from '@hookpm/schema'

const BASE_ENTRY: HookIndexEntry = {
  name: 'test',
  description: 'test',
  author: 'test',
  event: 'PreToolUse',
  tags: [],
  capabilities: ['block'],
  security: {
    sandbox_level: 'static-analysis',
    reviewed: false,
    review_date: null,
    signed: false,
    signed_by: null,
    signature: null,
    calls_external_api: false,
    spawns_subprocess: false,
  },
  attestations: [],
  rating_count: 0,
  rating_avg: 0,
  latest: '1.0.0',
  versions: ['1.0.0'],
  updated_at: '2026-03-15T00:00:00Z',
}

describe('TRUST_THRESHOLDS', () => {
  it('exposes required constants', () => {
    expect(TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE).toBe(5)
    expect(TRUST_THRESHOLDS.MIN_AVG_FOR_TRUSTED).toBe(4.0)
    expect(TRUST_THRESHOLDS.MIN_ATTESTATIONS_FOR_TRUSTED).toBe(1)
  })
})

describe('computeHealthTier', () => {
  it('returns unverified when sandbox_level is none', () => {
    const entry: HookIndexEntry = { ...BASE_ENTRY, security: { ...BASE_ENTRY.security, sandbox_level: 'none' } }
    expect(computeHealthTier(entry)).toBe('unverified')
  })

  it('returns safe for hook that passed security gate with calls_external_api: false', () => {
    // sandbox_level: static-analysis, calls_external_api: false → SAFE
    expect(computeHealthTier(BASE_ENTRY)).toBe('safe')
  })

  it('returns passing when calls_external_api is true and no no-network attestation', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      security: { ...BASE_ENTRY.security, calls_external_api: true },
      attestations: [],
    }
    expect(computeHealthTier(entry)).toBe('passing')
  })

  it('returns safe when calls_external_api true but no-network attested', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      security: { ...BASE_ENTRY.security, calls_external_api: true },
      attestations: ['no-network'],
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns trusted when safe + ≥1 attestation + rating_count ≥ 5 + rating_avg ≥ 4.0', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 5,
      rating_avg: 4.0,
    }
    expect(computeHealthTier(entry)).toBe('trusted')
  })

  it('returns trusted with attestations other than no-network when calls_external_api is false', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['read-only'],
      rating_count: 5,
      rating_avg: 4.5,
    }
    expect(computeHealthTier(entry)).toBe('trusted')
  })

  it('returns safe when rating_count below MIN_RATINGS_FOR_SCORE', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 4,
      rating_avg: 5.0,
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns safe when rating_avg below MIN_AVG_FOR_TRUSTED', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: ['no-network'],
      rating_count: 10,
      rating_avg: 3.9,
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })

  it('returns safe when no attestations even with high ratings', () => {
    const entry: HookIndexEntry = {
      ...BASE_ENTRY,
      attestations: [],
      rating_count: 10,
      rating_avg: 5.0,
    }
    expect(computeHealthTier(entry)).toBe('safe')
  })
})

describe('formatHealthTier', () => {
  it('formats trusted', () => { expect(formatHealthTier('trusted')).toBe('✓ trusted') })
  it('formats safe', () => { expect(formatHealthTier('safe')).toBe('✓ safe') })
  it('formats passing', () => { expect(formatHealthTier('passing')).toBe('· passing') })
  it('formats unverified', () => { expect(formatHealthTier('unverified')).toBe('⚠ unverified') })
})
