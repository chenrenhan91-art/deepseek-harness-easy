/**
 * Agent-scoped Schedule management tools over the durable session fold.
 * @module @deepseek-ai/dsh-schedule
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, InferValue } from '@deepseek-ai/dsh-tools'
import { MIN_EVERY_INTERVAL_SECONDS } from './domain.ts'
import {
  executeScheduleCreate,
  executeScheduleDelete,
  executeScheduleList,
  internalError,
} from './operations.ts'
import type {
  ScheduleDeleteValue,
} from './types.ts'

const SHARED_VIEW_PROPERTIES = {
  id: { type: 'string', required: true },
  prompt: { type: 'string', required: true },
  scheduledAt: { type: 'string', required: true },
  state: { type: 'string', required: true, enum: ['scheduled', 'overdue'] },
  deliveryMode: { type: 'string', required: true, const: 'session-local' },
} as const

const AFTER_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...SHARED_VIEW_PROPERTIES,
    kind: { type: 'string', required: true, const: 'after' },
    afterSeconds: { type: 'integer', required: true },
  },
} as const

const AT_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...SHARED_VIEW_PROPERTIES,
    kind: { type: 'string', required: true, const: 'at' },
  },
} as const

const EVERY_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...SHARED_VIEW_PROPERTIES,
    kind: { type: 'string', required: true, const: 'every' },
    everySeconds: { type: 'integer', required: true },
  },
} as const

const DAILY_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...SHARED_VIEW_PROPERTIES,
    kind: { type: 'string', required: true, const: 'daily' },
    time: { type: 'string', required: true },
    timeZone: { type: 'string', required: true },
  },
} as const

const WEEKLY_VIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...SHARED_VIEW_PROPERTIES,
    kind: { type: 'string', required: true, const: 'weekly' },
    time: { type: 'string', required: true },
    timeZone: { type: 'string', required: true },
    weekdays: { type: 'array', required: true, items: { type: 'integer' } },
  },
} as const

const VIEW_SCHEMA = {
  oneOf: [AFTER_VIEW_SCHEMA, AT_VIEW_SCHEMA, EVERY_VIEW_SCHEMA, DAILY_VIEW_SCHEMA, WEEKLY_VIEW_SCHEMA],
} as const

/** Build one exact two-field error schema while preserving its literal code. */
function basicErrorSchema<const C extends string>(code: C) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      code: { type: 'string', required: true, const: code },
      message: { type: 'string', required: true },
    },
  } as const
}

const BASIC_ERROR_SCHEMAS = [
  basicErrorSchema('invalid_prompt'),
  basicErrorSchema('invalid_selector'),
  basicErrorSchema('invalid_rule'),
  basicErrorSchema('invalid_time_zone'),
  basicErrorSchema('not_future'),
  basicErrorSchema('time_out_of_range'),
  basicErrorSchema('frequency_too_high'),
  basicErrorSchema('corrupt_schedule_log'),
  basicErrorSchema('internal_error'),
] as const

const PERSISTENCE_ERROR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true, const: 'persistence_uncertain' },
    message: { type: 'string', required: true },
    operation: { type: 'string', required: true, enum: ['create', 'list', 'delete'] },
    id: { type: 'string' },
  },
} as const

const ERROR_SCHEMAS = [
  ...BASIC_ERROR_SCHEMAS,
  PERSISTENCE_ERROR_SCHEMA,
] as const

const CREATE_OUTPUT_SCHEMA = { oneOf: [VIEW_SCHEMA, ...ERROR_SCHEMAS] } as const
const LIST_OUTPUT_SCHEMA = {
  oneOf: [
    { type: 'array', items: VIEW_SCHEMA },
    ...ERROR_SCHEMAS,
  ],
} as const
const DELETE_OUTPUT_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', required: true },
        deleted: { type: 'boolean', required: true, const: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', required: true },
        deleted: { type: 'boolean', required: true, const: false },
        code: { type: 'string', required: true, const: 'schedule_not_found' },
      },
    },
    ...ERROR_SCHEMAS,
  ],
} as const

const CREATE_DESCRIPTION =
  'Create one reminder in the current session. Supply a non-empty prompt and exactly one selector: '
  + 'a positive safe-integer after_seconds delay, at as a strict offset date-time or local '
  + `date/time object, safe-integer every_seconds of at least ${MIN_EVERY_INTERVAL_SECONDS}, `
  + 'daily as local clock plus IANA zone, or weekly as local clock, zone, and ISO weekdays '
  + '(Monday = 1 through Sunday = 7). '
  + 'Fixed-rate and calendar reminders skip missed occurrences and batch one latest '
  + 'occurrence per overdue rule. '
  + 'Delivery is session-local: the reminder runs on time only while this session '
  + 'is live and otherwise becomes overdue until the session is resumed.'

const LIST_DESCRIPTION =
  'List every active reminder in the current session in creation order, including its exact id, '
  + 'UTC target, scheduled or overdue state, and session-local delivery mode.'

