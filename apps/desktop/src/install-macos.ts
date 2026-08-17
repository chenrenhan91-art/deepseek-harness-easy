/**
 * Write an unsigned Finder `.app` that points at this checkout.
 * @module @deepseek-ai/dsh-desktop/install-macos
 */

import { chmodSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME, desktopAppPath } from './paths.ts'

/** Files written into a local (not downloaded) Finder `.app`. */
export interface MacosDesktopInstall {
  /** Workspace root. */
  readonly repoRoot: string
  /** Directory that will contain `DeepSeek Harness.app`. */
  readonly destinationDir: string
  /** Absolute `node`. */
  readonly nodePath: string
  /** Absolute `pnpm`. */
  readonly pnpmPath: string
  /** Absolute Electron binary from `require('electron')`. */
  readonly electronPath: string
  /** Absolute Electron main script (`lib/main.js`). */
  readonly mainPath: string
}

/**
 * Shell executed by Finder. Paths are absolute so a Dock/Desktop launch
 * does not depend on the login-shell PATH.
 * @param install - recorded checkout and tool paths.
 * @returns launcher script body.
 */
export function renderMacosLauncher(install: MacosDesktopInstall): string {
  return `#!/bin/sh
set -eu
export DSH_DESKTOP_ROOT=${shellSingleQuote(install.repoRoot)}
export DSH_DESKTOP_NODE=${shellSingleQuote(install.nodePath)}
export DSH_DESKTOP_PNPM=${shellSingleQuote(install.pnpmPath)}
exec ${shellSingleQuote(install.electronPath)} ${shellSingleQuote(install.mainPath)}
`
}

/**
 * @param value - path interpolated into the launcher.
 * @returns POSIX single-quoted literal.
 */
export function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * Prefer the plist beside the compiled `lib/` output, then the source tree.
 * @param here - directory of this module (`lib/` or `src/`).
 * @param repoRoot - workspace root.
 * @returns absolute Info.plist path.
 * @throws when neither copy exists.
 */
export function resolveInfoPlist(here: string, repoRoot: string): string {
  const beside = join(here, '../resources/macos/Info.plist')
  if (existsSync(beside)) return beside
  const fallback = join(repoRoot, 'apps/desktop/resources/macos/Info.plist')
  if (existsSync(fallback)) return fallback
  throw new Error(`dsh desktop: missing Info.plist (tried ${beside} and ${fallback})`)
}

/**
 * Write an unsigned `.app` on this Mac. Files created here are not internet
 * quarantined the way a GitHub Release zip is.
 * @param install - checkout and tool paths.
 * @returns absolute `.app` path.
 */
export function installMacosDesktop(install: MacosDesktopInstall): string {
  const app = desktopAppPath(install.destinationDir)
  const contents = join(app, 'Contents')
  const macos = join(contents, 'MacOS')
  const resources = join(contents, 'Resources')
  mkdirSync(macos, { recursive: true })
  mkdirSync(resources, { recursive: true })
  const here = dirname(fileURLToPath(import.meta.url))
  cpSync(resolveInfoPlist(here, install.repoRoot), join(contents, 'Info.plist'))
  const icns = join(install.repoRoot, 'packaging/desktop/macos/AppIcon.icns')
  if (existsSync(icns)) cpSync(icns, join(resources, 'AppIcon.icns'))
  const executable = join(macos, APP_NAME)
  writeFileSync(executable, renderMacosLauncher(install))
  chmodSync(executable, 0o755)
  return app
}
