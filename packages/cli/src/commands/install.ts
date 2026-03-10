// Full implementation in cli-commands TDD step
export interface InstallOptions {
  version?: string
  prepend?: boolean
}

export async function runInstall(_name: string, _options: InstallOptions): Promise<void> {
  throw new Error('Not implemented')
}
