import * as fs from 'node:fs'
import * as path from 'node:path'
import { config } from '../config.js'
import { success, info } from './output.js'

export interface LogoutOptions {
  authPath?: string
}

export async function runLogout(opts: LogoutOptions = {}): Promise<void> {
  const authPath = opts.authPath ?? path.join(config.hookpmDir, 'auth.json')

  if (!fs.existsSync(authPath)) {
    info('Not logged in.')
    return
  }

  fs.rmSync(authPath)
  success('Logged out.')
}
