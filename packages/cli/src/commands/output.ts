// Full implementation in cli-commands TDD step
// See docs/design/2026-03-10-cli-commands.md §12
import type { HookJsonRegistry } from '@hookpm/schema'

const isTTY = process.stdout.isTTY ?? false

export function success(msg: string): void {
  process.stdout.write(`✓ ${msg}\n`)
}

export function error(msg: string): void {
  process.stderr.write(`✗ ${msg}\n`)
}

export function warn(msg: string): void {
  process.stderr.write(`⚠ ${msg}\n`)
}

export function info(msg: string): void {
  process.stdout.write(`· ${msg}\n`)
}

export function startSpinner(label: string): void {
  if (isTTY) process.stdout.write(`  ${label}\n`)
}

export function stopSpinner(): void {
  // no-op in current implementation — spinner cleared by next output line
}

export async function spinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  startSpinner(label)
  const result = await fn()
  stopSpinner()
  return result
}

export function table(
  rows: Record<string, unknown>[],
  options: { columns: string[] },
): void {
  if (!isTTY) {
    for (const row of rows) process.stdout.write(JSON.stringify(row) + '\n')
    return
  }
  const widths = options.columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? '').length)),
  )
  const header = options.columns
    .map((col, i) => col.padEnd(widths[i] ?? col.length))
    .join('  ')
  process.stdout.write(header + '\n')
  process.stdout.write('-'.repeat(header.length) + '\n')
  for (const row of rows) {
    const line = options.columns
      .map((col, i) => String(row[col] ?? '').padEnd(widths[i] ?? 0))
      .join('  ')
    process.stdout.write(line + '\n')
  }
}

export function hookDetail(hook: HookJsonRegistry): void {
  const line = (label: string, value: string) =>
    process.stdout.write(`  ${label.padEnd(14)}${value}\n`)

  process.stdout.write(`\n${hook.name}@${hook.version}\n`)
  process.stdout.write(`${'─'.repeat(hook.name.length + hook.version.length + 1)}\n`)
  line('description', hook.description)
  line('author', hook.author)
  line('license', hook.license)
  line('event', hook.event)
  if (hook.matcher) {
    const m = Object.entries(hook.matcher)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    line('matcher', m)
  }
  line('capabilities', hook.capabilities.join(', '))
  if (hook.tags.length) line('tags', hook.tags.join(', '))
  if (hook.requires?.os?.length) line('os', hook.requires.os.join(', '))
  if (hook.provenance?.source) line('source', hook.provenance.source)
  const reviewedLabel = hook.security.reviewed
    ? `✓ reviewed${hook.security.review_date ? ` on ${hook.security.review_date.slice(0, 10)}` : ''}`
    : '⚠ not yet reviewed by hookpm team'
  line('security', hook.security.sandbox_level)
  line('reviewed', reviewedLabel)
  process.stdout.write('\n')
}

export async function confirm(msg: string): Promise<boolean> {
  if (!isTTY) return false
  process.stdout.write(`${msg} [y/N] `)
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase() === 'y')
    })
  })
}
