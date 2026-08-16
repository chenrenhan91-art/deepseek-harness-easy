/**
 * Mode skill pins: Chinese tags inside the composer stack. Clicking a mode
 * arms that mode's 2–3 domain skills as `/name` tokens in the draft so the
 * host injects their bodies on send.
 */

import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge (the input dock seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SkillPin } from './pin-draft.ts'
import { armedNames, prependPins, removePin, swapPins } from './pin-draft.ts'
import css from './SkillPins.module.css'

/** Registration-side face: catalog read plus invalidation. */
export interface SkillPinsInjected {
  /** User-invocable mode pins for this session's composition. */
  load: (sessionId: SessionId) => Promise<readonly SkillPin[]>
  /** Fire when the session's skill catalog may have changed. */
  watchCatalog: (sessionId: SessionId, onChange: () => void) => () => void
}

/** Full component props. */
export type SkillPinsProps =
  PropsRuntime<'conversation.input.dock'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<SkillPinsInjected>

/**
 * Render the mode's skill tags above the composer card.
 * @param props - composed slot props.
 * @returns the pin row, or null while this session has no mode-owned skills.
 */
export function SkillPins({
  sessionId, useInput, inputActions, load, watchCatalog, t,
}: SkillPinsProps) {
  const draft = useInput(s => s.draft)
  const [pins, setPins] = useState<readonly SkillPin[]>([])
  const draftRef = useRef(draft)
  const lastNames = useRef<string[]>([])
  const lastSession = useRef(sessionId)
  draftRef.current = draft

  useEffect(() => {
    let cancelled = false
    const refresh = (): void => {
      void load(sessionId).then(
        (next) => { if (!cancelled) setPins(next) },
        () => { if (!cancelled) setPins([]) },
      )
    }
    refresh()
    const stop = watchCatalog(sessionId, refresh)
    return () => {
      cancelled = true
      stop()
    }
  }, [sessionId, load, watchCatalog])

  useEffect(() => {
    if (lastSession.current !== sessionId) {
      lastNames.current = []
      lastSession.current = sessionId
    }
    const next = pins.map(pin => pin.name)
    const swapped = swapPins(draftRef.current, lastNames.current, next)
    lastNames.current = next
    if (swapped !== draftRef.current) inputActions.setDraft(swapped)
  }, [pins, sessionId, inputActions])

  if (pins.length === 0) return null

  const armed = new Set(armedNames(draft))

  const toggle = (name: string): void => {
    inputActions.setDraft(
      armed.has(name) ? removePin(draft, name) : prependPins(draft, [name]),
    )
  }

  return (
    <div className={css.root} data-skill-pins="">
      <div className={css.hint}>{t('pinsHint')}</div>
      {pins.map((pin) => {
        const on = armed.has(pin.name)
        return (
          <span
            key={pin.name}
            className={on ? css.pin : `${css.pin} ${css.pinOff}`}
            data-skill-pin={pin.name}
            data-armed={on || undefined}
          >
            <span className={css.label}>{pin.label}</span>
            <button
              type="button"
              className={css.toggle}
              aria-label={on ? t('pinRemove', { name: pin.label }) : t('pinArm', { name: pin.label })}
              aria-pressed={on}
              onClick={() => { toggle(pin.name) }}
            >
              <IconCloseOutline16 size={12} />
            </button>
          </span>
        )
      })}
    </div>
  )
}
