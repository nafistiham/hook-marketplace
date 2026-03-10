import { fetchHook } from '../registry/client.js'
import { error, hookDetail } from './output.js'

export async function runInfo(name: string): Promise<void> {
  const result = await fetchHook(name)

  if (!result.ok) {
    error(`Hook "${name}": ${result.error.message}`)
    process.exitCode = 1
    return
  }

  hookDetail(result.data)
}
