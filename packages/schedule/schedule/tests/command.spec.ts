import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { agentEvents } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as toolSchedule from '../src/index.ts'
import {
  parseScheduleCommand,
  SCHEDULE_COMMAND_USAGE,
} from '../src/commands.ts'

class PersistenceProbe extends Service {
  constructor(ctx: Context) {
    super(ctx, 'sessionPersistence')
  }
}

async function harness(withCommands = true): Promise<Context> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(PersistenceProbe)
  ctx.on('session/flush', () => {})
  if (withCommands) await ctx.plugin(CommandRuntime)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(toolSchedule)
  await new Promise(resolve => setImmediate(resolve))
  return ctx
}

describe('parseScheduleCommand', () => {
  it('returns help for empty input and usage for unknown verbs', () => {
    expect(parseScheduleCommand('')).toEqual({ action: 'help' })
    expect(parseScheduleCommand('   ')).toEqual({ action: 'help' })
    expect(parseScheduleCommand('list')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('after')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('delete')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('delete one two')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('at 2026-08-16')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('daily')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
    expect(parseScheduleCommand('weekly 1')).toEqual({ action: 'error', text: SCHEDULE_COMMAND_USAGE })
  })

  it('parses after, every, padded at, and delete', () => {
    expect(parseScheduleCommand('after 600 check the build')).toEqual({
      action: 'after',
      seconds: 600,
      prompt: 'check the build',
    })
    expect(parseScheduleCommand('every 1800 refresh status')).toEqual({
      action: 'every',
      seconds: 1800,
      prompt: 'refresh status',
    })
    expect(parseScheduleCommand('at 2026-08-16 20:00 Asia/Shanghai write the report')).toEqual({
      action: 'at',
      at: { date: '2026-08-16', time: '20:00:00', time_zone: 'Asia/Shanghai' },
      prompt: 'write the report',
    })
    expect(parseScheduleCommand('at 2026-08-16 20:00:30 UTC later')).toEqual({
      action: 'at',
      at: { date: '2026-08-16', time: '20:00:30', time_zone: 'UTC' },
      prompt: 'later',
    })
    expect(parseScheduleCommand('daily 09:00 Asia/Shanghai check the build')).toEqual({
      action: 'daily',
      daily: { time: '09:00:00', time_zone: 'Asia/Shanghai' },
      prompt: 'check the build',
    })
    expect(parseScheduleCommand('weekly 1,2,3,4,5 09:00 UTC write the report')).toEqual({
      action: 'weekly',
      weekly: { time: '09:00:00', time_zone: 'UTC', weekdays: [1, 2, 3, 4, 5] },
      prompt: 'write the report',
    })
    expect(parseScheduleCommand('delete schedule-1')).toEqual({
      action: 'delete',
      id: 'schedule-1',
    })
  })

  it('rejects non-positive delays and malformed calendar tokens', () => {
    expect(parseScheduleCommand('after 0 soon')).toEqual({
      action: 'error',
      text: 'after requires a positive whole-number delay in seconds.',
    })
    expect(parseScheduleCommand('every abc later')).toEqual({
      action: 'error',
      text: 'every requires a positive whole-number delay in seconds.',
    })
    expect(parseScheduleCommand('after 9007199254740992 later')).toEqual({
      action: 'error',
      text: 'after requires a positive whole-number delay in seconds.',
    })
    expect(parseScheduleCommand('at 16-08-2026 20:00 Asia/Shanghai x')).toEqual({
      action: 'error',
      text: 'at requires YYYY-MM-DD and HH:mm or HH:mm:ss.',
    })
    expect(parseScheduleCommand('at 2026-08-16 8pm Asia/Shanghai x')).toEqual({
      action: 'error',
      text: 'at requires YYYY-MM-DD and HH:mm or HH:mm:ss.',
    })
    expect(parseScheduleCommand('daily 9am UTC x')).toEqual({
      action: 'error',
      text: 'daily requires HH:mm or HH:mm:ss.',
    })
    expect(parseScheduleCommand('weekly 8 09:00 UTC x')).toEqual({
      action: 'error',
      text: 'weekly weekdays must be integers from 1 (Monday) through 7 (Sunday).',
    })
    expect(parseScheduleCommand('weekly 1 9am UTC x')).toEqual({
      action: 'error',
      text: 'weekly requires HH:mm or HH:mm:ss.',
    })
  })
})

describe('/schedule command', () => {
  it('stays unregistered when commands is not composed', async () => {
    const ctx = await harness(false)
    expect(ctx.get('commands')).toBeUndefined()
    const root = await ctx.agents.create({ sessionId: SessionId('schedule-no-commands') })
    expect(ctx.tools.get('schedule_create', root.agent)?.name).toBe('schedule_create')
    await root.dispose()
    await ctx.fiber.dispose()
  })

  it('creates after and every reminders, rejects a child agent, and deletes', async () => {
    const ctx = await harness()
    const root = await ctx.agents.create({ sessionId: SessionId('schedule-command-root') })
    const signal = new AbortController().signal
    expect(ctx.commands.list(root.agent).some(command => command.name === 'schedule')).toBe(true)

    const help = await ctx.commands.execute(root.agent, '/schedule', signal)
    expect(help?.result).toEqual({ kind: 'success', text: SCHEDULE_COMMAND_USAGE })

    const bad = await ctx.commands.execute(root.agent, '/schedule wow', signal)
    expect(bad?.result).toEqual({ kind: 'error', text: SCHEDULE_COMMAND_USAGE })

    const created = await ctx.commands.execute(root.agent, '/schedule after 600 check the build', signal)
    expect(created?.result).toEqual({ kind: 'success', text: 'Created reminder schedule-1.' })

    const tooFar = await ctx.commands.execute(root.agent, '/schedule after 999999999999 later', signal)
    expect(tooFar?.result.kind).toBe('error')
    if (tooFar?.result.kind !== 'error') throw new Error('expected time_out_of_range')
    expect(tooFar.result.text).toContain('time_out_of_range')

    const tooFast = await ctx.commands.execute(root.agent, '/schedule every 60 refresh', signal)
    expect(tooFast?.result.kind).toBe('error')
    if (tooFast?.result.kind !== 'error') throw new Error('expected frequency error')
    expect(tooFast.result.text).toContain('frequency_too_high')

    const every = await ctx.commands.execute(root.agent, '/schedule every 300 refresh status', signal)
    expect(every?.result).toEqual({ kind: 'success', text: 'Created reminder schedule-2.' })

    const missing = await ctx.commands.execute(root.agent, '/schedule delete schedule-9', signal)
    expect(missing?.result).toEqual({ kind: 'error', text: 'Reminder schedule-9 was not found.' })

    const removed = await ctx.commands.execute(root.agent, '/schedule delete schedule-1', signal)
    expect(removed?.result).toEqual({ kind: 'success', text: 'Deleted reminder schedule-1.' })

    const child = await root.agent.ctx.agents.create({ sessionId: SessionId('schedule-command-child') })
    const denied = await ctx.commands.execute(child.agent, '/schedule after 600 later', signal)
    expect(denied?.result).toEqual({ kind: 'error', text: 'Schedule is not available on this agent.' })

    await child.dispose()
    await root.dispose()
    await ctx.fiber.dispose()
  })

  it('creates an absolute reminder in an explicit zone', async () => {
    const ctx = await harness()
    const root = await ctx.agents.create({ sessionId: SessionId('schedule-command-at') })
    const future = new Date(Date.now() + 86_400_000)
    const date = future.toISOString().slice(0, 10)
    const created = await ctx.commands.execute(
      root.agent,
      `/schedule at ${date} 23:59 UTC write the report`,
      new AbortController().signal,
    )
    expect(created?.result.kind).toBe('success')

    const past = await ctx.commands.execute(
      root.agent,
      '/schedule at 2020-01-01 00:00 UTC too late',
      new AbortController().signal,
    )
    expect(past?.result.kind).toBe('error')
    if (past?.result.kind !== 'error') throw new Error('expected not_future')
    expect(past.result.text).toContain('not_future')

    const zone = await ctx.commands.execute(
      root.agent,
      `/schedule at ${date} 23:59 NotAZone later`,
      new AbortController().signal,
    )
    expect(zone?.result.kind).toBe('error')
    if (zone?.result.kind !== 'error') throw new Error('expected invalid_time_zone')
    expect(zone.result.text).toContain('invalid_time_zone')
    agentEvents(ctx, root.agent).emit('agent/status', { status: 'idle' })
    await root.dispose()
    await ctx.fiber.dispose()
  })

  it('creates daily and weekly calendar reminders', async () => {
    const ctx = await harness()
    const root = await ctx.agents.create({ sessionId: SessionId('schedule-command-calendar') })
    const signal = new AbortController().signal
    const daily = await ctx.commands.execute(
      root.agent,
      '/schedule daily 09:00 UTC check the build',
      signal,
    )
    expect(daily?.result).toEqual({ kind: 'success', text: 'Created reminder schedule-1.' })
    const weekly = await ctx.commands.execute(
      root.agent,
      '/schedule weekly 1,2,3,4,5 09:00 UTC write the report',
      signal,
    )
    expect(weekly?.result).toEqual({ kind: 'success', text: 'Created reminder schedule-2.' })
    await root.dispose()
    await ctx.fiber.dispose()
  })
})
