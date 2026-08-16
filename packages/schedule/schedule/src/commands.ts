/**
 * `/schedule` human command over the same create and delete transactions as the tools.
 * @module @deepseek-ai/dsh-schedule
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { executeScheduleCreate, executeScheduleDelete } from './operations.ts'
import type {
  AtInput, DailyInput, ScheduleCreateValue, ScheduleDeleteValue, ScheduleToolError, WeeklyInput,
} from './types.ts'

/** Usage text returned for empty or unrecognised `/schedule` input. */
export const SCHEDULE_COMMAND_USAGE
  = 'Usage: /schedule after <seconds> <prompt>'
    + ' | /schedule at <YYYY-MM-DD> <HH:mm[:ss]> <IANA-zone> <prompt>'
    + ' | /schedule every <seconds> <prompt>'
    + ' | /schedule daily <HH:mm[:ss]> <IANA-zone> <prompt>'
    + ' | /schedule weekly <1-7[,1-7...]> <HH:mm[:ss]> <IANA-zone> <prompt>'
    + ' | /schedule delete <id>'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}(?::\d{2})?$/

/** Parsed `/schedule` input after the command name. */
export type ParsedScheduleCommand =
  | { readonly action: 'help' }
  | { readonly action: 'error'; readonly text: string }
  | { readonly action: 'after'; readonly seconds: number; readonly prompt: string }
  | { readonly action: 'at'; readonly at: AtInput; readonly prompt: string }
  | { readonly action: 'every'; readonly seconds: number; readonly prompt: string }
  | { readonly action: 'daily'; readonly daily: DailyInput; readonly prompt: string }
  | { readonly action: 'weekly'; readonly weekly: WeeklyInput; readonly prompt: string }
  | { readonly action: 'delete'; readonly id: string }

/** Parse a positive safe integer from one command token. */
function parsePositiveInt(token: string): number | undefined {
  if (!/^[1-9]\d*$/.test(token)) return undefined
  const value = Number(token)
  return Number.isSafeInteger(value) ? value : undefined
}

/** Pad `HH:mm` to the local-at `HH:mm:ss` form Schedule accepts. */
function padTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

/**
 * Parse the text after `/schedule`.
 * @param rawInput - Exact text following the command name, including separator whitespace.
 * @returns A structured action, help, or a parser error.
 */
export function parseScheduleCommand(rawInput: string): ParsedScheduleCommand {
  const trimmed = rawInput.trim()
  if (trimmed.length === 0) return { action: 'help' }
  const tokens = trimmed.split(/\s+/)
  const verb = tokens[0]
  if (verb === 'after' || verb === 'every') {
    const delay = tokens[1]
    if (tokens.length < 3 || delay === undefined) {
      return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
    }
    const seconds = parsePositiveInt(delay)
    if (seconds === undefined) {
      return {
        action: 'error',
        text: `${verb} requires a positive whole-number delay in seconds.`,
      }
    }
    const prompt = tokens.slice(2).join(' ')
    return verb === 'after'
      ? { action: 'after', seconds, prompt }
      : { action: 'every', seconds, prompt }
  }
  if (verb === 'at') {
    const date = tokens[1]
    const time = tokens[2]
    const timeZone = tokens[3]
    if (tokens.length < 5 || date === undefined || time === undefined || timeZone === undefined) {
      return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
    }
    if (!DATE.test(date) || !TIME.test(time)) {
      return { action: 'error', text: 'at requires YYYY-MM-DD and HH:mm or HH:mm:ss.' }
    }
    return {
      action: 'at',
      at: { date, time: padTime(time), time_zone: timeZone },
      prompt: tokens.slice(4).join(' '),
    }
  }
  if (verb === 'daily') {
    const time = tokens[1]
    const timeZone = tokens[2]
    if (tokens.length < 4 || time === undefined || timeZone === undefined) {
      return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
    }
    if (!TIME.test(time)) {
      return { action: 'error', text: 'daily requires HH:mm or HH:mm:ss.' }
    }
    return {
      action: 'daily',
      daily: { time: padTime(time), time_zone: timeZone },
      prompt: tokens.slice(3).join(' '),
    }
  }
  if (verb === 'weekly') {
    const weekdaysToken = tokens[1]
    const time = tokens[2]
    const timeZone = tokens[3]
    if (tokens.length < 5 || weekdaysToken === undefined || time === undefined || timeZone === undefined) {
      return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
    }
    if (!TIME.test(time)) {
      return { action: 'error', text: 'weekly requires HH:mm or HH:mm:ss.' }
    }
    const weekdays = weekdaysToken.split(',').map(token => Number(token))
    if (weekdays.some(day => !Number.isSafeInteger(day) || day < 1 || day > 7)) {
      return { action: 'error', text: 'weekly weekdays must be integers from 1 (Monday) through 7 (Sunday).' }
    }
    return {
      action: 'weekly',
      weekly: { time: padTime(time), time_zone: timeZone, weekdays },
      prompt: tokens.slice(4).join(' '),
    }
  }
  if (verb === 'delete') {
    const id = tokens[1]
    if (tokens.length !== 2 || id === undefined) return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
    return { action: 'delete', id }
  }
  return { action: 'error', text: SCHEDULE_COMMAND_USAGE }
}

