/**
 * Durable and model-facing Schedule value types.
 * @module @deepseek-ai/dsh-schedule
 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type {} from '@deepseek-ai/dsh-session/types'

/** Stable reminder identity that is unique and never reused within one session. */
export type ScheduleId = Branded<'ScheduleId'>

/** Durable one-shot reminder created from a positive delay. */
export interface AfterScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a delayed one-shot reminder. */
  readonly kind: 'after'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Positive safe-integer delay accepted at creation. */
  readonly afterSeconds: number
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}

/** Durable one-shot reminder created from an absolute instant. */
export interface AtScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for an absolute one-shot reminder. */
  readonly kind: 'at'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}

/** Durable fixed-rate reminder whose next target remains creation-anchor-aligned. */
export interface EveryScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a fixed-rate recurring reminder. */
  readonly kind: 'every'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Fixed safe-integer interval, never below five minutes. */
  readonly everySeconds: number
  /** Earliest anchor-aligned occurrence not yet dispatched. */
  readonly scheduledAt: string
}

/** Durable daily reminder at a local clock time in an explicit IANA zone. */
export interface DailyScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a daily local-clock reminder. */
  readonly kind: 'daily'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Local wall-clock time `HH:mm:ss`. */
  readonly time: string
  /** Canonical UTC or IANA Area/Location zone. */
  readonly timeZone: string
  /** Next local-clock occurrence not yet dispatched, as UTC. */
  readonly scheduledAt: string
}

/** Durable weekly reminder at a local clock time on selected ISO weekdays. */
export interface WeeklyScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a weekly local-clock reminder. */
  readonly kind: 'weekly'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Local wall-clock time `HH:mm:ss`. */
  readonly time: string
  /** Canonical UTC or IANA Area/Location zone. */
  readonly timeZone: string
  /** Sorted unique ISO weekdays, Monday = 1 through Sunday = 7. */
  readonly weekdays: readonly number[]
  /** Next matching local-clock occurrence not yet dispatched, as UTC. */
  readonly scheduledAt: string
}

/** Local daily selector accepted by `schedule_create`. */
export interface DailyInput {
  /** Local wall-clock time `HH:mm` or `HH:mm:ss`. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}

/** Local weekly selector accepted by `schedule_create`. */
export interface WeeklyInput {
  /** Local wall-clock time `HH:mm` or `HH:mm:ss`. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
  /** ISO weekdays, Monday = 1 through Sunday = 7. */
  readonly weekdays: readonly number[]
}

/** Structured local-calendar input accepted by `schedule_create`. */
export interface LocalAtInput {
  /** Four-digit ISO calendar date. */
  readonly date: string
  /** Local wall-clock time with optional one-to-three digit milliseconds. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}

/** Absolute selector accepted by `schedule_create`. */
export type AtInput = string | LocalAtInput

/** One-shot record variants that terminate on an id-only dispatch. */
export type OneShotScheduleRecord = AfterScheduleRecord | AtScheduleRecord

/** Recurring record variants that dispatch with `acceptedAt` and stay active. */
export type RecurringScheduleRecord = EveryScheduleRecord | DailyScheduleRecord | WeeklyScheduleRecord

/** The v1 durable reminder record union. */
export type ScheduleRecord = OneShotScheduleRecord | RecurringScheduleRecord

/** Creates one durable reminder record. */
export interface ScheduleCreateChange {
  readonly version: 1
  readonly operation: 'create'
  readonly schedule: ScheduleRecord
}

/** Deletes one currently active reminder. */
export interface ScheduleDeleteChange {
  readonly version: 1
  readonly operation: 'delete'
  readonly id: ScheduleId
}

/** Records that one active one-shot reminder entered the durable dispatch history. */
export interface OneShotScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
}

/** Records one recurring decision and advances directly past missed occurrences. */
export interface EveryScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
  /** Wall-clock decision time used to select the latest due occurrence. */
  readonly acceptedAt: string
}

/** Durable dispatch shapes supported by the current rule set. */
export type ScheduleDispatchChange = OneShotScheduleDispatchChange | EveryScheduleDispatchChange

/** Strict version-1 durable Schedule mutation union. */
export type ScheduleChange = ScheduleCreateChange | ScheduleDeleteChange | ScheduleDispatchChange

/** Current delivery timing derived from the durable record and wall clock. */
export type ScheduleState = 'scheduled' | 'overdue'

/** Fixed v1 delivery boundary: the original session must be live. */
export type ScheduleDeliveryMode = 'session-local'

