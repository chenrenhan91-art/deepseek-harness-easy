/**
 * Finder app name and workspace-root discovery for the macOS Desktop shell.
 * @module @deepseek-ai/dsh-desktop/paths
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Finder / Desktop display name (also the `.app` folder name). */
export const APP_NAME = 'DeepSeek Harness'

const ROOT_MANIFEST_NAME = '@deepseek-ai/dsh-root'

/**
 * Walk from a file toward filesystem root until the workspace root manifest.
 * @param startFile - any file inside the checkout.
 * @returns absolute repository root.
 * @throws when no `@deepseek-ai/dsh-root` manifest is found.
 */
export function resolveRepoRoot(startFile: string): string {
  let directory = dirname(startFile)
  for (let i = 0; i < 20; i += 1) {
    const manifestPath = join(directory, 'package.json')
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: unknown }
      if (manifest.name === ROOT_MANIFEST_NAME) return directory
    }
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  throw new Error(`dsh desktop: could not find ${ROOT_MANIFEST_NAME} above ${startFile}`)
}

/**
 * @param desktopDir - directory that should hold the `.app` (usually `~/Desktop`).
 * @returns absolute `.app` path.
 */
export function desktopAppPath(desktopDir: string): string {
  return join(desktopDir, `${APP_NAME}.app`)
}

/**
 * @returns `~/Desktop` (Finder still uses this path when the sidebar says 桌面).
 */
export function defaultDesktopDir(): string {
  return join(homedir(), 'Desktop')
}
