/**
 * Poll until the workbench HTTP server accepts connections.
 * @module @deepseek-ai/dsh-desktop/listen
 */

import http from 'node:http'

/** Default bind used by the shipped Web composition. */
export const DEFAULT_WEB_URL = 'http://127.0.0.1:3080'

/** How long the shell waits for `dsh web` to accept connections. */
export const LISTEN_TIMEOUT_MS = 120_000

/**
 * @param url - absolute http URL.
 * @returns whether a server accepted the request (any HTTP status).
 */
export function isListening(url: string): Promise<boolean> {
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
 * Probe at least once, then until the deadline.
 * @param url - page to poll.
 * @param timeoutMs - give-up deadline after the first probe.
 * @param probe - listening check; defaults to {@link isListening}.
 * @returns true when the server accepted a connection in time.
 */
export async function waitForListening(
  url: string,
  timeoutMs: number,
  probe: (target: string) => Promise<boolean> = isListening,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    if (await probe(url)) return true
    if (Date.now() >= deadline) return false
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}
