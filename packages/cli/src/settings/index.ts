// Full implementation in settings-merge TDD step
// See docs/design/2026-03-10-settings-merge.md
export type SettingsPaths = {
  settingsPath: string
  lockfilePath: string
}

export type MergeOptions = {
  prepend?: boolean
  installedPath: string
}

export type MergeResult = {
  settingsIndex: number
}

export type Lockfile = {
  version: '1'
  entries: LockEntry[]
}

export type LockEntry = {
  name: string
  version: string
  event: string
  settingsIndex: number
  integrity: string
  installedPath: string
  registry: string
}

export async function mergeHookIntoSettings(
  _hook: unknown,
  _paths: SettingsPaths,
  _options: MergeOptions,
): Promise<MergeResult> {
  throw new Error('Not implemented — waiting for settings-merge TDD step')
}

export async function removeHookFromSettings(
  _hookName: string,
  _paths: SettingsPaths,
  _options?: { dryRun?: boolean },
): Promise<void> {
  throw new Error('Not implemented — waiting for settings-merge TDD step')
}

export async function readSettings(_settingsPath: string): Promise<unknown> {
  throw new Error('Not implemented — waiting for settings-merge TDD step')
}

export async function readLockfile(_lockfilePath: string): Promise<Lockfile> {
  throw new Error('Not implemented — waiting for settings-merge TDD step')
}
