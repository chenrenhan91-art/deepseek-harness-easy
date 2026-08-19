/**
 * Registration: the General row, the new-session mode grid, and the header
 * label all come from one apply, and each defers until the slot it fills has
 * been declared. A pushed settings change refreshes the surfaces that are
 * already showing, so a default set from one converges the other.
 */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-agent-preset/client'
import { AgentPresetLabel } from '../src/client/AgentPresetLabel.tsx'
import type { AgentPresetLabelInjected } from '../src/client/AgentPresetLabel.tsx'
import { AgentPresetRow } from '../src/client/AgentPresetRow.tsx'
import type { AgentPresetRowInjected } from '../src/client/AgentPresetRow.tsx'
import { ModeGrid } from '../src/client/ModeGrid.tsx'
import type { ModeGridInjected } from '../src/client/ModeGrid.tsx'
import { SkillPins } from '../src/client/SkillPins.tsx'
import type { SkillPinsInjected } from '../src/client/SkillPins.tsx'
import { RegenerateActions } from '../src/client/RegenerateActions.tsx'
import type { RegenerateActionsInjected } from '../src/client/RegenerateActions.tsx'

// The service reads its initial locale from the browser; these specs assert
// the shipped Chinese copy, so they state the browser they assume.
usePinnedBrowserLanguages('zh-CN')

const ROSTER_ONE = {
  rpcId: 'r',
  result: {
    ok: true as const,
    value: {
      presets: [{ id: 'study', trust: 'system', isDefault: true, name: '学习答疑', icon: 'question' }],
      authorable: true,
      hasDocument: true,
    },
  },
}

/** The same roster with a second mode carrying the default. */
const ROSTER_MOVED = {
  rpcId: 'r',
  result: {
    ok: true as const,
    value: {
      presets: [
        { id: 'study', trust: 'system', isDefault: false, name: '学习答疑' },
        { id: 'writing', trust: 'system', isDefault: true, name: '写作' },
      ],
      authorable: true,
      hasDocument: true,
    },
  },
}

async function bench() {
  const ctx = new Context()
  // The host's answer, mutable so a spec can move the default the way the
  // settings surface does and watch who re-reads it.
  let ROSTER: typeof ROSTER_ONE | typeof ROSTER_MOVED = ROSTER_ONE
  let skillsOk = true
  const moveDefault = (): void => { ROSTER = ROSTER_MOVED }
  const failSkills = (): void => { skillsOk = false }
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  // The plugins inject `remote`; forwarded events reach them through the
  // same `$dispatch` handoff the connection sink makes.
  new TestRemote(ctx)
  const calls: string[] = []
  ctx.provide('connection', {
    api: {
      agentPresets: {
        list: () => { calls.push('list'); return Promise.resolve(ROSTER) },
        select: (payload: { agentPreset: string }) => {
          calls.push(`select:${payload.agentPreset}`)
          return Promise.resolve({ rpcId: 'r', result: { ok: true as const, value: { agentPreset: payload.agentPreset } } })
        },
      },
      settings: {
        // The row reads this to learn whether this browser may write at all.
        describe: () => Promise.resolve({
          rpcId: 'r',
          result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [] } },
        }),
        update: (payload: { patch: unknown }) => { calls.push(`settings:${JSON.stringify(payload.patch)}`); return Promise.resolve({ rpcId: 'r', result: { ok: true as const, value: {} } }) },
      },
      skills: {
        list: () => Promise.resolve({
          rpcId: 'r',
          result: skillsOk
            ? {
              ok: true as const,
              value: {
                skills: [
                  { name: 'explain-clearly', description: '讲明白：拆开讲', modelInvocable: true },
                  { name: 'vision', description: '视觉技能：看图', modelInvocable: true },
                ],
              },
            }
            : { ok: false as const, error: { code: 'unavailable', message: 'down' } },
        }),
      },
    },
  } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, calls, moveDefault, failSkills }
}

