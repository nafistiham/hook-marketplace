import { fetchHook, downloadArchive } from '../registry/client.js'
import { mergeHookIntoSettings, removeHookFromSettings } from '../settings/merge.js'
import { readLockfile } from '../settings/index.js'
import { checkCapabilities } from '../security/index.js'
import { config } from '../config.js'
import { success, error, info, startSpinner } from './output.js'

export interface UpdateOptions {
  all?: boolean
}

export async function runUpdate(name: string | undefined, options: UpdateOptions): Promise<void> {
  const paths = { settingsPath: config.settingsPath, lockfilePath: config.lockfilePath }
  const lockfile = readLockfile(config.lockfilePath)

  // Determine which hooks to update
  const targets: string[] = []

  if (name) {
    if (!lockfile.hooks[name]) {
      error(`Hook '${name}' is not installed.`)
      process.exitCode = 1
      return
    }
    targets.push(name)
  } else if (options.all) {
    const installed = Object.keys(lockfile.hooks)
    if (installed.length === 0) {
      error('No hooks installed.')
      process.exitCode = 1
      return
    }
    targets.push(...installed)
  } else {
    error('Specify a hook name or use --all to update everything.')
    process.exitCode = 1
    return
  }

  let updated = 0
  let skipped = 0

  for (const hookName of targets) {
    const lockEntry = lockfile.hooks[hookName]
    if (!lockEntry) continue

    startSpinner(`Checking ${hookName}…`)

    // Fetch latest manifest from registry
    const hookResult = await fetchHook(hookName)
    if (!hookResult.ok) {
      error(`Could not fetch ${hookName}: ${hookResult.error.message}`)
      process.exitCode = 1
      continue
    }

    const latest = hookResult.data

    if (latest.version === lockEntry.version) {
      info(`${hookName} is already at latest (${lockEntry.version})`)
      skipped++
      continue
    }

    // Check capabilities before downloading
    const capCheck = checkCapabilities(latest.capabilities)
    if (capCheck.dangerous) {
      process.stderr.write(`⚠ Hook "${hookName}" has dangerous capabilities — skipping update.\n`)
      process.exitCode = 1
      continue
    }

    // Download new version
    startSpinner(`Downloading ${hookName}@${latest.version}…`)
    const dlResult = await downloadArchive(hookName, latest.version)
    if (!dlResult.ok) {
      error(`Download failed for ${hookName}: ${dlResult.error.message}`)
      process.exitCode = 1
      continue
    }

    // Remove old entry then re-add new version
    startSpinner(`Installing ${hookName}@${latest.version}…`)
    await removeHookFromSettings(hookName, paths)
    await mergeHookIntoSettings(latest, paths, {
      installedPath: dlResult.installedPath,
      integrity: dlResult.integrity,
      prepend: lockEntry.settings_index === 0,
    })

    success(`Updated ${hookName} to ${latest.version}`)
    updated++
  }

  if (targets.length > 1) {
    process.stdout.write(`${updated} updated, ${skipped} already up to date.\n`)
  }
}
