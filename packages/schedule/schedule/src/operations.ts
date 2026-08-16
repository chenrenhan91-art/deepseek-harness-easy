/**
 * Shared Schedule create and delete transactions used by tools and `/schedule`.
 * @module @deepseek-ai/dsh-schedule
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  allocateScheduleId,
  createAfterScheduleRecord,
  createAtScheduleRecord,
  createDailyScheduleRecord,
  createEveryScheduleRecord,
  createWeeklyScheduleRecord,
  foldScheduleEvents,
  MIN_EVERY_INTERVAL_SECONDS,
  ScheduleId,
  ScheduleInputError,
  ScheduleLogError,
  scheduleView,
} from './domain.ts'
import { flushSchedulePersistence } from './persistence.ts'
import { runScheduleTransaction } from './transaction.ts'
import type {
  AtInput,
  DailyInput,
  PersistenceUncertainError,
  ScheduleCreateValue,
  ScheduleDeleteValue,
  ScheduleId as ScheduleIdType,
  InternalScheduleError,
  ScheduleListValue,
  SchedulePersistenceOperation,
  ScheduleRecord,
  ScheduleToolError,
  WeeklyInput,
} from './types.ts'

/** Arguments accepted by one create transaction. */
export interface ScheduleCreateArgs {
  /** Reminder content; trimmed before validation. */
  readonly prompt: string
  /** Positive safe-integer delay in seconds. */
  readonly after_seconds?: number
  /** Absolute target as offset RFC 3339 or local date/time with a zone. */
  readonly at?: AtInput
  /** Fixed-rate interval in seconds, at least {@link MIN_EVERY_INTERVAL_SECONDS}. */
  readonly every_seconds?: number
  /** Daily local-clock selector. */
  readonly daily?: DailyInput
  /** Weekly local-clock selector. */
  readonly weekly?: WeeklyInput
}

/**
 * Stable error for failures not safe to expose.
 * @returns The closed `internal_error` tool result.
 */
export function internalError(): InternalScheduleError {
  return { code: 'internal_error', message: 'The schedule operation failed.' }
}

/** Placeholder the registry replaces with its canonical ABORTED result after body quiescence. */
function cancellationPlaceholder(signal: AbortSignal): InternalScheduleError | undefined {
  return signal.aborted ? internalError() : undefined
}

/** Serialize one operation, stopping a body whose caller cancelled before its FIFO turn. */
function runCancellableScheduleTransaction<T>(
  agent: Agent,
  signal: AbortSignal,
  task: () => Promise<T>,
): Promise<T | InternalScheduleError> {
  return runScheduleTransaction(agent, async () => {
    const cancelled = cancellationPlaceholder(signal)
    return cancelled ?? task()
  })
}

/** Stable durable-log failure. */
function corruptLogError(): ScheduleToolError {
  return { code: 'corrupt_schedule_log', message: 'The session schedule log is corrupt.' }
}

/** Stable persistence uncertainty with the known operation identity. */
function persistenceError(
  operation: SchedulePersistenceOperation,
  id?: ScheduleIdType,
): PersistenceUncertainError {
  return {
    code: 'persistence_uncertain',
    message: 'Schedule persistence is uncertain; retry with schedule_list before relying on this result.',
    operation,
    ...id === undefined ? {} : { id },
  }
}

/** Translate one contained input failure to the closed tool union. */
function inputError(error: ScheduleInputError): ScheduleToolError {
  return { code: error.code, message: error.message }
}

/** Fold only after a successful preflight, mapping corruption to a stable value. */
function foldForTool(agent: Agent): ReturnType<typeof foldScheduleEvents> | ScheduleToolError {
  try {
    return foldScheduleEvents(agent.session.events, agent.session.header.seedLength ?? 0)
  } catch (error: unknown) {
    return error instanceof ScheduleLogError ? corruptLogError() : internalError()
  }
}

/** Whether a fold attempt produced an error rather than replay state. */
function isToolError(
  value: ReturnType<typeof foldScheduleEvents> | ScheduleToolError,
): value is ScheduleToolError {
  return 'code' in value
}

/** Require one persistence checkpoint without leaking the backend failure. */
async function preflight(
  rootCtx: Context,
  agent: Agent,
  operation: SchedulePersistenceOperation,
  id?: ScheduleIdType,
): Promise<PersistenceUncertainError | undefined> {
  try {
    await flushSchedulePersistence(rootCtx, agent.session)
    return undefined
  } catch {
    return persistenceError(operation, id)
  }
}

/**
 * Validate the v1 selector constraints that the open parameter root cannot express.
 * @param args - Create arguments after JSON parsing.
 * @returns A closed tool error, or undefined when the selector is well-formed.
 */
export function validateCreateArgs(args: ScheduleCreateArgs): ScheduleToolError | undefined {
  const keys = Object.keys(args as unknown as Record<string, unknown>)
  if (keys.some(key => key !== 'prompt'
    && key !== 'after_seconds'
    && key !== 'at'
    && key !== 'every_seconds'
    && key !== 'daily'
    && key !== 'weekly')
    || Number(args.after_seconds !== undefined)
    + Number(args.at !== undefined)
    + Number(args.every_seconds !== undefined)
    + Number(args.daily !== undefined)
    + Number(args.weekly !== undefined) !== 1) {
    return {
      code: 'invalid_selector',
      message: 'schedule_create accepts exactly one of after_seconds, at, every_seconds, daily, or weekly.',
    }
  }
  if (args.prompt.trim().length === 0) {
    return { code: 'invalid_prompt', message: 'prompt must be non-empty after trimming.' }
  }
  if (args.after_seconds !== undefined
    && (!Number.isSafeInteger(args.after_seconds) || args.after_seconds <= 0)) {
    return { code: 'invalid_rule', message: 'after_seconds must be a positive safe integer.' }
  }
  if (args.every_seconds !== undefined && !Number.isSafeInteger(args.every_seconds)) {
    return { code: 'invalid_rule', message: 'every_seconds must be a safe integer.' }
  }
  if (args.every_seconds !== undefined && args.every_seconds < MIN_EVERY_INTERVAL_SECONDS) {
    return {
      code: 'frequency_too_high',
      message: `every_seconds must be at least ${MIN_EVERY_INTERVAL_SECONDS}.`,
    }
  }
  return undefined
}

