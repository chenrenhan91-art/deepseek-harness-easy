/**
 * When a 做网页 / 做 PPT turn finishes, open the HTML deliverable through the
 * Host opener the produced-files chips already use. History load does not
 * open: that path never sees a running-to-idle edge.
 */

import { basename } from './turn-deliverables.ts'

/** Preset ids whose HTML deliverable opens when the latest turn goes idle. */
export const AUTO_OPEN_PRESETS: ReadonlySet<string> = new Set(['web-page', 'slides'])

const HTML_BASENAME = /\.(?:html?|xhtml)$/i

/**
 * First produced path whose basename is an HTML document.
 * @param paths - turn produced paths in first-seen order.
 * @returns that path, or undefined when the turn wrote no HTML file.
 */
export function htmlPreviewPath(paths: readonly string[]): string | undefined {
  return paths.find(path => HTML_BASENAME.test(basename(path)))
}

/** Facts {@link shouldAutoOpenPreview} reads from one ProducedFiles instance. */
export interface AutoOpenPreviewInput {
  /** Session agent preset; absent when the deployment composes no presets. */
  readonly preset: string | undefined
  /** Whether the session is currently running. */
  readonly running: boolean
  /** Whether the previous effect saw `running === true`. */
  readonly wasRunning: boolean
  /** Whether this Turn is the last entry in `timeline.turnOrder`. */
  readonly latestTurn: boolean
  /** Whether this instance has already opened (or attempted to open). */
  readonly alreadyOpened: boolean
}

/**
 * Whether this ProducedFiles instance should open the HTML preview now.
 * A settled history row starts with `wasRunning` false, so it does not open.
 * @param input - running-edge, recency, and open-latch facts.
 * @returns true only on the running-to-idle edge of the latest Turn for a
 * web-page or slides session that has not already opened.
 */
export function shouldAutoOpenPreview(input: AutoOpenPreviewInput): boolean {
  return AUTO_OPEN_PRESETS.has(input.preset ?? '')
    && input.wasRunning
    && !input.running
    && input.latestTurn
    && !input.alreadyOpened
}
