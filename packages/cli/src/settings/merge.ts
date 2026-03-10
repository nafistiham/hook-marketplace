import * as path from 'node:path'
import type { HookJsonRegistry } from '@hookpm/schema'
import { readSettings, writeSettingsAtomic, readLockfile, writeLockfile } from './index.js'
import type { SettingsPaths } from './index.js'
import type { ClaudeSettings, HookConfig, HookEntry, Lockfile } from './types.js'
import { NotInstalledError, MergeError } from './types.js'

export type MergeOptions = {
  prepend?: boolean
  dryRun?: boolean
  installedPath: string
}

export type MergeResult = {
  added: boolean
  settingsIndex: number
  event: string
}

// ─── resolveCommandPath ───────────────────────────────────────────────────────

export function resolveCommandPath(command: string, installedPath: string): string {
  // Form 1: $HOOK_DIR placeholder
  if (command.includes('$HOOK_DIR')) {
    const tokens = command.trim().split(/\s+/)
    const resolved = tokens.map((token) => {
      if (!token.includes('$HOOK_DIR')) return token
      const resolvedToken = token.replaceAll('$HOOK_DIR', installedPath)
      return resolvedToken.includes(' ') ? `"${resolvedToken}"` : resolvedToken
    })
    return resolved.join(' ')
  }

  // Form 2: simple single-token or two-token format
  const trimmed = command.trim()
  const spaceIndex = trimmed.indexOf(' ')

  if (spaceIndex === -1) {
    // Single token — the entire command is the script
    const resolved = path.join(installedPath, trimmed)
    return resolved.includes(' ') ? `"${resolved}"` : resolved
  }

  const interpreter = trimmed.slice(0, spaceIndex)
  const relativeScript = trimmed.slice(spaceIndex + 1)
  const resolvedScript = path.join(installedPath, relativeScript)
  const quotedScript = resolvedScript.includes(' ')
    ? `"${resolvedScript}"`
    : resolvedScript

  return `${interpreter} ${quotedScript}`
}

// ─── buildHandlerConfig ───────────────────────────────────────────────────────

export function buildHandlerConfig(
  handler: HookJsonRegistry['handler'],
  installedPath: string,
): HookConfig {
  const base: HookConfig = { type: handler.type }

  if (handler.timeout !== undefined) base.timeout = handler.timeout

  switch (handler.type) {
    case 'command':
      base.command = resolveCommandPath(handler.command, installedPath)
      if (handler.async !== undefined && handler.async !== false) base.async = handler.async
      break
    case 'http':
      base.url = handler.url
      if (handler.headers) base.headers = handler.headers
      if (handler.allowedEnvVars) base.allowedEnvVars = handler.allowedEnvVars
      break
    case 'prompt':
    case 'agent':
      base.prompt = handler.prompt
      if (handler.model) base.model = handler.model
      break
  }

  return base
}

// ─── mergeHookIntoSettings ────────────────────────────────────────────────────

