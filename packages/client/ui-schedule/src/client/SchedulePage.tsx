/**
 * Beginner calendar schedule form and list. Daily and weekly local-clock
 * rules only; one-shot and `every_seconds` records stay off this page.
 */
import { useCallback, useRef, useState } from 'react'
import clsx from 'clsx'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UseProjection } from '@deepseek-ai/dsh-client-runtime/client'
import type { ScheduleProjectionItem } from '@deepseek-ai/dsh-schedule/client'
import type { ScheduleActions } from './index.ts'
import type { ScheduleKey } from './locales.ts'
import { browserTimeZone, buildDailyLine, buildDeleteLine, buildWeeklyLine } from './when.ts'
import css from './ScheduleCard.module.css'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
const WEEKDAY_KEYS = {
  1: 'weekday.1',
  2: 'weekday.2',
  3: 'weekday.3',
  4: 'weekday.4',
  5: 'weekday.5',
  6: 'weekday.6',
  7: 'weekday.7',
} as const satisfies Record<number, ScheduleKey>

/** Clock glyph for the sidebar action. */
export function IconSchedule16({ className }: { className?: string | undefined }) {
  return (
    <svg width={16} height={16} className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.35a6.65 6.65 0 1 0 0 13.3 6.65 6.65 0 0 0 0-13.3ZM2.65 8a5.35 5.35 0 1 1 10.7 0 5.35 5.35 0 0 1-10.7 0Zm5.7-3.2v3.02l2.12 1.22-.62 1.08L7.05 8.6V4.8h1.3Z"
      />
    </svg>
  )
}

/** Page props: projection kit plus `/schedule` runner and locale. */
export type SchedulePageProps =
  & { useProjection: UseProjection }
  & InjectFace<ScheduleActions>
  & PropsLocale<'schedule'>

function clockLabel(time: string): string {
  return time.slice(0, 5)
}

function isWeekdays(weekdays: readonly number[]): boolean {
  return weekdays.length === 5 && weekdays.every((day, index) => day === index + 1)
}

function itemRuleLabel(
  item: Extract<ScheduleProjectionItem, { kind: 'daily' | 'weekly' }>,
  t: SchedulePageProps['t'],
): string {
  const time = clockLabel(item.time)
  if (item.kind === 'daily') return t('item.daily', { time })
  if (item.weekdays.length === 7) return t('item.weeklyAll', { time })
  if (isWeekdays(item.weekdays)) return t('item.weekdays', { time })
  const days = item.weekdays.map(day => t(WEEKDAY_KEYS[day as keyof typeof WEEKDAY_KEYS])).join('')
  return t('item.weeklyDays', { days, time })
}