/** Whether a create or delete value is a closed Schedule error. */
function isScheduleError(
  value: ScheduleCreateValue | ScheduleDeleteValue,
): value is ScheduleToolError {
  return 'code' in value && !('deleted' in value) && !('kind' in value)
}

/** Render one create or delete error as a command result. */
function errorResult(error: ScheduleToolError): CommandResult {
  return { kind: 'error', text: `${error.message} (${error.code})` }
}

/**
 * Fold a create or delete value into a command result.
 * @param value - Transaction result from the shared Schedule operations.
 */
function mutationResult(value: ScheduleCreateValue | ScheduleDeleteValue): CommandResult {
  if (isScheduleError(value)) return errorResult(value)
  if ('deleted' in value) {
    return value.deleted
      ? { kind: 'success', text: `Deleted reminder ${value.id}.` }
      : { kind: 'error', text: `Reminder ${value.id} was not found.` }
  }
  return { kind: 'success', text: `Created reminder ${value.id}.` }
}

/**
 * Register `/schedule` when a command registry is composed.
 * @param commandCtx - Context carrying `ctx.commands`.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param drivers - Live root agents that received a Schedule runtime, mapped to their drive hook.
 * @returns The command registration disposer.
 */
export function registerScheduleCommand(
  commandCtx: Context,
  rootCtx: Context,
  drivers: WeakMap<Agent, () => void>,
): () => void {
  return commandCtx.commands.register({
    name: 'schedule',
    description: 'Set a reminder in this conversation',
    input: { hint: 'after <seconds> <prompt> | at <date> <time> <zone> <prompt> | every <seconds> <prompt> | daily <time> <zone> <prompt> | weekly <weekdays> <time> <zone> <prompt> | delete <id>' },
    handler: async ({ agent, rawInput, signal }) => {
      if (!drivers.has(agent)) {
        return { kind: 'error', text: 'Schedule is not available on this agent.' }
      }
      const parsed = parseScheduleCommand(rawInput)
      const notify = (): void => {
        drivers.get(agent)?.()
      }
      switch (parsed.action) {
        case 'help':
          return { kind: 'success', text: SCHEDULE_COMMAND_USAGE }
        case 'error':
          return { kind: 'error', text: parsed.text }
        case 'after': {
          const value = await executeScheduleCreate(
            rootCtx,
            agent,
            { prompt: parsed.prompt, after_seconds: parsed.seconds },
            signal,
            notify,
          )
          return mutationResult(value)
        }
        case 'every': {
          const value = await executeScheduleCreate(
            rootCtx,
            agent,
            { prompt: parsed.prompt, every_seconds: parsed.seconds },
            signal,
            notify,
          )
          return mutationResult(value)
        }
        case 'at': {
          const value = await executeScheduleCreate(
            rootCtx,
            agent,
            { prompt: parsed.prompt, at: parsed.at },
            signal,
            notify,
          )
          return mutationResult(value)
        }
        case 'daily': {
          const value = await executeScheduleCreate(
            rootCtx,
            agent,
            { prompt: parsed.prompt, daily: parsed.daily },
            signal,
            notify,
          )
          return mutationResult(value)
        }
        case 'weekly': {
          const value = await executeScheduleCreate(
            rootCtx,
            agent,
            { prompt: parsed.prompt, weekly: parsed.weekly },
            signal,
            notify,
          )
          return mutationResult(value)
        }
        case 'delete': {
          const value = await executeScheduleDelete(rootCtx, agent, parsed.id, signal, notify)
          return mutationResult(value)
        }
        /* v8 ignore next 4 -- parseScheduleCommand returns a closed action union. */
        default: {
          const unreachable: never = parsed
          return { kind: 'error', text: `unknown schedule action ${String(unreachable)}` }
        }
      }
    },
  })
}
