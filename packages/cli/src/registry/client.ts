// Full implementation in registry-client TDD step
// See docs/design/2026-03-10-registry-client.md
import type { HookIndex, HookJsonRegistry } from '@hookpm/schema'
import type { RegistryError } from './types.js'

export type FetchIndexResult =
  | { ok: true; data: HookIndex }
  | { ok: false; error: RegistryError }

export type FetchHookResult =
  | { ok: true; data: HookJsonRegistry }
  | { ok: false; error: RegistryError }

export type DownloadResult =
  | { ok: true; installedPath: string; integrity: string }
  | { ok: false; error: RegistryError }

export async function fetchIndex(): Promise<FetchIndexResult> {
  throw new Error('Not implemented — waiting for schema TDD step')
}

export async function fetchHook(
  _name: string,
  _version?: string,
): Promise<FetchHookResult> {
  throw new Error('Not implemented — waiting for schema TDD step')
}

export async function downloadArchive(
  _name: string,
  _version: string,
): Promise<DownloadResult> {
  throw new Error('Not implemented — waiting for registry-client TDD step')
}