function nextLabel(scheduledAt: string, now: number, t: SchedulePageProps['t']): string {
  const delta = Date.parse(scheduledAt) - now
  if (delta <= 0) return t('item.overdue')
  const minutes = Math.max(1, Math.round(delta / 60_000))
  if (minutes < 60) return t('item.inMinutes', { minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 48) return t('item.inHours', { hours })
  return t('item.inDays', { days: Math.round(hours / 24) })
}

/**
 * Calendar create form and the active daily/weekly list.
 * @param props - projection reader, `/schedule` runner, and locale.
 * @returns the page body.
 */
export function SchedulePage({ useProjection, run, t }: SchedulePageProps) {
  const projection = useProjection('schedule')
  const [prompt, setPrompt] = useState('')
  const [repeat, setRepeat] = useState<'daily' | 'weekly'>('daily')
  const [weekdays, setWeekdays] = useState<readonly number[]>([1, 2, 3, 4, 5])
  const [time, setTime] = useState('09:00')
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const line = repeat === 'daily'
    ? buildDailyLine(prompt, time, browserTimeZone())
    : buildWeeklyLine(prompt, time, browserTimeZone(), weekdays)
  const canSubmit = projection !== undefined && line !== undefined

  const submit = useCallback(async () => {
    /* v8 ignore next -- Start is disabled until the line is complete. */
    if (line === undefined || pendingRef.current) return
    pendingRef.current = true
    setError(null)
    try {
      const failure = await run(line)
      if (failure !== null) {
        setError(failure)
        return
      }
      setPrompt('')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      pendingRef.current = false
    }
  }, [line, run])

  const cancel = useCallback(async (id: string) => {
    /* v8 ignore next -- overlapping clicks share one in-flight run. */
    if (pendingRef.current) return
    pendingRef.current = true
    setError(null)
    try {
      const failure = await run(buildDeleteLine(id))
      if (failure !== null) setError(failure)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      pendingRef.current = false
    }
  }, [run])

  const toggleDay = (day: number) => {
    setWeekdays(current => (
      current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort((a, b) => a - b)
    ))
  }

  const items = (projection?.items ?? []).filter(
    (item): item is Extract<ScheduleProjectionItem, { kind: 'daily' | 'weekly' }> =>
      item.kind === 'daily' || item.kind === 'weekly',
  )
  const now = Date.now()

  return (
    <div className={css.page} data-schedule-page>
      <p className={css.helper}>{projection === undefined ? t('needWorkspace') : t('helper')}</p>

      <div className={css.field}>
        <label className={css.label} htmlFor="dsh-schedule-prompt">{t('prompt.label')}</label>
        <textarea
          id="dsh-schedule-prompt"
          className={css.textarea}
          value={prompt}
          placeholder={t('prompt.placeholder')}
          disabled={projection === undefined}
          rows={4}
          onChange={(event) => { setPrompt(event.target.value) }}
        />
      </div>

      <div className={css.field}>
        <div className={css.label} id="dsh-schedule-repeat">{t('repeat.label')}</div>
        <div className={css.chips} role="group" aria-labelledby="dsh-schedule-repeat">
          <button
            type="button"
            className={clsx(css.chip, repeat === 'daily' && css.chipSelected)}
            aria-pressed={repeat === 'daily'}
            disabled={projection === undefined}
            onClick={() => { setRepeat('daily') }}
          >
            {t('repeat.daily')}
          </button>
          <button
            type="button"
            className={clsx(css.chip, repeat === 'weekly' && css.chipSelected)}
            aria-pressed={repeat === 'weekly'}
            disabled={projection === undefined}
            onClick={() => { setRepeat('weekly') }}
          >
            {t('repeat.weekly')}
          </button>
        </div>
        {repeat === 'weekly' && (
          <div className={css.chips} role="group" aria-label={t('repeat.weekly')}>
            {WEEKDAYS.map(day => (
              <button
                key={day}
                type="button"
                className={clsx(css.chip, weekdays.includes(day) && css.chipSelected)}
                aria-pressed={weekdays.includes(day)}
                disabled={projection === undefined}
                onClick={() => { toggleDay(day) }}
              >
                {t(WEEKDAY_KEYS[day])}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className={css.field}>
        <span className={css.label}>{t('time.label')}</span>
        <input
          type="time"
          className={css.timeInput}
          value={time}
          disabled={projection === undefined}
          onChange={(event) => { setTime(event.target.value) }}
        />
      </label>

      <div className={css.actions}>
        <Button
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          onClick={() => { void submit() }}
        >
          {t('submit')}
        </Button>
      </div>

      {error !== null && <p className={css.error} role="status">{error}</p>}

      {items.length > 0 && (
        <ul className={css.list}>
          <li className={css.listTitle}>{t('list.title')}</li>
          {items.map(item => (
            <li key={item.id} className={css.item}>
              <div className={css.itemBody}>
                <div className={css.itemPrompt}>{item.prompt}</div>
                <div className={clsx(css.itemWhen, Date.parse(item.scheduledAt) <= now && css.overdue)}>
                  {itemRuleLabel(item, t)}
                  {' · '}
                  {nextLabel(item.scheduledAt, now, t)}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { void cancel(item.id) }}>
                {t('item.cancel')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
