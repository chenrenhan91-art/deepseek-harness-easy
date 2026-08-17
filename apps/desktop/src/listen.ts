/**
 * Poll until the workbench HTTP server can boot the client graph.
 * @module @deepseek-ai/dsh-desktop/listen
 */

import http from 'node:http'

/** Default bind used by the shipped Web composition. */
export const DEFAULT_WEB_URL = 'http://127.0.0.1:3080'

/** How long the shell waits for `dsh web` to accept a bootable workbench. */
export const LISTEN_TIMEOUT_MS = 120_000

/**
 * Client graph rows that provide the services a partial boot otherwise leaves
 * pending (`typert`, `connection`, `remote`, `slots`). The host injects
 * `__DSH_BOOT__` incrementally; these ids appear only after those providers
 * have mounted.
 */
export const WORKBENCH_BOOT_ROOTS = [
  '@deepseek-ai/dsh-typert-registry',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-runtime',
] as const

const BOOT_MARKER = 'window.__DSH_BOOT__ ='

/**
 * @param html - index HTML that may contain `window.__DSH_BOOT__`.
 * @returns whether the injected graph includes every {@link WORKBENCH_BOOT_ROOTS} id.
 */
export function bootGraphIsReady(html: string): boolean {
  const marker = html.indexOf(BOOT_MARKER)
  if (marker < 0) return false
  const jsonStart = html.indexOf('{', marker)
  if (jsonStart < 0) return false
  const jsonEnd = html.indexOf('</script>', jsonStart)
  if (jsonEnd < 0) return false
  let parsed: unknown
  try {
    parsed = JSON.parse(html.slice(jsonStart, jsonEnd).trim().replace(/;$/, ''))
  } catch {
    return false
  }
  if (typeof parsed !== 'object' || parsed === null) return false
  const entries = 'entries' in parsed ? parsed.entries : undefined
  if (!Array.isArray(entries)) return false
  const ids = new Set<unknown>()
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null || !('id' in entry)) continue
    ids.add((entry as { id: unknown }).id)
  }
  return WORKBENCH_BOOT_ROOTS.every(id => ids.has(id))
}

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
 * @param url - workbench origin, usually {@link DEFAULT_WEB_URL}.
 * @returns whether `GET` returned 200 HTML whose boot graph includes the provider roots.
 */
export function isWorkbenchReady(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume()
        resolve(false)
        return
      }
      response.setEncoding('utf8')
      let body = ''
      response.on('data', (chunk: string) => {
        body += chunk
      })
      response.on('end', () => {
        resolve(bootGraphIsReady(body))
      })
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
 * @returns true when a probe succeeded in time.
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
