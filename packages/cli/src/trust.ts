import type { HookIndexEntry } from '@hookpm/schema'

export type HealthTier = 'trusted' | 'safe' | 'passing' | 'unverified'

export const TRUST_THRESHOLDS = {
  MIN_RATINGS_FOR_SCORE: 5,
  MIN_AVG_FOR_TRUSTED: 4.0,
  MIN_ATTESTATIONS_FOR_TRUSTED: 1,
} as const

export function computeHealthTier(entry: HookIndexEntry): HealthTier {
  const passed = entry.security.sandbox_level !== 'none'
  if (!passed) return 'unverified'

  const safe =
    !entry.security.calls_external_api ||
    entry.attestations.includes('no-network')

  if (!safe) return 'passing'

  const trusted =
    entry.attestations.length >= TRUST_THRESHOLDS.MIN_ATTESTATIONS_FOR_TRUSTED &&
    entry.rating_count >= TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE &&
    entry.rating_avg >= TRUST_THRESHOLDS.MIN_AVG_FOR_TRUSTED

  return trusted ? 'trusted' : 'safe'
}

export function formatHealthTier(tier: HealthTier): string {
  switch (tier) {
    case 'trusted':    return '✓ trusted'
    case 'safe':       return '✓ safe'
    case 'passing':    return '· passing'
    case 'unverified': return '⚠ unverified'
  }
}