const DELETE_DESCRIPTION =
  'Delete one active reminder in the current session by the exact id returned by schedule_create '
  + 'or schedule_list. Unknown or already-finished ids return deleted false.'

/** Deterministic model content for every canonical Schedule value. */
function renderValue(_args: unknown, value: unknown): ContentBlock[] {
  // The ToolRuntime has already validated the value against the lossless-JSON output schema.
  const text = JSON.stringify(value)
  return [{ type: 'text', text }]
}

/** Pure generic pending card. */
function present(title: string, kind: 'read' | 'other', rawInput?: unknown): GenericCallView {
  return { card: 'generic', title, kind, ...rawInput === undefined ? {} : { rawInput } }
}

/**
 * Register all three Schedule tools in one exact agent scope.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param toolCtx - Exact agent-scoped context receiving the definitions.
 * @param agent - Exact live owner whose session the tools mutate.
 * @param onDurableChange - Called after every successful preflight and again after a create or actual delete barrier succeeds.
 * @returns Idempotent aggregate disposer for the three registrations.
 */
export function registerScheduleTools(
  rootCtx: Context,
  toolCtx: Context,
  agent: Agent,
  onDurableChange: () => void,
): () => void {
  const disposers: Array<() => void> = []

  /** A projection observer cannot reverse a completed durability barrier. */
  const notifyDurableChange = (): void => {
    try {
      onDurableChange()
    } catch (error: unknown) {
      rootCtx.logger.warn(`schedule: durable-change observer failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  try {
    disposers.push(toolCtx.tools.register(defineTool({
      name: 'schedule_create',
      description: CREATE_DESCRIPTION,
      parameters: {
        prompt: {
          type: 'string',
          required: true,
          description: 'Reminder content to present when the target becomes due.',
        },
        after_seconds: {
          type: 'number',
          description: 'Positive safe-integer delay in seconds.',
        },
        every_seconds: {
          type: 'number',
          description: `Fixed-rate safe-integer interval in seconds, at least ${MIN_EVERY_INTERVAL_SECONDS}.`,
        },
        at: {
          description: 'Absolute target as strict offset RFC 3339 or local date/time with an explicit IANA zone.',
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              additionalProperties: false,
              properties: {
                date: { type: 'string', required: true },
                time: { type: 'string', required: true },
                time_zone: { type: 'string', required: true },
              },
            },
          ],
        },
        daily: {
          description: 'Daily local clock time with an explicit IANA zone.',
          type: 'object',
          additionalProperties: false,
          properties: {
            time: { type: 'string', required: true },
            time_zone: { type: 'string', required: true },
          },
        },
        weekly: {
          description: 'Weekly local clock time, IANA zone, and ISO weekdays (Monday = 1 through Sunday = 7).',
          type: 'object',
          additionalProperties: false,
          properties: {
            time: { type: 'string', required: true },
            time_zone: { type: 'string', required: true },
            weekdays: {
              type: 'array',
              required: true,
              items: { type: 'integer' },
            },
          },
        },
      },
      output: { schema: CREATE_OUTPUT_SCHEMA, render: renderValue },
      async execute(args, exec) {
        if (exec.agent !== agent) return internalError()
        // Frozen weekly `weekdays` is readonly; the output schema infers a mutable array.
        return await executeScheduleCreate(
          rootCtx, agent, args, exec.signal, notifyDurableChange,
        ) as InferValue<typeof CREATE_OUTPUT_SCHEMA>
      },
      presentCall: args => present('Create reminder', 'other', args.prompt),
    })))

    disposers.push(toolCtx.tools.register(defineTool({
      name: 'schedule_list',
      description: LIST_DESCRIPTION,
      parameters: {},
      output: { schema: LIST_OUTPUT_SCHEMA, render: renderValue },
      async execute(_args, exec) {
        if (exec.agent !== agent) return internalError()
        return await executeScheduleList(rootCtx, agent, exec.signal, notifyDurableChange) as InferValue<typeof LIST_OUTPUT_SCHEMA>
      },
      presentCall: () => present('List reminders', 'read'),
    })))

    disposers.push(toolCtx.tools.register(defineTool({
      name: 'schedule_delete',
      description: DELETE_DESCRIPTION,
      parameters: {
        id: { type: 'string', required: true, description: 'Exact session-local schedule id.' },
      },
      output: { schema: DELETE_OUTPUT_SCHEMA, render: renderValue },
      async execute(args, exec): Promise<ScheduleDeleteValue> {
        if (exec.agent !== agent) return internalError()
        return executeScheduleDelete(rootCtx, agent, args.id, exec.signal, notifyDurableChange)
      },
      presentCall: args => present('Delete reminder', 'other', args.id),
    })))
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }

  let active = true
  return () => {
    if (!active) return
    active = false
    for (const dispose of disposers.reverse()) dispose()
  }
}
