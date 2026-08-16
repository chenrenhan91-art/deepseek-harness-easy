import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  ScheduleId,
  ScheduleInputError,
  ScheduleLogError,
  createDailyScheduleRecord,
  createWeeklyScheduleRecord,
  decodeScheduleChange,
  foldScheduleEvents,
  nextCalendarOccurrence,
  resolveCalendarOccurrence,
} from '../src/domain.ts'

function scheduleEvent(data: unknown, seq = 0): SessionEvent {
  return { type: 'schedule/change', seq, time: 1, data } as SessionEvent
}

const now = Date.parse('2026-08-15T00:00:00.000Z')

describe('calendar daily and weekly records', () => {
  it('creates the next daily local-clock occurrence after now', () => {
    const record = createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      '  check build  ',
      { time: '09:00', time_zone: 'Asia/Shanghai' },
      Date.parse('2026-08-15T00:59:00.000Z'),
    )
    expect(record).toEqual({
      id: 'schedule-1',
      kind: 'daily',
      prompt: 'check build',
      time: '09:00:00',
      timeZone: 'Asia/Shanghai',
      scheduledAt: '2026-08-15T01:00:00.000Z',
    })
    const later = createDailyScheduleRecord(
      ScheduleId('schedule-2'),
      'check build',
      { time: '09:00:00', time_zone: 'Asia/Shanghai' },
      Date.parse('2026-08-15T01:00:00.000Z'),
    )
    expect(later.scheduledAt).toBe('2026-08-16T01:00:00.000Z')
  })

  it('creates the next weekly occurrence on the selected ISO weekday', () => {
    const record = createWeeklyScheduleRecord(
      ScheduleId('schedule-1'),
      'write report',
      { time: '09:00', time_zone: 'UTC', weekdays: [5, 1, 1] },
      now,
    )
    expect(record.weekdays).toEqual([1, 5])
    expect(record.scheduledAt).toBe('2026-08-17T09:00:00.000Z')
  })

  it('skips a DST spring-forward gap to the next valid local clock', () => {
    const record = createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      'gap',
      { time: '02:30', time_zone: 'America/New_York' },
      Date.parse('2026-03-08T06:00:00.000Z'),
    )
    expect(record.scheduledAt).toBe('2026-03-09T06:30:00.000Z')
  })

  it('catch-up keeps only the latest due occurrence', () => {
    const record = createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      'check',
      { time: '09:00', time_zone: 'Asia/Shanghai' },
      Date.parse('2026-08-01T00:00:00.000Z'),
    )
    const resolved = resolveCalendarOccurrence(record, Date.parse('2026-08-10T12:00:00.000Z'))
    expect(resolved.occurrenceAt).toBe('2026-08-10T01:00:00.000Z')
    expect(resolved.nextScheduledAt).toBe('2026-08-11T01:00:00.000Z')
  })

  it('decodes, folds, and advances daily and weekly dispatches', () => {
    const daily = createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      'check',
      { time: '09:00', time_zone: 'UTC' },
      now,
    )
    const weekly = createWeeklyScheduleRecord(
      ScheduleId('schedule-2'),
      'report',
      { time: '09:00', time_zone: 'UTC', weekdays: [1] },
      now,
    )
    expect(decodeScheduleChange({ version: 1, operation: 'create', schedule: daily }))
      .toEqual({ version: 1, operation: 'create', schedule: daily })
    expect(decodeScheduleChange({ version: 1, operation: 'create', schedule: weekly }))
      .toEqual({ version: 1, operation: 'create', schedule: weekly })
    expect(foldScheduleEvents([
      scheduleEvent({ version: 1, operation: 'create', schedule: daily }),
      scheduleEvent({
        version: 1,
        operation: 'dispatch',
        id: 'schedule-1',
        acceptedAt: '2026-08-16T10:00:00.000Z',
      }, 1),
    ]).active).toEqual([
      expect.objectContaining({ id: 'schedule-1', kind: 'daily', scheduledAt: '2026-08-17T09:00:00.000Z' }),
    ])
    expect(foldScheduleEvents([
      scheduleEvent({ version: 1, operation: 'create', schedule: weekly }, 0),
      scheduleEvent({
        version: 1,
        operation: 'dispatch',
        id: 'schedule-2',
        acceptedAt: '2026-08-17T10:00:00.000Z',
      }, 1),
    ]).active).toEqual([
      expect.objectContaining({ id: 'schedule-2', kind: 'weekly', scheduledAt: '2026-08-24T09:00:00.000Z' }),
    ])
    expect(() => foldScheduleEvents([
      scheduleEvent({ version: 1, operation: 'create', schedule: daily }),
      scheduleEvent({ version: 1, operation: 'dispatch', id: 'schedule-1' }, 1),
    ])).toThrow(/must contain acceptedAt/)
  })

  it('rejects invalid calendar create input', () => {
    const daily = (input: unknown, prompt = 'x') => createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      prompt,
      input as { time: string; time_zone: string },
      now,
    )
    const weekly = (input: unknown, prompt = 'x') => createWeeklyScheduleRecord(
      ScheduleId('schedule-1'),
      prompt,
      input as { time: string; time_zone: string; weekdays: readonly number[] },
      now,
    )
    expect(() => daily({ time: '09:00', time_zone: 'UTC', extra: true })).toThrow(ScheduleInputError)
    expect(() => daily({ time: '09:00', time_zone: 'UTC' }, '  ')).toThrow(ScheduleInputError)
    expect(() => daily({ time: 9, time_zone: 'UTC' })).toThrow(ScheduleInputError)
    expect(() => daily({ time: 'nope', time_zone: 'UTC' })).toThrow(ScheduleInputError)
    expect(() => daily({ time: '09:60', time_zone: 'UTC' })).toThrow(ScheduleInputError)
    expect(() => daily({ time: '09:00', time_zone: 1 })).toThrow(ScheduleInputError)
    expect(() => weekly({ time: '09:00', time_zone: 'UTC' })).toThrow(ScheduleInputError)
    expect(() => weekly({ time: '09:00', time_zone: 'UTC', weekdays: [] })).toThrow(ScheduleInputError)
    expect(() => weekly({ time: '09:00', time_zone: 'UTC', weekdays: ['1'] })).toThrow(ScheduleInputError)
    expect(() => weekly({ time: '09:00', time_zone: 'UTC', weekdays: [8] })).toThrow(ScheduleInputError)
  })

  it('rejects malformed durable calendar records', () => {
    const daily = {
      id: 'schedule-1',
      kind: 'daily',
      prompt: 'x',
      time: '09:00:00',
      timeZone: 'UTC',
      scheduledAt: '2026-08-16T09:00:00.000Z',
    }
    const weekly = {
      id: 'schedule-2',
      kind: 'weekly',
      prompt: 'x',
      time: '09:00:00',
      timeZone: 'UTC',
      weekdays: [1],
      scheduledAt: '2026-08-17T09:00:00.000Z',
    }
    const cases: unknown[] = [
      { ...daily, extra: true },
      { ...daily, prompt: ' ' },
      { ...daily, time: 9 },
      { ...daily, time: '09:00' },
      { ...daily, time: '99:00:00' },
      { ...daily, timeZone: 1 },
      { ...daily, timeZone: 'NotAZone' },
      { ...daily, timeZone: 'utc' },
      { ...daily, timeZone: 'US/Eastern' },
      { ...weekly, extra: true },
      { ...weekly, prompt: ' ' },
      { ...weekly, timeZone: 1 },
      { ...weekly, timeZone: 'NotAZone' },
      { ...weekly, timeZone: 'utc' },
      { ...weekly, timeZone: 'US/Eastern' },
      { ...weekly, weekdays: [] },
      { ...weekly, weekdays: 1 },
      { ...weekly, weekdays: [0] },
      { ...weekly, weekdays: [2, 1] },
      { ...weekly, weekdays: [1, 1] },
      { id: 'schedule-3', kind: 'later', prompt: 'x', scheduledAt: daily.scheduledAt },
    ]
    for (const schedule of cases) {
      expect(() => decodeScheduleChange({ version: 1, operation: 'create', schedule }))
        .toThrow(ScheduleLogError)
    }
  })

  it('rejects calendar dispatch arithmetic that is not due', () => {
    const record = createDailyScheduleRecord(
      ScheduleId('schedule-1'),
      'check',
      { time: '09:00', time_zone: 'UTC' },
      now,
    )
    expect(() => resolveCalendarOccurrence(record, Number.NaN)).toThrow(ScheduleLogError)
    expect(() => resolveCalendarOccurrence(record, Date.parse(record.scheduledAt) - 1))
      .toThrow(ScheduleLogError)
    const weekly = createWeeklyScheduleRecord(
      ScheduleId('schedule-2'),
      'report',
      { time: '09:00', time_zone: 'UTC', weekdays: [1] },
      now,
    )
    expect(resolveCalendarOccurrence(weekly, Date.parse(weekly.scheduledAt)).nextScheduledAt)
      .toBe('2026-08-24T09:00:00.000Z')
    const final = { ...record, scheduledAt: '9999-12-31T09:00:00.000Z' }
    expect(resolveCalendarOccurrence(final, Date.parse(final.scheduledAt))).toEqual({
      occurrenceAt: final.scheduledAt,
    })
    expect(() => resolveCalendarOccurrence({
      ...weekly,
      weekdays: Object.freeze([]),
    }, Date.parse(weekly.scheduledAt))).toThrow(ScheduleLogError)
  })

  it('walks off an impossible weekday filter rather than looping forever', () => {
    expect(() => nextCalendarOccurrence(now, '09:00:00', 'UTC', [])).toThrow(ScheduleInputError)
  })
})
