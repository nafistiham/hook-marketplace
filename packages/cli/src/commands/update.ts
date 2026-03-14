import { fetchHook, downloadArchive } from '../registry/client.js'
import { mergeHookIntoSettings } from '../settings/merge.js'
import { readLockfile } from '../settings/index.js'
import { config } from '../config.js'
import { success, error, info, startSpinner } from './output.js'

export interface UpdateOptions {
  all?: boolean
}

export async function runUpdate(name: string | undefined, options: UpdateOptions): Promise<void> {
  const paths = { settingsPath: config.settingsPath, lockfilePath: config.lockfilePath }
  const lockfile = readLockfile(config.lockfilePath)
  const installed = Object.entries(lockfile.hooks)

  if (installed.length === 0) {
    info('No hooks installed.')
    return
  }

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
    targets.push(...installed.map(([n]) => n))
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
      continue
    }

    const latest = hookResult.data

    if (latest.version === lockEntry.version) {
      info(`${hookName} is already up to date (${lockEntry.version})`)
      skipped++
      continue
    }

    info(`${hookName}: ${lockEntry.version} → ${latest.version}`)

    // Download new version
    startSpinner(`Downloading ${hookName}@${latest.version}…`)
    const dlResult = await downloadArchive(hookName, latest.version)
    if (!dlResult.ok) {
      error(`Download failed for ${hookName}: ${dlResult.error.message}`)
      continue
    }

    // Merge (upgrade path — replaces at same settings_index)
    startSpinner(`Installing ${hookName}@${latest.version}…`)
    await mergeHookIntoSettings(latest, paths, {
      installedPath: dlResult.installedPath,
      integrity: dlResult.integrity,
    })

    success(`Updated ${hookName} to ${latest.version}`)
    updated++
  }

  if (targets.length > 1) {
    info(`\n${updated} updated, ${skipped} already up to date.`)
  }
}
