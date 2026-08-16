import { describe, expect, it } from 'vitest'
import {
  browserTimeZone,
  buildDailyLine,
  buildDeleteLine,
  buildWeeklyLine,
  padClockTime,
} from '../src/client/when.ts'

describe('calendar command lines', () => {
  it('pads clock time and builds daily, weekly, and delete lines', () => {
    expect(padClockTime('09:00')).toBe('09:00:00')
    expect(padClockTime('09:00:30')).toBe('09:00:30')
    expect(buildDailyLine('  check   the build  ', '09:00', 'Asia/Shanghai'))
      .toBe('/schedule daily 09:00:00 Asia/Shanghai check the build')
    expect(buildWeeklyLine('write report', '09:00', 'UTC', [5, 1, 1]))
      .toBe('/schedule weekly 1,5 09:00:00 UTC write report')
    expect(buildDeleteLine('schedule-1')).toBe('/schedule delete schedule-1')
  })

  it('rejects an empty prompt, clock, or weekday set', () => {
    expect(buildDailyLine('   ', '09:00', 'UTC')).toBeUndefined()
    expect(buildDailyLine('later', '9am', 'UTC')).toBeUndefined()
    expect(buildWeeklyLine('later', '09:00', 'UTC', [])).toBeUndefined()
    expect(buildWeeklyLine('later', '09:00', 'UTC', [0, 8])).toBeUndefined()
  })

  it('reads a browser zone', () => {
    expect(typeof browserTimeZone()).toBe('string')
    expect(browserTimeZone().length).toBeGreaterThan(0)
    const original = Intl.DateTimeFormat
    const stub = function DateTimeFormat() {
      return { resolvedOptions: () => ({ timeZone: '' }) }
    } as unknown as typeof Intl.DateTimeFormat
    Intl.DateTimeFormat = stub
    try {
      expect(browserTimeZone()).toBe('UTC')
    } finally {
      Intl.DateTimeFormat = original
    }
  })
})
