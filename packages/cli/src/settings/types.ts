export type HookConfig = {
  type: 'command' | 'http' | 'prompt' | 'agent'
  command?: string
  async?: boolean
  timeout?: number
  url?: string
  headers?: Record<string, string>
  allowedEnvVars?: string[]
  prompt?: string
  model?: string
}

export type HookEntry = {
  matcher?: {
    tool_name?: string
    source?: string
    agent_type?: string
    notification_type?: string
  }
  hooks: HookConfig[]
}

export type ClaudeSettings = {
  hooks?: { [event: string]: HookEntry[] }
  [key: string]: unknown
}

export type LockEntry = {
  version: string
  resolved: string
  integrity: string
  event: string
  settings_index: number
  installed: string
  range: string
}

export type Lockfile = {
  version: '1'
  generated: string
  registry: string
  hooks: { [hookName: string]: LockEntry }
}

export class ParseError extends Error {
  readonly type = 'ParseError' as const
  constructor(message: string, override readonly cause?: unknown) {
    super(message)
    this.name = 'ParseError'
  }
}

export class WriteError extends Error {
  readonly type = 'WriteError' as const
  constructor(message: string, override readonly cause?: unknown) {
    super(message)
    this.name = 'WriteError'
  }
}

export class MergeError extends Error {
  readonly type = 'MergeError' as const
  constructor(message: string, override readonly cause?: unknown) {
    super(message)
    this.name = 'MergeError'
  }
}

export class NotInstalledError extends Error {
  readonly type = 'NotInstalledError' as const
  constructor(message: string) {
    super(message)
    this.name = 'NotInstalledError'
  }
}

export class RemovalError extends Error {
  readonly type = 'RemovalError' as const
  constructor(message: string) {
    super(message)
    this.name = 'RemovalError'
  }
}
