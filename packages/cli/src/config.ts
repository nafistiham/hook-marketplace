import { z } from 'zod'
import * as os from 'node:os'
import * as path from 'node:path'

const ConfigSchema = z.object({
  // Registry network
  registryUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith('https://'), {
      message: 'HOOKPM_REGISTRY_URL must use https',
    })
    .default(
      'https://raw.githubusercontent.com/nafistiham/hook-marketplace/main/registry',
    ),

  registryTimeout: z.coerce.number().int().positive().default(10_000),

  downloadTimeout: z.coerce.number().int().positive().default(30_000),

  // Local file paths
  hookpmDir: z
    .string()
    .default(path.join(os.homedir(), '.hookpm')),

  settingsPath: z
    .string()
    .default(path.join(os.homedir(), '.claude', 'settings.json')),

  lockfilePath: z
    .string()
    .default(path.join(os.homedir(), '.hookpm', 'hookpm.lock')),

  // Publish URL
  submitUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith('https://'), {
      message: 'HOOKPM_SUBMIT_URL must use https',
    })
    .default('https://hookpm.dev/submit'),
})

export type Config = z.infer<typeof ConfigSchema>

function parseConfig(): Config {
  const result = ConfigSchema.safeParse({
    registryUrl:     process.env['HOOKPM_REGISTRY_URL'],
    registryTimeout: process.env['HOOKPM_REGISTRY_TIMEOUT_MS'],
    downloadTimeout: process.env['HOOKPM_DOWNLOAD_TIMEOUT_MS'],
    hookpmDir:       process.env['HOOKPM_DIR'],
    settingsPath:    process.env['HOOKPM_SETTINGS_PATH'],
    lockfilePath:    process.env['HOOKPM_LOCKFILE_PATH'],
    submitUrl:       process.env['HOOKPM_SUBMIT_URL'],
  })

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    // Use process.stderr directly — output.ts is not available at config parse time
    process.stderr.write(`hookpm: invalid configuration:\n${messages}\n`)
    process.exit(1)
  }

  return result.data
}

// Parsed and validated at module load — process.exit(1) on invalid env
export const config: Config = parseConfig()
