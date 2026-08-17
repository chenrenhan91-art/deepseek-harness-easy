/**
 * Resolve Node and pnpm for the Electron shell. Finder `.app` launches bake
 * absolute paths because login-shell PATH is not available.
 * @module @deepseek-ai/dsh-desktop/runtime
 */

import { execFileSync } from 'node:child_process'

/**
 * @param platform - `process.platform`.
 * @throws when the Desktop installer is run off macOS.
 */
export function assertMacosDesktopHost(platform: string = process.platform): void {
  if (platform !== 'darwin') {
    throw new Error('dsh desktop: this installer only supports macOS.')
  }
}

/**
 * @param name - executable basename.
 * @returns absolute path from `/usr/bin/which`.
 * @throws when the executable is missing.
 */
export function which(name: string): string {
  try {
    const found = execFileSync('/usr/bin/which', [name], { encoding: 'utf8' }).trim()
    if (found.length === 0) throw new Error(`dsh desktop: ${name} is not on PATH`)
    return found
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('dsh desktop:')) throw error
    throw new Error(`dsh desktop: ${name} is not on PATH`)
  }
}

/**
 * @param versions - `process.versions`; Electron adds an `electron` key.
 * @returns whether this process is Electron.
 */
export function isElectronProcess(versions: NodeJS.ProcessVersions = process.versions): boolean {
  return typeof (versions as Record<string, string | undefined>)['electron'] === 'string'
}

/**
 * Inside Electron, `process.execPath` is the Electron binary, not Node.
 * @param env - process environment; `DSH_DESKTOP_NODE` wins when set.
 * @param execPath - `process.execPath`.
 * @param insideElectron - whether this process is Electron.
 * @returns absolute Node executable.
 */
export function resolveDesktopNodePath(
  env: NodeJS.ProcessEnv = process.env,
  execPath: string = process.execPath,
  insideElectron: boolean = isElectronProcess(),
): string {
  const baked = env.DSH_DESKTOP_NODE
  if (baked !== undefined && baked.length > 0) return baked
  if (!insideElectron) return execPath
  return which('node')
}

/**
 * @param env - process environment; `DSH_DESKTOP_PNPM` then `npm_execpath`.
 * @returns absolute pnpm or pnpm JS entry.
 */
export function resolveDesktopPnpmPath(env: NodeJS.ProcessEnv = process.env): string {
  const baked = env.DSH_DESKTOP_PNPM
  if (baked !== undefined && baked.length > 0) return baked
  const npmExec = env.npm_execpath
  if (npmExec !== undefined && npmExec.length > 0) return npmExec
  return which('pnpm')
}