/**
 * Create one reminder in the agent's session after the shared persistence barrier.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param agent - Exact live owner whose session the create mutates.
 * @param args - Prompt plus exactly one selector.
 * @param signal - Cancellation signal from the tool or command invocation.
 * @param onDurableChange - Called after every successful preflight and again after the create barrier succeeds.
 * @returns The created view or a closed Schedule error.
 */
export async function executeScheduleCreate(
  rootCtx: Context,
  agent: Agent,
  args: ScheduleCreateArgs,
  signal: AbortSignal,
  onDurableChange: () => void,
): Promise<ScheduleCreateValue> {
  const invalid = validateCreateArgs(args)
  if (invalid !== undefined) return invalid
  return runCancellableScheduleTransaction(agent, signal, async () => {
    const uncertain = await preflight(rootCtx, agent, 'create')
    if (uncertain !== undefined) return uncertain
    onDurableChange()
    const folded = foldForTool(agent)
    if (isToolError(folded)) return folded
    const id = allocateScheduleId(folded)
    let record: ScheduleRecord
    try {
      if (args.at !== undefined) {
        record = createAtScheduleRecord(id, args.prompt, args.at, Date.now())
      } else if (args.after_seconds !== undefined) {
        record = createAfterScheduleRecord(id, args.prompt, args.after_seconds, Date.now())
      } else if (args.daily !== undefined) {
        record = createDailyScheduleRecord(id, args.prompt, args.daily, Date.now())
      } else if (args.weekly !== undefined) {
        record = createWeeklyScheduleRecord(id, args.prompt, args.weekly, Date.now())
      } else {
        record = createEveryScheduleRecord(
          id,
          args.prompt,
          args.every_seconds as number,
          Date.now(),
        )
      }
    } catch (error: unknown) {
      return error instanceof ScheduleInputError ? inputError(error) : internalError()
    }
    const cancelledBeforeAppend = cancellationPlaceholder(signal)
    if (cancelledBeforeAppend !== undefined) return cancelledBeforeAppend
    try {
      agent.session.append('schedule/change', {
        version: 1,
        operation: 'create',
        schedule: record,
      })
    } catch {
      return internalError()
    }
    const barrier = await preflight(rootCtx, agent, 'create', id)
    if (barrier !== undefined) return barrier
    onDurableChange()
    return scheduleView(record, Date.now())
  })
}

/**
 * List active reminders after the shared persistence barrier.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param agent - Exact live owner whose session is listed.
 * @param signal - Cancellation signal from the tool invocation.
 * @param onDurableChange - Called after a successful preflight.
 * @returns Active views in create order, or a closed Schedule error.
 */
export async function executeScheduleList(
  rootCtx: Context,
  agent: Agent,
  signal: AbortSignal,
  onDurableChange: () => void,
): Promise<ScheduleListValue> {
  return runCancellableScheduleTransaction(agent, signal, async () => {
    const uncertain = await preflight(rootCtx, agent, 'list')
    if (uncertain !== undefined) return uncertain
    onDurableChange()
    const folded = foldForTool(agent)
    if (isToolError(folded)) return folded
    const now = Date.now()
    return folded.active.map(record => scheduleView(record, now))
  })
}

/**
 * Delete one active reminder after the shared persistence barrier.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param agent - Exact live owner whose session the delete mutates.
 * @param rawId - Exact session-local id; surrounding whitespace is rejected.
 * @param signal - Cancellation signal from the tool or command invocation.
 * @param onDurableChange - Called after every successful preflight and again after an actual delete barrier succeeds.
 * @returns The delete result or a closed Schedule error.
 */
export async function executeScheduleDelete(
  rootCtx: Context,
  agent: Agent,
  rawId: string,
  signal: AbortSignal,
  onDurableChange: () => void,
): Promise<ScheduleDeleteValue> {
  if (rawId.length === 0 || rawId.trim() !== rawId) {
    return { code: 'invalid_rule', message: 'schedule_delete id must be non-empty without surrounding whitespace.' }
  }
  const id = ScheduleId(rawId)
  return runCancellableScheduleTransaction(agent, signal, async () => {
    const uncertain = await preflight(rootCtx, agent, 'delete', id)
    if (uncertain !== undefined) return uncertain
    onDurableChange()
    const folded = foldForTool(agent)
    if (isToolError(folded)) return folded
    if (!folded.active.some(record => record.id === id)) {
      return { id, deleted: false, code: 'schedule_not_found' }
    }
    const cancelledBeforeAppend = cancellationPlaceholder(signal)
    if (cancelledBeforeAppend !== undefined) return cancelledBeforeAppend
    try {
      agent.session.append('schedule/change', { version: 1, operation: 'delete', id })
    } catch {
      return internalError()
    }
    const barrier = await preflight(rootCtx, agent, 'delete', id)
    if (barrier !== undefined) return barrier
    onDurableChange()
    return { id, deleted: true }
  })
}
