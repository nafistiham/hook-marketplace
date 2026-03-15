import { fetchIndex } from '../registry/client.js'
import { error, table } from './output.js'
import { computeHealthTier, formatHealthTier, TRUST_THRESHOLDS } from '../trust.js'

export async function runSearch(query?: string): Promise<void> {
  const result = await fetchIndex()

  if (!result.ok) {
    error(`Registry error: ${result.error.message}`)
    process.exitCode = 1
    return
  }

  const hooks = query
    ? result.data.hooks.filter(
        (h) =>
          h.name.includes(query) ||
          h.description.includes(query) ||
          h.tags.some((t) => t.includes(query)),
      )
    : result.data.hooks

  if (hooks.length === 0) {
    process.stdout.write(`No hooks found matching "${query}".\n`)
    return
  }

  const rows = hooks.map((h) => {
    const health = formatHealthTier(computeHealthTier(h))
    const rating =
      h.rating_count >= TRUST_THRESHOLDS.MIN_RATINGS_FOR_SCORE
        ? `★ ${h.rating_avg.toFixed(1)} (${h.rating_count})`
        : `(${h.rating_count})`
    return {
      name: h.name,
      description: h.description,
      event: h.event,
      health,
      rating,
    }
  })

  table(rows, { columns: ['name', 'description', 'event', 'health', 'rating'] })
}
