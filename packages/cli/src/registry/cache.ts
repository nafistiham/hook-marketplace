// Full implementation in registry-client TDD step
// See docs/design/2026-03-10-registry-client.md
import type { HookIndex } from '@hookpm/schema'

export type CacheKey = 'index'

export type CacheValueMap = {
  index: HookIndex
}

type CacheEntry<K extends CacheKey> = {
  data: CacheValueMap[K]
  fetchedAt: number
  ttlMs: number
}

const store = new Map<CacheKey, CacheEntry<CacheKey>>()

export function getCached<K extends CacheKey>(key: K): CacheValueMap[K] | undefined {
  const entry = store.get(key) as CacheEntry<K> | undefined
  if (!entry) return undefined
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    store.delete(key)
    return undefined
  }
  return entry.data
}

export function setCached<K extends CacheKey>(
  key: K,
  data: CacheValueMap[K],
  ttlMs: number,
): void {
  store.set(key, { data, fetchedAt: Date.now(), ttlMs } as CacheEntry<CacheKey>)
}

export function clearCache(): void {
  store.clear()
}
