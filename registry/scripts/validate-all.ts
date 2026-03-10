#!/usr/bin/env tsx
// Validates all hook.json files in registry/hooks/ against HookJsonSchema.
// Run: pnpm run validate-all
// CI runs this on every PR that touches registry/hooks/
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HookJsonSchema } from '../../packages/schema/src/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryDir = path.resolve(__dirname, '..')
const hooksDir = path.join(registryDir, 'hooks')

const hookDirs = fs
  .readdirSync(hooksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

if (hookDirs.length === 0) {
  process.stdout.write('No hooks found in registry/hooks/\n')
  process.exit(0)
}

let passed = 0
let failed = 0

for (const hookName of hookDirs) {
  const manifestPath = path.join(hooksDir, hookName, 'hook.json')

  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`✗ ${hookName}: missing hook.json\n`)
    failed++
    continue
  }

  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    process.stderr.write(`✗ ${hookName}: hook.json is not valid JSON\n`)
    failed++
    continue
  }

  const result = HookJsonSchema.safeParse(json)
  if (!result.success) {
    const summary = result.error.errors
      .slice(0, 5)
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    process.stderr.write(`✗ ${hookName}: schema validation failed\n${summary}\n`)
    failed++
    continue
  }

  // Warn if directory name doesn't match hook name field
  if (result.data.name !== hookName) {
    process.stderr.write(
      `⚠ ${hookName}: directory name does not match hook.json name field ("${result.data.name}")\n`,
    )
  }

  process.stdout.write(`✓ ${hookName}@${result.data.version}\n`)
  passed++
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
