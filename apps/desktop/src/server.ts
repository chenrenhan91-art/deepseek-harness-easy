/**
 * Spawn `pnpm dsh web` as a child of the Electron shell.
 * @module @deepseek-ai/dsh-desktop/server
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname } from 'node:path'

/** argv for the source-run Web server from a git checkout. */
export interface DshWebSpawn {
  /** Absolute executable (`node` when pnpm is a JS entry, otherwise `pnpm`). */
  readonly command: string
  /** `dsh web`, optionally prefixed by the pnpm JS entry. */
  readonly args: readonly string[]
}

/**
 * @param pnpmPath - absolute pnpm or pnpm.mjs.
 * @param nodePath - absolute node; used when pnpm is a JS file.
 * @returns spawn argv.
 */
export function dshWebSpawn(pnpmPath: string, nodePath: string): DshWebSpawn {
  if (pnpmPath.endsWith('.js') || pnpmPath.endsWith('.mjs') || pnpmPath.endsWith('.cjs')) {
    return { command: nodePath, args: [pnpmPath, 'dsh', 'web'] }
  }
  return { command: pnpmPath, args: ['dsh', 'web'] }
}

/** Inputs for spawning `pnpm dsh web` as a child of the Electron shell. */
export interface SpawnDshWebOptions {
  /** Repository checkout (workspace root). */
  readonly repoRoot: string
  /** Absolute pnpm. */
  readonly pnpmPath: string
  /** Absolute node; its directory is prepended to PATH. */
  readonly nodePath: string
  /** Append-only stdout/stderr file. */
  readonly logPath: string
}

/**
 * Start `pnpm dsh web` in the checkout. The caller owns killing the child.
 * @param options - paths baked into the Desktop launcher.
 * @returns the child process.
 */
export function spawnDshWeb(options: SpawnDshWebOptions): ChildProcess {
  const { command, args } = dshWebSpawn(options.pnpmPath, options.nodePath)
  mkdirSync(dirname(options.logPath), { recursive: true })
  const fd = openSync(options.logPath, 'a')
  try {
    const pathPrefix = `${dirname(options.nodePath)}:${dirname(options.pnpmPath)}`
    return spawn(command, [...args], {
      cwd: options.repoRoot,
      env: {
        ...process.env,
        PATH: `${pathPrefix}:${process.env.PATH ?? ''}`,
      },
      stdio: ['ignore', fd, fd],
    })
  } finally {
    closeSync(fd)
  }
}