export async function mergeHookIntoSettings(
  hook: HookJsonRegistry,
  paths: SettingsPaths,
  options: MergeOptions,
): Promise<MergeResult> {
  const settings = readSettings(paths.settingsPath)
  const lockfile = readLockfile(paths.lockfilePath)

  // Ensure hooks structure exists
  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks[hook.event]) settings.hooks[hook.event] = []

  const eventArray = settings.hooks[hook.event] as HookEntry[]

  const handlerConfig = buildHandlerConfig(hook.handler, options.installedPath)
  const matcher = hook.matcher
    ? {
        ...(hook.matcher.tool_name !== undefined ? { tool_name: hook.matcher.tool_name } : {}),
        ...(hook.matcher.source !== undefined ? { source: hook.matcher.source } : {}),
        ...(hook.matcher.agent_type !== undefined ? { agent_type: hook.matcher.agent_type } : {}),
        ...(hook.matcher.notification_type !== undefined
          ? { notification_type: hook.matcher.notification_type }
          : {}),
      }
    : undefined

  const newEntry: HookEntry = {
    ...(matcher ? { matcher } : {}),
    hooks: [handlerConfig],
  }

  const existingLockEntry = lockfile.hooks[hook.name]
  let settingsIndex: number
  let added: boolean

  if (existingLockEntry !== undefined) {
    // Upgrade — replace existing entry at same index
    eventArray[existingLockEntry.settings_index] = newEntry
    settingsIndex = existingLockEntry.settings_index
    added = false
  } else if (options.prepend) {
    // Prepend — insert at front, increment indices for all other hookpm entries in same event
    eventArray.unshift(newEntry)
    settingsIndex = 0
    added = true

    // Increment settings_index for all other hookpm entries in this event
    for (const [name, entry] of Object.entries(lockfile.hooks)) {
      if (entry.event === hook.event) {
        lockfile.hooks[name] = { ...entry, settings_index: entry.settings_index + 1 }
      }
    }
  } else {
    // Append
    eventArray.push(newEntry)
    settingsIndex = eventArray.length - 1
    added = true
  }

  // Post-merge validation
  try {
    JSON.parse(JSON.stringify(settings))
  } catch (cause) {
    throw new MergeError('Post-merge settings are not serializable — aborting', cause)
  }

  if (!options.dryRun) {
    writeSettingsAtomic(paths.settingsPath, settings)

    // Update lockfile
    const now = new Date().toISOString()
    lockfile.hooks[hook.name] = {
      version: hook.version,
      resolved: '',
      integrity: '',
      event: hook.event,
      settings_index: settingsIndex,
      installed: now,
      range: `^${hook.version}`,
    }
    lockfile.generated = now
    writeLockfile(paths.lockfilePath, lockfile)
  }

  return { added, settingsIndex, event: hook.event }
}

// ─── removeHookFromSettings ───────────────────────────────────────────────────

export async function removeHookFromSettings(
  hookName: string,
  paths: SettingsPaths,
  options?: { dryRun?: boolean },
): Promise<void> {
  const lockfile = readLockfile(paths.lockfilePath)
  const lockEntry = lockfile.hooks[hookName]

  if (!lockEntry) {
    throw new NotInstalledError(`Hook '${hookName}' is not installed (not found in lockfile)`)
  }

  const settings = readSettings(paths.settingsPath)
  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks[lockEntry.event]) settings.hooks[lockEntry.event] = []

  const eventArray = settings.hooks[lockEntry.event] as HookEntry[]
  let removedIndex: number

  // Check if lockfile index is still in bounds
  if (lockEntry.settings_index < eventArray.length) {
    removedIndex = lockEntry.settings_index
  } else {
    // Index drift — scan best-effort for the entry
    process.stderr.write(
      `hookpm: settings.json was modified externally — scanning for '${hookName}' entry\n`,
    )
    const hookCommand =
      lockEntry.event && eventArray.length > 0
        ? eventArray.findIndex(
            (entry) =>
              entry.hooks.some(
                (h) =>
                  h.command?.includes(hookName) || h.command?.includes(lockEntry.version),
              ),
          )
        : -1

    if (hookCommand === -1) {
      throw new MergeError(
        `Entry for '${hookName}' not found in settings.json — manually remove it from ${paths.settingsPath}`,
      )
    }
    removedIndex = hookCommand
  }

  // Splice the entry
  eventArray.splice(removedIndex, 1)

  // Decrement indices for other lockfile entries in same event with index > removed
  const updatedLockfile: Lockfile = {
    ...lockfile,
    hooks: Object.fromEntries(
      Object.entries(lockfile.hooks)
        .filter(([name]) => name !== hookName)
        .map(([name, entry]) => {
          if (entry.event === lockEntry.event && entry.settings_index > removedIndex) {
            return [name, { ...entry, settings_index: entry.settings_index - 1 }]
          }
          return [name, entry]
        }),
    ),
  }

  if (!options?.dryRun) {
    writeSettingsAtomic(paths.settingsPath, settings)
    updatedLockfile.generated = new Date().toISOString()
    writeLockfile(paths.lockfilePath, updatedLockfile)
  }
}
