/**
 * The `schedule` projection unit: active reminder records folded from
 * `schedule/change`. Wall-clock `scheduled` / `overdue` is not stored.
 * @module @deepseek-ai/dsh-schedule
 */

import { z } from 'zod'
import type { ZodType } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { applyScheduleEvent } from './domain.ts'
import type { FoldedSchedules } from './domain.ts'
import type { ScheduleProjection, ScheduleProjectionItem, ScheduleRecord } from './types.ts'

const EMPTY_FOLD: FoldedSchedules = Object.freeze({
  active: Object.freeze([]),
  seenIds: Object.freeze([]),
})

const itemSchema: ZodType<ScheduleProjectionItem> = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    kind: z.literal('after'),
    prompt: z.string(),
    scheduledAt: z.string(),
    afterSeconds: z.number(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('at'),
    prompt: z.string(),
    scheduledAt: z.string(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('every'),
    prompt: z.string(),
    scheduledAt: z.string(),
    everySeconds: z.number(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('daily'),
    prompt: z.string(),
    scheduledAt: z.string(),
    time: z.string(),
    timeZone: z.string(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('weekly'),
    prompt: z.string(),
    scheduledAt: z.string(),
    time: z.string(),
    timeZone: z.string(),
    weekdays: z.array(z.number()),
  }),
])

const scheduleProjectionSchema: ZodType<ScheduleProjection> = z.object({
  items: z.array(itemSchema),
})

/** Project one durable record to the wire item (no wall-clock state). */
function toItem(record: ScheduleRecord): ScheduleProjectionItem {
  if (record.kind === 'after') {
    return {
      id: record.id,
      kind: 'after',
      prompt: record.prompt,
      scheduledAt: record.scheduledAt,
      afterSeconds: record.afterSeconds,
    }
  }
  if (record.kind === 'every') {
    return {
      id: record.id,
      kind: 'every',
      prompt: record.prompt,
      scheduledAt: record.scheduledAt,
      everySeconds: record.everySeconds,
    }
  }
  if (record.kind === 'daily') {
    return {
      id: record.id,
      kind: 'daily',
      prompt: record.prompt,
      scheduledAt: record.scheduledAt,
      time: record.time,
      timeZone: record.timeZone,
    }
  }
  if (record.kind === 'weekly') {
    return {
      id: record.id,
      kind: 'weekly',
      prompt: record.prompt,
      scheduledAt: record.scheduledAt,
      time: record.time,
      timeZone: record.timeZone,
      weekdays: record.weekdays,
    }
  }
  return {
    id: record.id,
    kind: 'at',
    prompt: record.prompt,
    scheduledAt: record.scheduledAt,
  }
}

/**
 * Projection unit for the `schedule` key. A corrupt `schedule/change` leaves
 * the prior fold in place so one bad event cannot brick the unit.
 */
export const scheduleProjectionDefinition: ProjectionDefinition<'schedule', FoldedSchedules> = {
  key: 'schedule',
  schema: scheduleProjectionSchema,
  init: () => EMPTY_FOLD,
  apply: (state, event) => {
    if (event.type !== 'schedule/change') return state
    try {
      return applyScheduleEvent(state, event)
    } catch {
      // Swallows ScheduleLogError from a corrupt schedule/change. applyScheduleEvent
      // throws only that class; keeping the prior fold stops one bad event
      // from bricking the unit.
      return state
    }
  },
  view: state => ({ items: state.active.map(toItem) }),
  stateVersion: 1,
}
