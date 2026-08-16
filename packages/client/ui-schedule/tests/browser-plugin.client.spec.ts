/**
 * ui-schedule browser half: the plugin occupies the sidebar action under
 * New Session; the injected face executes `/schedule` lines; teardown
 * empties the seat.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { ScheduleSidebar } from '../src/client/ScheduleSidebar.tsx'
import type { ScheduleActions } from '../src/client/index.ts'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'

const SID = 's-schedule' as SessionId

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  slots.register({
    name: 'root',
    children: {
      'sidebar.session.action': { kind: 'list', scope: 'session-maybe' },
    },
  } as never, () => null)
  const execute = vi.fn((_sessionId: SessionId, _line: string) =>
    Promise.resolve({ ok: true, value: { commandId: 'c1', result: { kind: 'success' as const } } }))
  const commandsRemote = { execute }
  ctx.provide('remote', { commands: commandsRemote })
  ctx.provide('remote.commands', commandsRemote)
  ctx.provide('locale', new LocaleRuntime(ctx))
  return { ctx, slots, execute }
}

describe('ui-schedule browser apply', () => {
  it('declares every service it binds', () => {
    expect(inject).toEqual(['slots', 'remote', 'remote.commands', 'locale'])
  })

  it('node-half apply is an intentional no-op', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })

  it('waits until the sidebar declares its seat', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    ctx.provide('remote', { commands: {} })
    ctx.provide('remote.commands', {})
    ctx.provide('locale', new LocaleRuntime(ctx))
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(ctx.slots.entries('sidebar.session.action')).toHaveLength(0)
    ctx.slots.register({
      name: 'root',
      children: {
        'sidebar.session.action': { kind: 'list', scope: 'session-maybe' },
      },
    } as never, () => null)
    await Promise.resolve()
    expect(ctx.slots.entries('sidebar.session.action')).toHaveLength(1)
  })

  it('registers the seat, executes /schedule, and unregisters on teardown', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const sidebar = b.slots.entries('sidebar.session.action')[0]!
    expect(sidebar.component).toBe(ScheduleSidebar)
    const injected = (sidebar.inject as unknown as (id: SessionId | undefined) => ScheduleActions)(SID)
    const absent = (sidebar.inject as unknown as (id: SessionId | undefined) => ScheduleActions)(undefined)

    await expect(injected.run('/schedule daily 09:00:00 UTC later')).resolves.toBeNull()
    expect(b.execute).toHaveBeenLastCalledWith(SID, '/schedule daily 09:00:00 UTC later')
    await expect(absent.run('/schedule daily 09:00:00 UTC later')).resolves.toBe(
      '请先选择工作区',
    )
    expect(b.execute).toHaveBeenCalledTimes(1)

    b.execute.mockResolvedValueOnce({
      ok: false,
      error: { code: 'session-not-found', message: 'gone', details: {} },
    } as never)
    await expect(injected.run('/schedule daily 09:00:00 UTC later')).resolves.toBe('gone (session-not-found)')

    b.execute.mockResolvedValueOnce({ ok: true, value: undefined } as never)
    await expect(injected.run('/schedule daily 09:00:00 UTC later')).resolves.toBe('定时任务暂时不可用，请重启应用后再试')

    b.execute.mockResolvedValueOnce({
      ok: true,
      value: { commandId: 'c2', result: { kind: 'error', text: 'not_future' } },
    } as never)
    await expect(injected.run('/schedule daily 09:00:00 UTC later')).resolves.toBe('not_future')

    await fiber.dispose()
    expect(b.slots.entries('sidebar.session.action')).toHaveLength(0)
  })
})
