// @vitest-environment jsdom
/**
 * The three surfaces: the General-settings row naming the default for later
 * sessions, the new-session mode grid naming the next one's, and the session
 * header's read-only label. The split is the host's rule — a session's history
 * is produced under its preset's tools, so the choice is only ever offered
 * before one starts.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentPresetLabel } from '../src/client/AgentPresetLabel.tsx'
import type { AgentPresetLabelProps } from '../src/client/AgentPresetLabel.tsx'
import { AgentPresetRow } from '../src/client/AgentPresetRow.tsx'
import type { AgentPresetRowProps } from '../src/client/AgentPresetRow.tsx'
import { ModeGrid } from '../src/client/ModeGrid.tsx'
import type { ModeGridProps } from '../src/client/ModeGrid.tsx'
import type { AgentPresetSettingsState } from '../src/client/settings-store.ts'
import type { ModeGridState } from '../src/client/grid-store.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const ROW_READY: AgentPresetSettingsState = {
  status: 'ready',
  error: null,
  writable: true,
  currentValue: 'study',
  // `mine` deliberately names itself nothing: the row must fall back to the
  // id for a preset whose author wrote no metadata.
  options: [{ id: 'study', trust: 'system', name: '学习答疑' }, { id: 'mine', trust: 'user' }],
}

const GRID_READY: ModeGridState = {
  current: 'study',
  options: [
    { id: 'study', trust: 'system', name: '学习答疑', description: '把复杂的事讲明白。', icon: 'question' },
    { id: 'mine', trust: 'user' },
  ],
  busy: false,
  error: null,
}

function renderRow(state: Partial<AgentPresetSettingsState> = {}) {
  const store = createSnapshotStore<AgentPresetSettingsState>({ ...ROW_READY, ...state })
  const actions = { load: vi.fn(() => Promise.resolve()), select: vi.fn(() => Promise.resolve()) }
  render(<AgentPresetRow {...({
    ...actions,
    useAgentPreset: bindSnapshotSelector(store),
    t: (key: keyof typeof en) => en[key],
  } as unknown as AgentPresetRowProps)} />)
  return actions
}

function renderGrid(state: Partial<ModeGridState> = {}) {
  const store = createSnapshotStore<ModeGridState>({ ...GRID_READY, ...state })
  const actions = { load: vi.fn(() => Promise.resolve()), select: vi.fn(() => Promise.resolve()) }
  const view = render(<ModeGrid {...({
    ...actions,
    useModeGrid: bindSnapshotSelector(store),
    t: (key: keyof typeof en) => en[key],
  } as unknown as ModeGridProps)} />)
  return { ...actions, view }
}

function renderLabel(
  summary: { blank: boolean; agentPreset?: string } | undefined,
  roster: Partial<AgentPresetSettingsState> = {},
) {
  // The grid and the label read the same roster, metadata included.
  const store = createSnapshotStore<AgentPresetSettingsState>({
    ...ROW_READY, options: GRID_READY.options, ...roster,
  })
  const sessions = createSnapshotStore({ byId: summary === undefined ? {} : { s1: summary } })
  const load = vi.fn(() => Promise.resolve())
  const view = render(<AgentPresetLabel {...({
    load,
    sessionId: 's1',
    useSessions: bindSnapshotSelector(sessions),
    useAgentPresets: bindSnapshotSelector(store),
    t: (key: keyof typeof en) => en[key],
  } as unknown as AgentPresetLabelProps)} />)
  return { load, view }
}

describe('the General-settings row', () => {
  it('reads the roster once and shows the current default', async () => {
    const actions = renderRow()

    await waitFor(() => { expect(actions.load).toHaveBeenCalledTimes(1) })
    expect(screen.getByRole('button').textContent).toContain('学习答疑')
  })

  it('marks a locally authored option as local', () => {
    renderRow()

    fireEvent.click(screen.getByRole('button'))

    // A local preset is exactly as privileged as the plugins it names, so the
    // list says which rows are local rather than presenting all as vetted.
    expect(screen.getByText(`mine · ${en.userTrust}`)).toBeTruthy()
    // The shipped one carries no marker; only local rows are called out.
    expect(screen.getAllByText('学习答疑')).toHaveLength(2)
  })

  it('falls back to the id for a preset that published no name', () => {
    renderRow({
      currentValue: 'mine',
      options: [
        { id: 'study', trust: 'system', name: '学习答疑' },
        { id: 'bare', trust: 'system' },
        { id: 'mine', trust: 'user' },
        { id: 'ours', trust: 'user', name: '团队模式' },
      ],
    })

    // The trigger names the preset; with no metadata the id is all there is.
    expect(screen.getByRole('button').textContent).toContain('mine')

    fireEvent.click(screen.getByRole('button'))

    // A locally authored preset is marked whether or not it named itself.
    expect(screen.getByText(`团队模式 · ${en.userTrust}`)).toBeTruthy()
    expect(screen.getByText(`mine · ${en.userTrust}`)).toBeTruthy()
    // A shipped preset with no metadata is listed by id and carries no mark.
    expect(screen.getByText('bare')).toBeTruthy()
  })

  it('shows the selected id until a stale roster contains it', () => {
    renderRow({ currentValue: 'arriving', options: [] })

    expect(screen.getByRole('button').textContent).toContain('arriving')
  })

  it('writes the picked preset and closes the menu', () => {
    const actions = renderRow()
    fireEvent.click(screen.getByRole('button'))

    fireEvent.click(screen.getByText(`mine · ${en.userTrust}`))

    expect(actions.select).toHaveBeenCalledWith('mine')
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('closes on an outside dismissal', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button'))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('says it is loading before the roster answers', () => {
    renderRow({ status: 'loading', currentValue: '' })

    expect(screen.getByRole('button').textContent).toContain(en.loading)
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
  })

  it('shows a failure in place of the description', () => {
    renderRow({ error: 'roster unavailable' })

    expect(screen.getByRole('alert').textContent).toBe('roster unavailable')
  })

  it('renders nothing when the deployment composes no presets', () => {
    const { container } = render(<AgentPresetRow {...({
      load: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => Promise.resolve()),
      useAgentPreset: bindSnapshotSelector(
        createSnapshotStore<AgentPresetSettingsState>({ ...ROW_READY, status: 'unavailable', options: [] })),
      t: (key: keyof typeof en) => en[key],
    } as unknown as AgentPresetRowProps)} />)

    expect(container.firstChild).toBeNull()
  })

  it('closes and locks the menu when the settings turn read-only', () => {
    const store = createSnapshotStore<AgentPresetSettingsState>(ROW_READY)
    render(<AgentPresetRow {...({
      load: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => Promise.resolve()),
      useAgentPreset: bindSnapshotSelector(store),
      t: (key: keyof typeof en) => en[key],
    } as unknown as AgentPresetRowProps)} />)
    fireEvent.click(screen.getByRole('button'))

    act(() => { store.set({ ...ROW_READY, writable: false }) })

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
  })
})

describe('the new-session mode grid', () => {
  it('reads the roster once and offers one card per mode', async () => {
    const actions = renderGrid()

    await waitFor(() => { expect(actions.load).toHaveBeenCalledTimes(1) })
    // Every mode is visible at once: the grid exists so that picking is
    // reading, not opening a menu and hunting.
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByText('学习答疑')).toBeTruthy()
    expect(screen.getByText('把复杂的事讲明白。')).toBeTruthy()
  })

  it('marks exactly the staged mode as chosen', () => {
    renderGrid()

    const chosen = screen.getAllByRole('radio').filter(card => card.getAttribute('aria-checked') === 'true')
    expect(chosen).toHaveLength(1)
    expect(chosen[0]!.textContent).toContain('学习答疑')
  })

  it('falls back to the id and the generic description for a bare preset', () => {
    renderGrid()

    // A preset that published nothing still reads as a card rather than a
    // blank tile: the id is all there is to name it by.
    expect(screen.getByText('mine')).toBeTruthy()
    expect(screen.getByText(en.noDescription)).toBeTruthy()
  })

  it('stages the picked mode', () => {
    const actions = renderGrid()

    fireEvent.click(screen.getByText('mine'))

    expect(actions.select).toHaveBeenCalledWith('mine')
  })

  it('refuses picks while a switch is in flight', () => {
    renderGrid({ busy: true })

    expect(screen.getAllByRole('radio').every(card => (card as HTMLButtonElement).disabled)).toBe(true)
  })

  it('shows a refused switch in place of the hint', () => {
    renderGrid({ error: 'session has already started' })

    expect(screen.getByText('session has already started')).toBeTruthy()
    expect(screen.queryByText(en.gridHint)).toBeNull()
  })

  it('renders nothing when the deployment composes no presets', () => {
    const { view } = renderGrid({ options: [] })

    expect(view.container.firstChild).toBeNull()
  })
})

describe('the session-header label', () => {
  it('names the preset the session runs, and never offers a switch', async () => {
    const { load } = renderLabel({ blank: false, agentPreset: 'study' })

    await waitFor(() => { expect(load).toHaveBeenCalledTimes(1) })
    // A control here would promise a switch the host refuses outright.
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByTitle('把复杂的事讲明白。').textContent).toBe('学习答疑')
  })

  it('falls back to the id, and to the generic hint, when metadata is absent', () => {
    renderLabel({ blank: true, agentPreset: 'mine' })

    expect(screen.getByTitle(en.headerHint).textContent).toBe('mine')
  })

  it('shows the id until the roster resolves it', () => {
    renderLabel({ blank: false, agentPreset: 'study' }, { options: [] })

    // The session's own summary is the authority on which preset it runs; the
    // roster only supplies the display name, and its arrival is a later frame.
    expect(screen.getByTitle(en.headerHint).textContent).toBe('study')
  })

  it('renders nothing, and reads no roster, when the session records no preset', async () => {
    const absent = renderLabel({ blank: true })
    expect(absent.view.container.firstChild).toBeNull()
    cleanup()

    // A session the list has not caught up to is the same answer: a deployment
    // that composes no presets must not pay for a roster read per header.
    const unknown = renderLabel(undefined)
    expect(unknown.view.container.firstChild).toBeNull()
    await act(async () => { await Promise.resolve() })
    expect(absent.load).not.toHaveBeenCalled()
    expect(unknown.load).not.toHaveBeenCalled()
  })
})
