#!/usr/bin/env tsx
// Regenerates registry/index.json from all hooks in registry/hooks/
// Run: pnpm run build-index
// CI runs this on every PR that touches registry/hooks/
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HookJsonSchema, SecuritySchema } from '../../packages/schema/src/schema.js'
import type { HookIndexEntry } from '../../packages/schema/src/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryDir = path.resolve(__dirname, '..')
const hooksDir = path.join(registryDir, 'hooks')
const indexPath = path.join(registryDir, 'index.json')

const hookDirs = fs
  .readdirSync(hooksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const hooks: HookIndexEntry[] = []
let errorCount = 0

for (const hookName of hookDirs) {
  const manifestPath = path.join(hooksDir, hookName, 'hook.json')

  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`⚠ Missing hook.json in hooks/${hookName} — skipping\n`)
    errorCount++
    continue
  }

  let raw: string
  try {
    raw = fs.readFileSync(manifestPath, 'utf8')
  } catch (cause) {
    process.stderr.write(`✗ Cannot read hooks/${hookName}/hook.json: ${String(cause)}\n`)
    errorCount++
    continue
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    process.stderr.write(`✗ hooks/${hookName}/hook.json is not valid JSON\n`)
    errorCount++
    continue
  }

  const result = HookJsonSchema.safeParse(json)
  if (!result.success) {
    const summary = result.error.errors
      .slice(0, 5)
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    process.stderr.write(`✗ hooks/${hookName}/hook.json failed schema validation:\n${summary}\n`)
    errorCount++
    continue
  }

  const manifest = result.data

  // Security field: use from manifest if present, else apply safe defaults
  const security = SecuritySchema.parse(manifest.security ?? {})

  const entry: HookIndexEntry = {
    name: manifest.name,
    description: manifest.description,
    author: manifest.author,
    event: manifest.event,
    tags: manifest.tags,
    capabilities: manifest.capabilities,
    security,
    latest: manifest.version,
    versions: [manifest.version],
    ...(manifest.provenance?.source ? { source: manifest.provenance.source } : {}),
    ...(manifest.provenance?.submitted_by
      ? { submitted_by: manifest.provenance.submitted_by }
      : {}),
    updated_at: new Date().toISOString(),
  }

  hooks.push(entry)
}

if (errorCount > 0) {
  process.stderr.write(`\n✗ Build failed — ${errorCount} error(s). Fix the issues above.\n`)
  process.exit(1)
}

const index = {
  schema_version: '1',
  generated_at: new Date().toISOString(),
  hooks,
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
process.stdout.write(`✓ Built index.json — ${hooks.length} hook(s)\n`)
