#!/usr/bin/env node
/**
 * Write `~/Desktop/DeepSeek Harness.app` for this checkout and start Electron.
 * @module @deepseek-ai/dsh-desktop/bin
 */

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installMacosDesktop } from './install-macos.ts'
import { defaultDesktopDir, resolveRepoRoot } from './paths.ts'
import { assertMacosDesktopHost, resolveDesktopPnpmPath } from './runtime.ts'

const skipLaunch = process.argv.includes('--no-launch')

try {
  assertMacosDesktopHost()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}

const here = fileURLToPath(import.meta.url)
const repoRoot = resolveRepoRoot(here)
const require = createRequire(import.meta.url)
const electronPath = require('electron') as string
const mainPath = join(dirname(here), 'main.js')
const pnpmPath = resolveDesktopPnpmPath()
const appPath = installMacosDesktop({
  repoRoot,
  destinationDir: defaultDesktopDir(),
  nodePath: process.execPath,
  pnpmPath,
  electronPath,
  mainPath,
})
console.log(`dsh desktop: installed ${appPath}`)

if (!skipLaunch) {
  console.log('dsh desktop: opening the workbench window')
  const child = spawn(electronPath, [mainPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DSH_DESKTOP_ROOT: repoRoot,
      DSH_DESKTOP_NODE: process.execPath,
      DSH_DESKTOP_PNPM: pnpmPath,
    },
    stdio: 'ignore',
    detached: true,
  })
  child.unref()
}
