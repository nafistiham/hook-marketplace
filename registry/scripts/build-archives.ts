#!/usr/bin/env tsx
// Creates/updates tar.gz archives for each hook in registry/hooks/.
// Run: pnpm run build-archives
// CI runs this on every PR that touches registry/hooks/ — archives are committed to the repo.
//
// Archive naming: hooks/<name>/<name>-<version>.tar.gz
// Archive structure (strip: 1 compatible): <name>-<version>/<files...>
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { HookJsonSchema } from '../../packages/schema/src/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryDir = path.resolve(__dirname, '..')
const hooksDir = path.join(registryDir, 'hooks')

const hookDirs = fs
  .readdirSync(hooksDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

let built = 0
let skipped = 0
let errored = 0

for (const hookName of hookDirs) {
  const hookDir = path.join(hooksDir, hookName)
  const manifestPath = path.join(hookDir, 'hook.json')

  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`⚠ hooks/${hookName}: missing hook.json — skipping\n`)
    errored++
    continue
  }

  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    process.stderr.write(`✗ hooks/${hookName}/hook.json is not valid JSON\n`)
    errored++
    continue
  }

  const result = HookJsonSchema.safeParse(json)
  if (!result.success) {
    process.stderr.write(`✗ hooks/${hookName}/hook.json failed schema validation — skipping\n`)
    errored++
    continue
  }

  const { name, version } = result.data
  const archiveName = `${name}-${version}.tar.gz`
  const archivePath = path.join(hookDir, archiveName)

  // Skip if archive already up to date (all source files older than archive)
  if (fs.existsSync(archivePath)) {
    const archiveMtime = fs.statSync(archivePath).mtimeMs
    const sourceFiles = fs
      .readdirSync(hookDir)
      .filter((f) => f !== archiveName)
      .map((f) => fs.statSync(path.join(hookDir, f)).mtimeMs)
    const anyNewer = sourceFiles.some((mtime) => mtime > archiveMtime)
    if (!anyNewer) {
      process.stdout.write(`· hooks/${hookName}/${archiveName} — up to date\n`)
      skipped++
      continue
    }
  }

  // Collect files to include (exclude other .tar.gz archives and hidden files)
  const files = fs
    .readdirSync(hookDir)
    .filter((f) => !f.endsWith('.tar.gz') && !f.startsWith('.'))

  // Create archive via temp dir so the tarball contains <name>-<version>/<files>
  // (BSD tar on macOS doesn't support --transform)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookpm-archive-'))
  const stagingDir = path.join(tmpDir, `${name}-${version}`)
  fs.mkdirSync(stagingDir)

  try {
    for (const file of files) {
      fs.copyFileSync(path.join(hookDir, file), path.join(stagingDir, file))
    }
    execFileSync('tar', ['-czf', archivePath, '-C', tmpDir, `${name}-${version}`])
    process.stdout.write(`✓ hooks/${hookName}/${archiveName}\n`)
    built++
  } catch (cause) {
    process.stderr.write(`✗ hooks/${hookName}/${archiveName}: ${String(cause)}\n`)
    errored++
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

process.stdout.write(`\n${built} built, ${skipped} skipped, ${errored} error(s)\n`)

if (errored > 0) {
  process.exit(1)
}