function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: {
      'settings.general.item': { kind: 'list', scope: 'root' },
      conversation: { kind: 'single', scope: 'root' },
    },
  } as never, () => null)
}

/** The conversation's own declarations, which the grid and label wait for. */
function declareConversation(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'conversation',
    children: {
      'conversation.hero.modes': { kind: 'single', scope: 'root' },
      'conversation.session.header.actions': { kind: 'list', scope: 'session' },
      'conversation.input.dock': { kind: 'list', scope: 'session' },
      'conversation.chat.assistant-actions': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
}

/** A workspaces double recording new-session starts. */
function workspacesDouble(state: {
  current?: string
  byId: Record<string, { id: string; blank: boolean; agentPreset?: string }>
}) {
  const starts: unknown[] = []
  return {
    starts,
    startSession: (workspaceId?: unknown) => { starts.push(workspaceId ?? null) },
    list: {
      getSnapshot: () => ({
        items: [{
          workspaceId: 'w1',
          path: '/w',
          title: 'w',
          sessionIds: Object.keys(state.byId),
        }],
        recentWorkspaceId: 'w1',
        archivedSessionIds: [],
        state: 'ready',
        phase: 'ready',
        error: null,
        baselinesReady: true,
      }),
    },
  }
}

/** A sessions double whose list can be moved and whose changes are pushed. */
function sessionsDouble(state: {
  current?: string
  byId: Record<string, { id: string; blank: boolean; agentPreset?: string }>
}, calls: string[]) {
  const listeners = new Set<() => void>()
  const send = vi.fn(() => Promise.resolve())
  return {
    conversationSend: send,
    list: {
      getSnapshot: () => state,
      subscribe: (fn: () => void) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    },
    create: async (opts: { agentPreset?: string }) => {
      const id = `s-new-${opts.agentPreset ?? 'default'}`
      calls.push(`create:${opts.agentPreset ?? ''}`)
      state.byId[id] = { id, blank: true, ...opts.agentPreset === undefined ? {} : { agentPreset: opts.agentPreset } }
      return id
    },
    open: (id: string) => {
      calls.push(`open:${id}`)
      state.current = id
    },
    noteAgentPreset: (sessionId: string, agentPreset: string) => {
      const summary = state.byId[sessionId]
      if (summary === undefined || summary.agentPreset === agentPreset) return
      summary.agentPreset = agentPreset
      for (const fn of listeners) fn()
    },
    /** Push a list change the way the runtime's store does. */
    notify: () => { for (const fn of listeners) fn() },
    scope: (_id: string): { get: (name: string) => { send: typeof send } | undefined } | undefined => ({
      get: (name: string) => name === 'conversation' ? { send } : undefined,
    }),
  }
}

/** Mount apply with the conversation scope its grid and label wait for. */
async function withConversation(state: {
  current?: string
  byId: Record<string, { id: string; blank: boolean; agentPreset?: string }>
} = { byId: {} }) {
  const harness = await bench()
  declareRoot(harness.slots)
  const conversation = declareConversation(harness.slots)
  const hints = { set: vi.fn() }
  harness.ctx.provide('conversation', { hints } as never)
  const sessions = sessionsDouble(state, harness.calls)
  harness.ctx.provide('sessions', sessions as never)
  harness.ctx.provide('workspaces', workspacesDouble(state) as never)
  const fiber = harness.ctx.plugin({
    inject: [...inject, 'conversation', 'sessions', 'workspaces'], apply,
  })
  await fiber.await()
  return { ...harness, sessions, fiber, conversation, hints }
}

/** The grid's business face, as the renderer would resolve it. */
function gridFace(slots: SlotRegistry): ModeGridInjected {
  return (slots.entries('conversation.hero.modes')[0]!.inject as unknown as () => ModeGridInjected)()
}

describe('ui-agent-preset apply', () => {
  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote'])
  })

  it('registers the General row', async () => {
    const { ctx, slots } = await bench()
    declareRoot(slots)

    await ctx.plugin({ inject: [...inject], apply }).await()

    const row = slots.entries('settings.general.item')[0]!
    expect(row.component).toBe(AgentPresetRow)
    expect(row.options).toMatchObject({ id: 'agent-preset', order: -25 })
  })

  it('registers into a declaration that arrives after apply', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()

    declareRoot(slots)

    await vi.waitFor(() => { expect(slots.entries('settings.general.item')).toHaveLength(1) })
  })

  it('registers the mode grid and the header label, and drops both on disposal', async () => {
    const { slots, fiber, conversation } = await withConversation()

    const grid = slots.entries('conversation.hero.modes')[0]!
    expect(grid.component).toBe(ModeGrid)
    const label = slots.entries('conversation.session.header.actions')[0]!
    expect(label.component).toBe(AgentPresetLabel)
    expect(label.options).toMatchObject({ id: 'agent-preset', order: -10 })
    const pins = slots.entries('conversation.input.dock')[0]!
    expect(pins.component).toBe(SkillPins)
    expect(pins.options).toMatchObject({ id: 'skill-pins', order: 25 })
    const regenerate = slots.entries('conversation.chat.assistant-actions')[0]!
    expect(regenerate.component).toBe(RegenerateActions)
    expect(regenerate.options).toMatchObject({ id: 'regenerate', order: 0 })

    await fiber.dispose()

    expect(slots.entries('conversation.hero.modes')).toHaveLength(0)
    expect(slots.entries('conversation.session.header.actions')).toHaveLength(0)
    expect(slots.entries('conversation.input.dock')).toHaveLength(0)
    expect(slots.entries('conversation.chat.assistant-actions')).toHaveLength(0)
    expect(slots.entries('settings.general.item')).toHaveLength(0)
    conversation()
  })

  it('hands the grid and the row separate stores', async () => {
    const { slots } = await withConversation()
    const row = (slots.entries('settings.general.item')[0]!.inject as unknown as () => AgentPresetRowInjected)()
    const grid = gridFace(slots)

    await row.load()
    await grid.load()

    // The row persists a default; the grid stages one session's choice. A
    // shared store would make picking a mode for one session rewrite the
    // deployment default.
    expect(row.hooks.agentPreset).not.toBe(grid.hooks.modeGrid)
    expect(row.hooks.agentPreset.getSnapshot().currentValue).toBe('study')
    expect(grid.hooks.modeGrid.getSnapshot().current).toBe('study')
  })

  it('carries the glyph name a preset published through to the grid', async () => {
    const { slots } = await withConversation()
    const grid = gridFace(slots)

    await grid.load()

    // The roster field the card draws from: a mode with no `icon` gets the
    // grid's fallback, which is why the name has to survive the read.
    expect(grid.hooks.modeGrid.getSnapshot().options[0]?.icon).toBe('question')
  })

  it('refreshes a showing surface when its namespace changes, and ignores others', async () => {
    const { ctx, slots, calls } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()
    const row = (slots.entries('settings.general.item')[0]!.inject as unknown as () => AgentPresetRowInjected)()
    await row.load()
    const before = calls.length

    ctx.remote.$dispatch('settings/document-updated', ['agent-presets', 1])
    await vi.waitFor(() => { expect(calls.length).toBeGreaterThan(before) })
    const afterRelevant = calls.length

    ctx.remote.$dispatch('settings/document-updated', ['llm-deepseek', 1])
    await Promise.resolve()

    // The row re-reads on its own namespace; an unrelated one moves nothing,
    // which rules out a blanket refresh on every settings write.
    expect(calls.length).toBe(afterRelevant)
  })

  it('re-reads the roster when the connection comes back', async () => {
    const { ctx, slots, calls } = await bench()
    declareRoot(slots)
    await ctx.plugin({ inject: [...inject], apply }).await()
    const row = (slots.entries('settings.general.item')[0]!.inject as unknown as () => AgentPresetRowInjected)()
    await row.load()
    const before = calls.length

    ctx.emit('connection/reset')

    // A reconnect can land on a host whose roster changed under the browser.
    await vi.waitFor(() => { expect(calls.length).toBeGreaterThan(before) })
  })

  it('moves the grid when the default changes on the settings surface', async () => {
    const { ctx, slots, moveDefault, conversation } = await withConversation()
    const grid = gridFace(slots)
    await grid.load()
    expect(grid.hooks.modeGrid.getSnapshot().current).toBe('study')

    // The grid opens on the deployment default, and the setting it comes from
    // lives on another screen: without this the next session — the very one
    // the setting governs — would be composed from the previous default until
    // a reload. An unrelated namespace moves nothing.
    moveDefault()
    ctx.remote.$dispatch('settings/document-updated', ['llm-deepseek', 1])
    await Promise.resolve()
    expect(grid.hooks.modeGrid.getSnapshot().current).toBe('study')

    ctx.remote.$dispatch('settings/document-updated', ['agent-presets', 1])
    await vi.waitFor(() => {
      expect(grid.hooks.modeGrid.getSnapshot().current).toBe('writing')
    })
    conversation()
  })

  it('folds a remote preset commit into the shared session row', async () => {
    const state = {
      current: 's1',
      byId: { s1: { id: 's1', blank: true, agentPreset: 'study' } },
    }
    const { ctx } = await withConversation(state)

    ctx.remote.$dispatch('agent-preset/selected', ['s1', 'writing'])

    expect(state.byId.s1.agentPreset).toBe('writing')
  })

  it('applies the staged choice to the blank session the flow lands on', async () => {
    const state: {
      current?: string
      byId: Record<string, { id: string; blank: boolean; agentPreset?: string }>
    } = { byId: {} }
    const { slots, calls, sessions } = await withConversation(state)
    const grid = gridFace(slots)

    await grid.load()
    // Picked on the hero screen, where there is no session yet.
    await grid.select('writing')
    expect(calls).not.toContain('select:writing')

    state.current = 's1'
    state.byId['s1'] = { id: 's1', blank: true, agentPreset: 'study' }
    sessions.notify()

    // Connecting a workspace produced the session; the stage reaches it there.
    await vi.waitFor(() => { expect(calls).toContain('select:writing') })
  })

  it('mints a new session when the current one has already started', async () => {
    const { slots, calls } = await withConversation({
      current: 's1',
      byId: { s1: { id: 's1', blank: false, agentPreset: 'study' } },
    })
    const grid = gridFace(slots)

    await grid.load()
    await grid.select('writing')

    // The host would answer agent-preset-locked; the card still switches
    // what the user will talk to by starting a session in that mode.
    expect(calls).not.toContain('select:writing')
    expect(calls).toContain('create:writing')
    expect(calls).toContain('open:s-new-writing')
  })

  it('mints a new session when the current one still names a dropped preset', async () => {
    const { slots, calls } = await withConversation({
      current: 's1',
      byId: { s1: { id: 's1', blank: true, agentPreset: 'standard' } },
    })
    const grid = gridFace(slots)

    await grid.load()
    await grid.select('writing')

    // select would resume the retired identity and fail; the pick starts a
    // session that already names the mode.
    expect(calls).not.toContain('select:writing')
    expect(calls).toContain('create:writing')
    expect(calls).toContain('open:s-new-writing')
    expect(grid.hooks.modeGrid.getSnapshot().current).toBe('writing')
    expect(grid.hooks.modeGrid.getSnapshot().error).toBeNull()
  })

  it('opens the grid on the deployment default when the current session names a dropped preset', async () => {
    const { slots } = await withConversation({
      current: 's1',
      byId: { s1: { id: 's1', blank: true, agentPreset: 'standard' } },
    })
    const grid = gridFace(slots)

    await grid.load()

    // The session still records a retired id. Pinning the grid to it would
    // mark no card chosen; the host remounts that session on the default.
    expect(grid.hooks.modeGrid.getSnapshot().current).toBe('study')
  })

  it('applies the stage to a session that records no preset of its own', async () => {
    const { slots, calls } = await withConversation({
      current: 's1',
      byId: { s1: { id: 's1', blank: true } },
    })
    const grid = gridFace(slots)

    await grid.load()
    await grid.select('writing')

    // A session created before the deployment composed presets records none;
    // reading that as "already runs it" would drop the pick on the floor.
    expect(calls).toContain('select:writing')
  })

  it('forgets the stage once it has been spent', async () => {
    const { slots, calls, sessions } = await withConversation({
      current: 's1',
      byId: { s1: { id: 's1', blank: true, agentPreset: 'study' } },
    })
    const grid = gridFace(slots)

    await grid.load()
    await grid.select('writing')
    const spent = calls.filter(call => call === 'select:writing').length
    sessions.notify()
    sessions.notify()

    // Every later list movement would re-apply a stage that was not cleared,
    // switching sessions the user never picked for.
    await Promise.resolve()
    expect(calls.filter(call => call === 'select:writing')).toHaveLength(spent)
  })

  it('gives the header label the same roster the General row reads', async () => {
    const { slots } = await withConversation()
    const label = (slots.entries('conversation.session.header.actions')[0]!
      .inject as unknown as () => AgentPresetLabelInjected)()
    const row = (slots.entries('settings.general.item')[0]!
      .inject as unknown as () => AgentPresetRowInjected)()

    await label.load()

    // One roster behind both: the label resolves a name the settings row's own
    // load already fetched, rather than issuing a second read per session.
    expect(label.hooks.agentPresets).toBe(row.hooks.agentPreset)
    expect(label.hooks.agentPresets.getSnapshot().options.map(option => option.name)).toEqual(['学习答疑'])
  })

  it('loads mode pins from the session catalog and refreshes when the preset moves', async () => {
    const { ctx, slots, failSkills } = await withConversation()
    const pins = (slots.entries('conversation.input.dock')[0]!.inject as unknown as () => SkillPinsInjected)()

    await expect(pins.load('s1' as never)).resolves.toEqual([
      { name: 'explain-clearly', label: '讲明白' },
    ])
    failSkills()
    await expect(pins.load('s1' as never)).rejects.toThrow(/skill.list failed: unavailable: down/)

    let hits = 0
    const stop = pins.watchCatalog('s1' as never, () => { hits += 1 })
    ctx.remote.$dispatch('agent-preset/selected', ['s1', 'writing'])
    ctx.remote.$dispatch('agent-preset/selected', ['other', 'writing'])
    ctx.emit('connection/reset')
    expect(hits).toBe(2)
    stop()
  })

  it('publishes a mode placeholder through conversation.hints', async () => {
    const { slots, hints } = await withConversation()
    const pins = (slots.entries('conversation.input.dock')[0]!.inject as unknown as () => SkillPinsInjected)()

    pins.setPlaceholder('s1' as never, '你卡在哪一步？')
    expect(hints.set).toHaveBeenCalledWith('s1', { placeholder: '你卡在哪一步？' })
    pins.setPlaceholder('s1' as never, undefined)
    expect(hints.set).toHaveBeenCalledWith('s1', undefined)
    expect(pins.hooks.modeGrid).toBe(gridFace(slots).hooks.modeGrid)
  })

  it('regenerate send uses the scoped conversation and fails loud when it is missing', async () => {
    const { slots, sessions } = await withConversation()
    const regen = (slots.entries('conversation.chat.assistant-actions')[0]!
      .inject as unknown as (sessionId: string) => RegenerateActionsInjected)('s1')

    await regen.send('/explain-clearly 讲一下')
    expect(sessions.conversationSend).toHaveBeenCalledWith('/explain-clearly 讲一下')

    sessions.scope = () => undefined
    await expect(regen.send('again')).rejects.toThrow(/session "s1" has no conversation/)
  })
})
