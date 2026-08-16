/**
 * Reminder surface plugin, browser half: a sidebar action under New Session
 * opens a calendar schedule page over the conversation column. Live items
 * arrive through `useProjection('schedule')`; writes go through `/schedule`
 * via `command.execute`.
 */
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-schedule/client'
import { ScheduleSidebar } from './ScheduleSidebar.tsx'
import { en, zh, type ScheduleKey } from './locales.ts'

export type { ScheduleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The beginner schedule page's copy. */
    schedule: ScheduleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'schedule'

/** Injected business face of the sidebar schedule page. */
export interface ScheduleActions {
  /**
   * Execute one `/schedule` line against this session.
   * @returns null on admitted success; a user-visible failure line otherwise.
   */
  run: (line: string) => Promise<string | null>
}

/** Required services: slots, commands Remote, and locale. */
export const inject = ['slots', 'remote', 'remote.commands', 'locale']

/**
 * Client plugin body: register the sidebar action that opens the page.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-schedule: dictionaries')
  const t = ctx.locale.bind(NS)

  const runOf = (sessionId: SessionId) => async (line: string): Promise<string | null> => {
    const result = await ctx.remote.commands.execute(sessionId, line)
    if (!result.ok) return `${result.error.message} (${result.error.code})`
    if (result.value === undefined) return t('commandMissing')
    if (result.value.result.kind === 'error') return result.value.result.text
    return null
  }

  ctx.slots.inject('sidebar.session.action', () => ctx.slots.register({
    name: 'sidebar.session.action',
    id: 'schedule',
    order: 10,
    locale: NS,
    inject: (sessionId: SessionId | undefined): ScheduleActions => ({
      run: sessionId === undefined
        ? () => Promise.resolve(t('needWorkspace'))
        : runOf(sessionId),
    }),
  }, ScheduleSidebar))
}
