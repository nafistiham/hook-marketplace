import { spawn } from 'node:child_process'
import { config } from '../config.js'
import { info } from './output.js'

function openBrowser(url: string): void {
  const platform = process.platform
  const cmd =
    platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'start'
    : 'xdg-open'

  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref()
}

export async function runPublish(): Promise<void> {
  info('To submit a hook, complete the form in your browser.')
  openBrowser(config.submitUrl)
  info(`Submission form opened: ${config.submitUrl}`)
}