/** Complete model-facing view of one active reminder. */
export type ScheduleView = ScheduleRecord & {
  /** Whether the target remains in the future. */
  readonly state: ScheduleState
  /** Reminder delivery never leaves the owning session. */
  readonly deliveryMode: ScheduleDeliveryMode
}

/** Management operations whose persistence barrier may be uncertain. */
export type SchedulePersistenceOperation = 'create' | 'list' | 'delete'

/** Stable error returned for an empty reminder prompt. */
export interface InvalidPromptError {
  readonly code: 'invalid_prompt'
  readonly message: string
}

/** Stable error returned for a missing, conflicting, or unsupported rule selector. */
export interface InvalidSelectorError {
  readonly code: 'invalid_selector'
  readonly message: string
}

/** Stable error returned for an invalid rule or management argument. */
export interface InvalidRuleError {
  readonly code: 'invalid_rule'
  readonly message: string
}

/** Stable error returned for an invalid or unsupported IANA time zone. */
export interface InvalidTimeZoneError {
  readonly code: 'invalid_time_zone'
  readonly message: string
}

/** Stable error returned when an absolute target is not strictly future. */
export interface NotFutureError {
  readonly code: 'not_future'
  readonly message: string
}

/** Stable error returned when the computed instant cannot use a four-digit UTC year. */
export interface TimeOutOfRangeError {
  readonly code: 'time_out_of_range'
  readonly message: string
}

/** Stable error returned when a fixed-rate rule runs more often than supported. */
export interface FrequencyTooHighError {
  readonly code: 'frequency_too_high'
  readonly message: string
}

/** Stable error returned when the durable Schedule stream is malformed. */
export interface CorruptScheduleLogError {
  readonly code: 'corrupt_schedule_log'
  readonly message: string
}

/** Stable error returned when a required persistence checkpoint did not complete. */
export interface PersistenceUncertainError {
  readonly code: 'persistence_uncertain'
  readonly message: string
  readonly operation: SchedulePersistenceOperation
  readonly id?: ScheduleId
}

/** Stable fallback that does not disclose an internal exception. */
export interface InternalScheduleError {
  readonly code: 'internal_error'
  readonly message: string
}

/** Closed v1 Schedule management error union. */
export type ScheduleToolError =
  | InvalidPromptError
  | InvalidSelectorError
  | InvalidRuleError
  | InvalidTimeZoneError
  | NotFutureError
  | TimeOutOfRangeError
  | FrequencyTooHighError
  | CorruptScheduleLogError
  | PersistenceUncertainError
  | InternalScheduleError

/** Canonical `schedule_create` value. */
export type ScheduleCreateValue = ScheduleView | ScheduleToolError

/** Canonical `schedule_list` value. */
export type ScheduleListValue = ScheduleView[] | ScheduleToolError

/** Successful `schedule_delete` value, including the non-mutating not-found result. */
export type ScheduleDeleteResult =
  | { readonly id: ScheduleId; readonly deleted: true }
  | { readonly id: ScheduleId; readonly deleted: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_delete` value. */
export type ScheduleDeleteValue = ScheduleDeleteResult | ScheduleToolError

/** One active reminder in the `schedule` projection, without wall-clock state. */
export type ScheduleProjectionItem =
  | {
    readonly id: string
    readonly kind: 'after'
    readonly prompt: string
    readonly scheduledAt: string
    readonly afterSeconds: number
  }
  | {
    readonly id: string
    readonly kind: 'at'
    readonly prompt: string
    readonly scheduledAt: string
  }
  | {
    readonly id: string
    readonly kind: 'every'
    readonly prompt: string
    readonly scheduledAt: string
    readonly everySeconds: number
  }
  | {
    readonly id: string
    readonly kind: 'daily'
    readonly prompt: string
    readonly scheduledAt: string
    readonly time: string
    readonly timeZone: string
  }
  | {
    readonly id: string
    readonly kind: 'weekly'
    readonly prompt: string
    readonly scheduledAt: string
    readonly time: string
    readonly timeZone: string
    readonly weekdays: readonly number[]
  }

/**
 * Session-local reminder list folded from `schedule/change`. Capability
 * absence is the key's absence, never an empty value. `scheduled` / `overdue`
 * stay a wall-clock read in the UI, not a durable field.
 */
export interface ScheduleProjection {
  /** Active records in create order. */
  readonly items: readonly ScheduleProjectionItem[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Active Session-local reminders folded from `schedule/change`. */
    schedule: ScheduleProjection
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Versioned Schedule mutation. The owning package validates the complete
     * session-local transition stream before accepting a candidate event.
     */
    'schedule/change': ScheduleChange
  }
}
