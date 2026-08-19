/**
 * Agent-preset surface plugin, browser half — five surfaces over one roster:
 * the mode grid on the new-session screen, a General-settings row for the
 * default mode, a read-only label in the session header, the composer
 * skill-pin tags for the mode's domain skills, and the assistant-row
 * regenerate action.
 *
 * A running session keeps the composition it began with (the host refuses to
 * adopt an existing session under a different preset). That is what splits
 * the choice from the display: the General row and the grid are both
 * before-the-fact, while the header only reports what a session already runs.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge and the forwarded-event key face
// (the settings invalidation rides the allowlist) into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.general.item' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the conversation SlotMap merge (dock + assistant-actions) and ctx.conversation.hints.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentPresetLabel } from './AgentPresetLabel.tsx'
import type { AgentPresetLabelInjected } from './AgentPresetLabel.tsx'
import { AgentPresetRow } from './AgentPresetRow.tsx'
import type { AgentPresetRowInjected } from './AgentPresetRow.tsx'
import { ModeGrid } from './ModeGrid.tsx'
import type { ModeGridInjected } from './ModeGrid.tsx'
import { ModeGridController } from './grid-store.ts'
import type { ModeSessionSummary } from './grid-store.ts'
import { en, zh } from './locales.ts'
import { modePins } from './pin-draft.ts'
import { AGENT_PRESET_SETTINGS_NS, AgentPresetSettingsController } from './settings-store.ts'
import { SkillPins } from './SkillPins.tsx'
import type { SkillPinsInjected } from './SkillPins.tsx'
import { RegenerateActions } from './RegenerateActions.tsx'
import type { RegenerateActionsInjected } from './RegenerateActions.tsx'

export type { AgentPresetLabelInjected, AgentPresetLabelProps } from './AgentPresetLabel.tsx'
export type { AgentPresetRowInjected, AgentPresetRowProps } from './AgentPresetRow.tsx'
export type { ModeGridInjected, ModeGridProps } from './ModeGrid.tsx'
export type { ModeGridState, ModeSessionSummary } from './grid-store.ts'
export type { SkillPin, SkillPinSource } from './pin-draft.ts'
export {
  armedNames, modePins, PIN_CAP, pinLabel, prependPins, removePin, SHARED_SKILL_ID,
  SHARED_SKILL_IDS, swapPins,
} from './pin-draft.ts'
export type { SkillPinsInjected, SkillPinsProps } from './SkillPins.tsx'
export type { AgentPresetOption, AgentPresetSettingsState } from './settings-store.ts'
export { AGENT_PRESET_SETTINGS_NS, writeDefaultPreset } from './settings-store.ts'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection', 'remote']

/**
 * Mount the General-settings row, the mode grid, the header label, the skill pins, and regenerate.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle
  const controller = new AgentPresetSettingsController(api)

  ctx.effect(() => ctx.locale.register('settings.agentPreset', { zh, en }), 'ui-agent-preset: settings row dictionaries')

  const injected = (): AgentPresetRowInjected => ({
    hooks: { agentPreset: controller.store },
    load: () => controller.load(),
    select: (id: string) => controller.select(id),
  })

  ctx.effect(() => {
    // The roster is a live directory and the default is a settings field, so
    // both an external settings edit and a reconnect can move this row.
    const refresh = (): void => { void controller.load() }
    const disposers = [
      ctx.remote.$on('settings/document-updated', (ns) => {
        if (ns !== AGENT_PRESET_SETTINGS_NS) return
        refresh()
      }),
      ctx.on('connection/reset', () => { refresh() }),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'ui-agent-preset: settings refresh')

  // The mode grid and the header label: one controller, because the staged
  // choice belongs to the flow rather than to any one session.
  ctx.inject(['slots', 'conversation', 'sessions', 'workspaces'], (scope: ClientContext) => {
    const api = (scope.get('connection') as ConnectionHandle).api
    const grid = new ModeGridController(api, (): ModeSessionSummary | undefined => {
      const state = scope.sessions.list.getSnapshot()
      const summary = state.current === undefined ? undefined : state.byId[state.current]
      return summary === undefined
        ? undefined
        : {
          id: summary.id,
          blank: summary.blank,
          ...summary.agentPreset === undefined ? {} : { agentPreset: summary.agentPreset },
        }
    }, (sessionId, agentPreset) => {
      scope.sessions.noteAgentPreset(sessionId as never, agentPreset)
    }, async (agentPreset) => {
      const sessions = scope.sessions.list.getSnapshot()
      const current = sessions.current === undefined ? undefined : sessions.byId[sessions.current]
      const workspaces = scope.workspaces.list.getSnapshot()
      const workspace = current === undefined
        ? workspaces.items.find(item => item.workspaceId === workspaces.recentWorkspaceId)
        : workspaces.items.find(item => item.sessionIds.includes(current.id))
          ?? workspaces.items.find(item => item.workspaceId === workspaces.recentWorkspaceId)
      const sessionId = await scope.sessions.create({
        ...workspace === undefined ? {} : { workspaceId: workspace.workspaceId },
        ...current?.cwd === undefined || workspace !== undefined ? {} : { cwd: current.cwd },
        agentPreset,
      })
      scope.sessions.open(sessionId)
    })

    const gridInjected = (): ModeGridInjected => ({
      hooks: { modeGrid: grid.store },
      load: () => grid.load(),
      select: (id: string) => grid.select(id),
    })

    const labelInjected = (): AgentPresetLabelInjected => ({
      hooks: { agentPresets: controller.store },
      load: () => controller.load(),
    })

    const setPlaceholder = (sessionId: Parameters<SkillPinsInjected['setPlaceholder']>[0], placeholder: string | undefined): void => {
      scope.conversation.hints.set(sessionId, placeholder === undefined ? undefined : { placeholder })
    }

    const pinsInjected = (): SkillPinsInjected => ({
      hooks: { modeGrid: grid.store },
      setPlaceholder,
      load: async (sessionId) => {
        const { result } = await api.skills.list({ sessionId })
        if (!result.ok) throw new Error(`skill.list failed: ${result.error.code}: ${result.error.message}`)
        return modePins(result.value.skills)
      },
      watchCatalog: (sessionId, onChange) => {
        const presetMoved = scope.remote.$on('agent-preset/selected', (id) => {
          if (id === sessionId) onChange()
        })
        const reset = scope.on('connection/reset', () => { onChange() })
        return () => {
          presetMoved()
          reset()
        }
      },
    })

    const regenerateInjected = (sessionId: Parameters<SkillPinsInjected['load']>[0]): RegenerateActionsInjected => ({
      send: async (text) => {
        const conversation = scope.sessions.scope(sessionId)?.get('conversation')
        if (conversation === undefined) {
          throw new Error(`ui-agent-preset: session "${sessionId}" has no conversation`)
        }
        await conversation.send(text)
      },
    })

    scope.effect(() => {
      // Connecting a workspace either creates a blank session or reuses one,
      // and either way the grid's pick predates it — so the stage is applied
      // when the session arrives, not when it was made.
      const stop = scope.sessions.list.subscribe(() => { void grid.apply() })
      // The grid opens on the deployment default, so a default changed from
      // the settings surface moves it too — otherwise the screen that starts
      // the next session keeps offering the previous default until a reload,
      // which is exactly the session the setting claims to govern. A staged
      // pick survives: `load()` prefers it over the refreshed fallback.
      const settingsMoved = scope.remote.$on('settings/document-updated', (ns) => {
        if (ns !== AGENT_PRESET_SETTINGS_NS) return
        void grid.load()
      })
      // Every tab folds the committed preset into the shared session row; the
      // initiating tab may already have applied the RPC echo, which is idempotent.
      const presetSelected = scope.remote.$on('agent-preset/selected', (sessionId, agentPreset) => {
        scope.sessions.noteAgentPreset(sessionId, agentPreset)
      })
      const gridSlot = scope.slots.register({
        name: 'conversation.hero.modes',
        locale: 'settings.agentPreset',
        inject: gridInjected,
      }, ModeGrid)
      const labelSlot = scope.slots.register({
        name: 'conversation.session.header.actions',
        id: 'agent-preset',
        // Static session context occupies the header's leading negative-order band.
        order: -10,
        locale: 'settings.agentPreset',
        inject: labelInjected,
      }, AgentPresetLabel)
      // Immediately above the composer card (todo is 0, queue is 20).
      const pinsSlot = scope.slots.register({
        name: 'conversation.input.dock',
        id: 'skill-pins',
        order: 25,
        locale: 'settings.agentPreset',
        inject: pinsInjected,
      }, SkillPins)
      const regenerateSlot = scope.slots.inject('conversation.chat.assistant-actions', () =>
        scope.slots.register({
          name: 'conversation.chat.assistant-actions',
          id: 'regenerate',
          order: 0,
          locale: 'settings.agentPreset',
          inject: regenerateInjected,
        }, RegenerateActions))
      return () => {
        stop()
        settingsMoved()
        presetSelected()
        gridSlot()
        labelSlot()
        pinsSlot()
        regenerateSlot()
      }
    }, 'ui-agent-preset: mode grid, header label, skill pins, and regenerate')
  })

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'agent-preset',
    order: -25,
    locale: 'settings.agentPreset',
    inject: injected,
  }, AgentPresetRow))
}
