/**
 * HTML preview open policy for 做网页 / 做 PPT: first HTML path, and only
 * on the running-to-idle edge of the latest Turn.
 */

import { describe, expect, it } from 'vitest'
import { htmlPreviewPath, shouldAutoOpenPreview } from '../src/client/preview-open.ts'

describe('htmlPreviewPath', () => {
  it('returns the first HTML basename and ignores everything else', () => {
    expect(htmlPreviewPath([])).toBeUndefined()
    expect(htmlPreviewPath(['out/app.css', 'notes.md'])).toBeUndefined()
    expect(htmlPreviewPath(['out/app.css', 'site/index.html', 'deck.htm'])).toBe('site/index.html')
    expect(htmlPreviewPath(['talk.xhtml'])).toBe('talk.xhtml')
    expect(htmlPreviewPath(['PAGE.HTML'])).toBe('PAGE.HTML')
    expect(htmlPreviewPath(['a.htm'])).toBe('a.htm')
  })
})

describe('shouldAutoOpenPreview', () => {
  const ready = {
    preset: 'web-page',
    running: false,
    wasRunning: true,
    latestTurn: true,
    alreadyOpened: false,
  }

  it('opens only on the running-to-idle edge of the latest web-page or slides turn', () => {
    expect(shouldAutoOpenPreview(ready)).toBe(true)
    expect(shouldAutoOpenPreview({ ...ready, preset: 'slides' })).toBe(true)
  })

  it('refuses history load, older turns, other modes, and a second open', () => {
    expect(shouldAutoOpenPreview({ ...ready, wasRunning: false })).toBe(false)
    expect(shouldAutoOpenPreview({ ...ready, running: true })).toBe(false)
    expect(shouldAutoOpenPreview({ ...ready, latestTurn: false })).toBe(false)
    expect(shouldAutoOpenPreview({ ...ready, alreadyOpened: true })).toBe(false)
    expect(shouldAutoOpenPreview({ ...ready, preset: 'study' })).toBe(false)
    expect(shouldAutoOpenPreview({ ...ready, preset: undefined })).toBe(false)
  })
})
