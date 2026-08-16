/**
 * Sidebar action under New Session: opens the calendar schedule page over
 * the conversation column. The sidebar stays visible.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { IconCloseOutline16, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ScheduleActions } from './index.ts'
import { IconSchedule16, SchedulePage } from './SchedulePage.tsx'
import css from './ScheduleCard.module.css'

/** Full sidebar-action props. */
export type ScheduleSidebarProps =
  PropsRuntime<'sidebar.session.action'>
  & InjectFace<ScheduleActions>
  & PropsLocale<'schedule'>

/**
 * Render the sidebar control and, while open, the overlay page.
 * @param props - composed slot props.
 * @returns the sidebar button and optional overlay.
 */
export function ScheduleSidebar({ wide, useProjection, run, t }: ScheduleSidebarProps) {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(0)
  const close = useCallback(() => { setOpen(false) }, [])
  const trigger = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const frame = document.querySelector('[data-shell-overlay]')?.parentElement
    const sidebar = frame?.firstElementChild
    setLeft(sidebar?.getBoundingClientRect().right ?? 0)
  }, [open, wide])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [close, open])

  const label = t('sidebar')
  const overlay = open && createPortal((
    <div className={css.overlay} style={{ left }} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={close} />
      <div className={css.panel} role="dialog" aria-modal="true" aria-labelledby="dsh-schedule-title">
        <div className={css.panelHeader}>
          <h2 id="dsh-schedule-title" className={css.panelTitle}>{t('title')}</h2>
          <button type="button" className={css.close} onClick={close} aria-label={t('close')}>
            <IconCloseOutline16 size={14} />
          </button>
        </div>
        <SchedulePage useProjection={useProjection} run={run} t={t} />
      </div>
    </div>
  ), document.body)

  return (
    <>
      <Tooltip label={label} delayMs={500} disabled={wide}>
        <button
          ref={trigger}
          type="button"
          className={clsx(css.sidebarBtn, !wide && css.sidebarBtnRail)}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => { setOpen(value => !value) }}
        >
          <IconSchedule16 className={css.sidebarIcon} />
          {wide && <span className={css.sidebarLabel}>{label}</span>}
        </button>
      </Tooltip>
      {overlay}
    </>
  )
}
