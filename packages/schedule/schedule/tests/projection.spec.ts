import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { scheduleProjectionDefinition } from '../src/projection.ts'

function scheduleEvent(data: unknown, seq = 0): SessionEvent {
  return { type: 'schedule/change', seq, time: 1, data } as SessionEvent
}

function afterCreate(id = 'schedule-1') {
  return {
    version: 1,
    operation: 'create',
    schedule: {
      id,
      kind: 'after' as const,
      prompt: 'check logs',
      afterSeconds: 30,
      scheduledAt: '2026-08-05T12:00:00.000Z',
    },
  }
}

function atCreate(id = 'schedule-at') {
  return {
    version: 1,
    operation: 'create',
    schedule: {
      id,
      kind: 'at' as const,
      prompt: 'join meeting',
      scheduledAt: '2026-08-06T01:00:00.000Z',
    },
  }
}

function dailyCreate(id = 'schedule-daily') {
  return {
    version: 1,
    operation: 'create',
    schedule: {
      id,
      kind: 'daily' as const,
      prompt: 'check build',
      time: '09:00:00',
      timeZone: 'UTC',
      scheduledAt: '2026-08-16T09:00:00.000Z',
    },
  }
}

function weeklyCreate(id = 'schedule-weekly') {
  return {
    version: 1,
    operation: 'create',
    schedule: {
      id,
      kind: 'weekly' as const,
      prompt: 'write report',
      time: '09:00:00',
      timeZone: 'UTC',
      weekdays: [1, 5],
      scheduledAt: '2026-08-17T09:00:00.000Z',
    },
  }
}

function everyCreate(id = 'schedule-every') {
  return {
    version: 1,
    operation: 'create',
    schedule: {
      id,
      kind: 'every' as const,
      prompt: 'check metrics',
      everySeconds: 300,
      scheduledAt: '2026-08-05T12:05:00.000Z',
    },
  }
}

describe('schedule projection unit', () => {
  it('starts empty and ignores unrelated events by reference', () => {
    const initial = scheduleProjectionDefinition.init()
    expect(scheduleProjectionDefinition.view(initial)).toEqual({ items: [] })
    const other = { type: 'user/message', seq: 0, time: 1, data: {} } as SessionEvent
    expect(scheduleProjectionDefinition.apply(initial, other)).toBe(initial)
  })

  it('projects after, at, and every creates, then delete and one-shot dispatch', () => {
    let state = scheduleProjectionDefinition.init()
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(afterCreate()))
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(atCreate()))
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(everyCreate()))
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(dailyCreate()))
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(weeklyCreate()))
    expect(scheduleProjectionDefinition.view(state)).toEqual({
      items: [
        {
          id: 'schedule-1',
          kind: 'after',
          prompt: 'check logs',
          scheduledAt: '2026-08-05T12:00:00.000Z',
          afterSeconds: 30,
        },
        {
          id: 'schedule-at',
          kind: 'at',
          prompt: 'join meeting',
          scheduledAt: '2026-08-06T01:00:00.000Z',
        },
        {
          id: 'schedule-every',
          kind: 'every',
          prompt: 'check metrics',
          scheduledAt: '2026-08-05T12:05:00.000Z',
          everySeconds: 300,
        },
        {
          id: 'schedule-daily',
          kind: 'daily',
          prompt: 'check build',
          scheduledAt: '2026-08-16T09:00:00.000Z',
          time: '09:00:00',
          timeZone: 'UTC',
        },
        {
          id: 'schedule-weekly',
          kind: 'weekly',
          prompt: 'write report',
          scheduledAt: '2026-08-17T09:00:00.000Z',
          time: '09:00:00',
          timeZone: 'UTC',
          weekdays: [1, 5],
        },
      ],
    })

    state = scheduleProjectionDefinition.apply(
      state,
      scheduleEvent({ version: 1, operation: 'delete', id: 'schedule-at' }),
    )
    state = scheduleProjectionDefinition.apply(
      state,
      scheduleEvent({ version: 1, operation: 'dispatch', id: 'schedule-1' }),
    )
    expect(scheduleProjectionDefinition.view(state).items.map(item => item.id))
      .toEqual(['schedule-every', 'schedule-daily', 'schedule-weekly'])
  })

  it('advances an Every record on dispatch and keeps a corrupt event from replacing the fold', () => {
    let state = scheduleProjectionDefinition.init()
    state = scheduleProjectionDefinition.apply(state, scheduleEvent(everyCreate()))
    const advanced = scheduleProjectionDefinition.apply(state, scheduleEvent({
      version: 1,
      operation: 'dispatch',
      id: 'schedule-every',
      acceptedAt: '2026-08-05T12:05:00.000Z',
    }))
    expect(scheduleProjectionDefinition.view(advanced).items[0]?.scheduledAt)
      .not.toBe('2026-08-05T12:05:00.000Z')

    const corrupt = scheduleProjectionDefinition.apply(
      advanced,
      scheduleEvent({ version: 1, operation: 'delete', id: 'missing' }),
    )
    expect(corrupt).toBe(advanced)
  })

  it('accepts the projected wire value', () => {
    const parsed = scheduleProjectionDefinition.schema.safeParse({
      items: [{
        id: 'schedule-1',
        kind: 'after',
        prompt: 'x',
        scheduledAt: '2026-08-05T12:00:00.000Z',
        afterSeconds: 60,
      }],
    })
    expect(parsed.success).toBe(true)
    expect(scheduleProjectionDefinition.schema.safeParse({
      items: [{
        id: 'schedule-daily',
        kind: 'daily',
        prompt: 'x',
        scheduledAt: '2026-08-16T09:00:00.000Z',
        time: '09:00:00',
        timeZone: 'UTC',
      }],
    }).success).toBe(true)
    expect(scheduleProjectionDefinition.schema.safeParse({
      items: [{
        id: 'schedule-weekly',
        kind: 'weekly',
        prompt: 'x',
        scheduledAt: '2026-08-17T09:00:00.000Z',
        time: '09:00:00',
        timeZone: 'UTC',
        weekdays: [1],
      }],
    }).success).toBe(true)
  })
})
