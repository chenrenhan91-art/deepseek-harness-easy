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
import type { ModeGridState } from '../src/client/grid-store.ts'
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
  current?: string
  composerPhase?: 'blank' | 'active'
}) {
  const input = createSnapshotStore({ draft: options.draft ?? '' })
  const grid = createSnapshotStore<ModeGridState>({
    current: options.current ?? 'study',
    options: [],
    busy: false,
    error: null,
  })
  const session = createSnapshotStore({ composerPhase: options.composerPhase ?? 'blank' })
  const setDraft = vi.fn((text: string) => {
    input.set({ draft: text })
  })
  const setPlaceholder = vi.fn()
  let catalog = options.reject
    ? Promise.reject(new Error('catalog down'))
    : Promise.resolve(options.pins ?? STUDY)
  const watchers = new Set<() => void>()
  const props = {
    sessionId: 's1',
    useInput: bindSnapshotSelector(input),
    useSession: bindSnapshotSelector(session),
    useModeGrid: bindSnapshotSelector(grid),
    inputActions: { setDraft, submit: () => {} },
    setPlaceholder,
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
    setPlaceholder,
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

  it('publishes the mode placeholder and two empty-session examples', async () => {
    const { setPlaceholder } = renderPins({ pins: [{ name: 'explain-clearly', label: '讲明白' }] })
    await waitFor(() => {
      expect(screen.getByText('讲明白')).toBeTruthy()
      expect(screen.getByText(en['prompt.study.example1'])).toBeTruthy()
      expect(screen.getByText(en['prompt.study.example2'])).toBeTruthy()
    })
    expect(setPlaceholder).toHaveBeenCalledWith('s1', en['prompt.study.placeholder'])
  })

  it('fills the draft from an example while keeping armed pins', async () => {
    const { input } = renderPins({ pins: [{ name: 'explain-clearly', label: '讲明白' }] })
    await waitFor(() => { expect(screen.getByText(en['prompt.study.example1'])).toBeTruthy() })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en['prompt.study.example1'] }))
    })
    expect(input.getSnapshot().draft).toBe(`/explain-clearly ${en['prompt.study.example1']}`)
  })

  it('hides examples once the user has typed prose or the session is no longer blank', async () => {
    renderPins({
      pins: [{ name: 'explain-clearly', label: '讲明白' }],
      draft: '/explain-clearly 帮我讲',
    })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
    expect(screen.queryByText(en['prompt.study.example1'])).toBeNull()

    cleanup()
    renderPins({
      pins: [{ name: 'explain-clearly', label: '讲明白' }],
      composerPhase: 'active',
    })
    await waitFor(() => { expect(screen.getByText('讲明白')).toBeTruthy() })
    expect(screen.queryByText(en['prompt.study.example1'])).toBeNull()
  })

  it('clears the placeholder for an unknown mode and on unmount', async () => {
    const { setPlaceholder, view } = renderPins({
      pins: [{ name: 'draft-and-revise', label: '起草改稿' }],
      current: 'mine',
    })
    await waitFor(() => { expect(screen.getByText('起草改稿')).toBeTruthy() })
    expect(screen.queryByText(en['prompt.writing.example1'])).toBeNull()
    expect(setPlaceholder).toHaveBeenCalledWith('s1', undefined)
    view.unmount()
    expect(setPlaceholder).toHaveBeenLastCalledWith('s1', undefined)
  })
})
