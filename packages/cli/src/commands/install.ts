import { fetchHook, downloadArchive } from '../registry/client.js'
import { mergeHookIntoSettings } from '../settings/merge.js'
import { checkCapabilities } from '../security/index.js'
import { config } from '../config.js'
import { success, error, confirm, startSpinner } from './output.js'

export interface InstallOptions {
  version?: string
  prepend?: boolean
}

export async function runInstall(name: string, options: InstallOptions): Promise<void> {
  // Step 1: Fetch hook manifest
  startSpinner(`Fetching ${name}…`)
  const hookResult = await fetchHook(name, options.version)
  if (!hookResult.ok) {
    error(`Could not fetch hook "${name}": ${hookResult.error.message}`)
    process.exitCode = 1
    return
  }

  const hook = hookResult.data

  // Step 2: Check for dangerous capabilities
  const capCheck = checkCapabilities(hook.capabilities)
  if (capCheck.dangerous) {
    const caps = capCheck.capabilities?.join(', ') ?? 'unknown'
    const proceed = await confirm(
      `Hook "${name}" requests dangerous capabilities: ${caps}. Install anyway?`,
    )
    if (!proceed) {
      error(`Aborted — dangerous capabilities declined.`)
      process.exitCode = 2
      return
    }
  }

  // Step 3: Download archive
  startSpinner(`Downloading ${name}@${hook.version}…`)
  const dlResult = await downloadArchive(name, hook.version)
  if (!dlResult.ok) {
    error(`Download failed: ${dlResult.error.message}`)
    process.exitCode = 1
    return
  }

  // Step 4: Merge into settings.json
  startSpinner(`Installing ${name}…`)
  const paths = { settingsPath: config.settingsPath, lockfilePath: config.lockfilePath }
  await mergeHookIntoSettings(hook, paths, {
    installedPath: dlResult.installedPath,
    prepend: options.prepend ?? false,
    integrity: dlResult.integrity,
  })

  success(`Installed ${name}@${hook.version}`)
}
