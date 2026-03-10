import { fetchIndex } from '../registry/client.js'
import { error, table } from './output.js'

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

  const rows = hooks.map((h) => ({
    name: h.name,
    description: h.description,
    event: h.event,
  }))

  table(rows, { columns: ['name', 'description', 'event'] })
}
