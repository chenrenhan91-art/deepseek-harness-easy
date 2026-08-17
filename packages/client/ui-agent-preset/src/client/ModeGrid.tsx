/**
 * The mode grid on the new-session screen: one card per agent preset.
 *
 * It replaces a dropdown because picking what the agent is good at is the
 * first thing a beginner does and the last thing they should have to hunt
 * for. Cards are a radio group — one is always chosen, and the chosen one is
 * what the next session composes from.
 *
 * The pick is staged rather than applied: the hero has no session yet, and the
 * stage lands on the blank session the flow produces. Once a turn has run the
 * host refuses the swap, which is why the grid only exists on this screen.
 */

import { useEffect } from 'react'
import type { ComponentType } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconChecklistOutline14, IconCodeOutline16, IconDataOutline16, IconFolderOpenOutline16,
  IconGlobeOutline14, IconListPenOutline16, IconQuestionOutline14, IconRefreshOutline16,
  IconSearchOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: pulls the ui-conversation SlotMap merge (the hero mode seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ModeGridState } from './grid-store.ts'
import css from './ModeGrid.module.css'

/** Registration-side business face for the mode grid. */
export interface ModeGridInjected {
  hooks: {
    /** Grid snapshot bound by the renderer as useModeGrid. */
    modeGrid: SnapshotStore<ModeGridState>
  }
  /** Read the roster when the grid first renders. */
  load: () => Promise<void>
  /** Stage one preset for the next session. */
  select: (id: string) => Promise<void>
}

/**
 * Glyphs a preset may ask for by name in its `preset.yml`. A preset naming
 * none — or naming one this build does not draw — gets {@link FALLBACK_ICON},
 * so an unknown name costs a generic card rather than a missing one.
 */
const MODE_ICONS: Readonly<Partial<Record<string, ComponentType<{ className?: string | undefined }>>>> = {
  page: IconGlobeOutline14,
  pen: IconListPenOutline16,
  table: IconDataOutline16,
  folder: IconFolderOpenOutline16,
  question: IconQuestionOutline14,
  slides: IconChecklistOutline14,
  repeat: IconRefreshOutline16,
  code: IconCodeOutline16,
  search: IconSearchOutline16,
}

const FALLBACK_ICON = IconSparkle16

/** Full component props. */
export type ModeGridProps =
  PropsRuntime<'conversation.hero.modes'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<ModeGridInjected>

/**
 * Render the new-session mode grid.
 * @param props - composed slot props.
 * @returns the card grid, or null while the deployment composes no presets.
 */
export function ModeGrid({ load, select, useModeGrid, t }: ModeGridProps) {
  const state = useModeGrid(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  // Nothing to choose between: the deployment composes no presets and every
  // session shares the host composition.
  if (state.options.length === 0) return null

  return (
    <div className={css.root}>
      <div className={css.heading}>{t('gridHeading')}</div>
      <div className={css.grid} role="radiogroup" aria-label={t('gridHeading')}>
        {state.options.map((option) => {
          const chosen = option.id === state.current
          const Icon = (option.icon === undefined ? undefined : MODE_ICONS[option.icon]) ?? FALLBACK_ICON
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              className={chosen ? `${css.card} ${css.cardChosen}` : css.card}
              disabled={state.busy}
              onClick={() => { void select(option.id) }}
            >
              <span className={css.cardIcon}><Icon className={css.icon} /></span>
              <span className={css.cardName}>{option.name ?? option.id}</span>
              <span className={css.cardDesc}>{option.description ?? t('noDescription')}</span>
            </button>
          )
        })}
      </div>
      <div className={css.hint}>{state.error ?? t('gridHint')}</div>
    </div>
  )
}
