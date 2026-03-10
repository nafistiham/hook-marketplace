#!/usr/bin/env tsx
// Regenerates registry/index.json from all hooks in registry/hooks/
// Run: pnpm run build-index
// CI runs this on every PR that touches registry/hooks/
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryDir = path.resolve(__dirname, '..')
const hooksDir = path.join(registryDir, 'hooks')
const indexPath = path.join(registryDir, 'index.json')

const hookDirs = fs
  .readdirSync(hooksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const hooks = []

for (const hookName of hookDirs) {
  const manifestPath = path.join(hooksDir, hookName, 'hook.json')
  if (!fs.existsSync(manifestPath)) {
    console.error(`⚠ Missing hook.json in hooks/${hookName} — skipping`)
    continue
  }
  const raw = fs.readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw)
  hooks.push(manifest)
}

const index = {
  schema_version: '1',
  generated_at: new Date().toISOString(),
  hooks,
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
console.log(`✓ Built index.json — ${hooks.length} hook(s)`)
