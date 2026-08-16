/**
 * Desktop-pack launcher: start the bundled `dsh web` if port 3080 is not
 * listening, then open the system browser. Wrappers invoke this file with the
 * portable Node; it never uses tsx or a source checkout.
 */
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import http from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Default bind printed by the shipped Web composition. */
export const DEFAULT_WEB_URL = 'http://127.0.0.1:3080'

/** How long the launcher waits for the bundled server to accept connections. */
export const LISTEN_TIMEOUT_MS = 60_000

/**
 * Runtime root: wrappers set `DSH_DESKTOP_RUNTIME`; otherwise this file's directory.
 * @param env - process environment.
 * @param scriptDir - directory containing this file.
 * @returns absolute runtime root.
 */
export function resolveRuntimeRoot(env, scriptDir) {
  const fromEnv = env.DSH_DESKTOP_RUNTIME
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
  return scriptDir
}

/**
 * Built CLI entry inside the deployed `@deepseek-ai/dsh` slice.
 * @param runtimeRoot - directory that contains `app/`.
 * @returns path to `lib/bin.js`.
 */
export function resolveDshBin(runtimeRoot) {
  return join(runtimeRoot, 'app', 'lib', 'bin.js')
}

/**
 * @param runtimeRoot - directory that contains `app/`.
 * @returns working directory for `dsh web`.
 */
export function resolveAppRoot(runtimeRoot) {
  return join(runtimeRoot, 'app')
}

/**
 * @param url - absolute http URL.
 * @returns whether a server accepted the request (any HTTP status).
 */
export function isListening(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume()
      resolve(true)
    })
    request.on('error', () => { resolve(false) })
    request.setTimeout(800, () => {
      request.destroy()
      resolve(false)
    })
  })
}

/**
 * @param platform - `process.platform`.
 * @param url - page to open.
 * @returns command and args for the system browser opener.
 */
export function browserOpenCommand(platform, url) {
  if (platform === 'darwin') return { command: 'open', args: [url] }
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', url] }
  return { command: 'xdg-open', args: [url] }
}

/**
 * @param nodePath - portable Node executable.
 * @param binPath - built `dsh` entry.
 * @param appRoot - deployed package root.
 * @param logPath - stdout/stderr file for the detached server.
 * @returns the spawned child (detached, unref'd).
 */
export function startWeb(nodePath, binPath, appRoot, logPath) {
  const log = createWriteStream(logPath, { flags: 'a' })
  const child = spawn(nodePath, [binPath, 'web'], {
    cwd: appRoot,
    detached: true,
    stdio: ['ignore', log, log],
    env: process.env,
  })
  child.unref()
  return child
}

/**
 * @param url - page to poll.
 * @param timeoutMs - give-up deadline.
 * @param probe - listening check; defaults to {@link isListening}.
 * @returns true when the server accepted a connection in time.
 */
export async function waitForListening(url, timeoutMs, probe = isListening) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probe(url)) return true
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return false
}

/**
 * Start the bundled Web server when needed and open the system browser.
 * @param options - resolved paths and platform.
 * @returns exit code.
 */
export async function launchDesktop(options) {
  const { runtimeRoot, nodePath, platform, url = DEFAULT_WEB_URL } = options
  const binPath = resolveDshBin(runtimeRoot)
  const appRoot = resolveAppRoot(runtimeRoot)
  if (!await isListening(url)) {
    const logDir = join(runtimeRoot, 'logs')
    await mkdir(logDir, { recursive: true })
    startWeb(nodePath, binPath, appRoot, join(logDir, 'web.log'))
    const up = await waitForListening(url, LISTEN_TIMEOUT_MS)
    if (!up) {
      console.error(`dsh desktop: ${url} did not become ready. See ${join(logDir, 'web.log')}.`)
      return 1
    }
  }
  const opener = browserOpenCommand(platform, url)
  spawn(opener.command, opener.args, { detached: true, stdio: 'ignore' }).unref()
  return 0
}

const invoked = process.argv[1]
const isMain = invoked !== undefined && import.meta.url === pathToFileURL(resolve(invoked)).href

if (isMain) {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const runtimeRoot = resolveRuntimeRoot(process.env, scriptDir)
  const code = await launchDesktop({
    runtimeRoot,
    nodePath: process.execPath,
    platform: process.platform,
  })
  process.exitCode = code
}
