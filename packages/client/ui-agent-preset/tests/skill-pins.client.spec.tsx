// @vitest-environment jsdom
/**
 * Mode skill pins: a catalog load arms `/name` tokens, the tags toggle them,
 * and a later catalog (a mode switch) replaces the previous pins.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { SkillPins } from '../src/client/SkillPins.tsx'
import type { SkillPinsProps } from '../src/client/SkillPins.tsx'
import type { SkillPin } from '../src/client/pin-draft.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const STUDY: readonly SkillPin[] = [
  { name: 'explain-clearly', label: '讲明白' },
  { name: 'check-understanding', label: '真懂了吗' },
  { name: 'work-an-example', label: '带做一道' },
]

const WRITING: readonly SkillPin[] = [
  { name: 'draft-and-revise', label: '起草改稿' },
  { name: 'write-plain', label: '写人话' },
  { name: 'keep-the-facts', label: '事实不动' },
]

function renderPins(options: {
  pins?: readonly SkillPin[] | Promise<readonly SkillPin[]>
  reject?: boolean
  draft?: string
}) {
  const input = createSnapshotStore({ draft: options.draft ?? '' })
  const setDraft = vi.fn((text: string) => {
    input.set({ draft: text })
  })
  let catalog = options.reject
    ? Promise.reject(new Error('catalog down'))
    : Promise.resolve(options.pins ?? STUDY)
  const watchers = new Set<() => void>()
  const props = {
    sessionId: 's1',
    useInput: bindSnapshotSelector(input),
    inputActions: { setDraft, submit: () => {} },
    load: () => catalog,
    watchCatalog: (_sessionId: string, onChange: () => void) => {
      watchers.add(onChange)
      return () => { watchers.delete(onChange) }
    },
    t: (key: keyof typeof en, params?: Record<string, unknown>) => {
      const raw = en[key]
      return params === undefined
        ? raw
        : raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
    },
  }
  const view = render(<SkillPins {...(props as unknown as SkillPinsProps)} />)
  return {
    setDraft,
    input,
    reload: (next: readonly SkillPin[]) => {
      catalog = Promise.resolve(next)
      for (const watcher of watchers) watcher()
    },
    setSession: (sessionId: string) => {
      view.rerender(<SkillPins {...({ ...props, sessionId } as unknown as SkillPinsProps)} />)
    },
    view,
  }
}

describe('SkillPins', () => {
  it('renders nothing while the catalog is empty or the read fails', async () => {
    renderPins({ pins: [] })
    await Promise.resolve()
    expect(screen.queryByText(en.pinsHint)).toBeNull()

    cleanup()
    renderPins({ reject: true })
    await Promise.resolve()
    expect(screen.queryByText(en.pinsHint)).toBeNull()
  })

  it('arms the mode pins in the draft and paints their labels', async () => {
    const { setDraft } = renderPins({})
    await waitFor(() => {
      expect(screen.getByText('讲明白')).toBeTruthy()
      expect(screen.getByText('真懂了吗')).toBeTruthy()
      expect(screen.getByText('带做一道')).toBeTruthy()
    })
    expect(setDraft).toHaveBeenCalledWith('/explain-clearly /check-understanding /work-an-example ')
  })

  it('dismisses one pin from the draft and puts it back on the next click', async () => {
    const { setDraft, input } = renderPins({
      draft: '/explain-clearly /check-understanding /work-an-example 帮我讲',
    })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
    setDraft.mockClear()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Don’t use 讲明白' }))
    })
    expect(input.getSnapshot().draft).toBe('/check-understanding /work-an-example 帮我讲')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use 讲明白' }))
    })
    expect(input.getSnapshot().draft).toContain('/explain-clearly')
  })

  it('ignores a catalog that settles after unmount', async () => {
    let resolve: ((pins: readonly SkillPin[]) => void) | undefined
    let reject: ((error: Error) => void) | undefined
    const pending = new Promise<readonly SkillPin[]>((ok, fail) => {
      resolve = ok
      reject = fail
    })
    const { view } = renderPins({ pins: pending })
    view.unmount()
    await act(async () => { resolve?.(STUDY) })
    expect(screen.queryByText('讲明白')).toBeNull()

    const pendingFail = new Promise<readonly SkillPin[]>((_ok, fail) => { reject = fail })
    const second = renderPins({ pins: pendingFail })
    second.view.unmount()
    await act(async () => { reject?.(new Error('gone')) })
    expect(screen.queryByText(en.pinsHint)).toBeNull()
  })

  it('forgets the previous session’s armed names when the session id changes', async () => {
    const { setSession } = renderPins({
      draft: '/explain-clearly /check-understanding /work-an-example 旧会话',
    })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
    await act(async () => { setSession('s2') })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
  })

  it('replaces the previous mode’s tokens when the catalog moves', async () => {
    const { setDraft, reload } = renderPins({
      draft: '/explain-clearly /check-understanding /work-an-example 帮我写',
    })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
    setDraft.mockClear()

    await act(async () => { reload(WRITING) })
    await waitFor(() => { expect(screen.getByText('写人话')).toBeTruthy() })
    expect(setDraft).toHaveBeenCalledWith('/draft-and-revise /write-plain /keep-the-facts 帮我写')
    expect(screen.queryByText('讲明白')).toBeNull()
  })
})
