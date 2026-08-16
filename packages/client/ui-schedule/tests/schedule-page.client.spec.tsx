// @vitest-environment jsdom
/**
 * Calendar schedule page: daily/weekly `/schedule` lines, no-workspace lock,
 * and cancel of projected calendar items.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import type { ScheduleProjection } from '@deepseek-ai/dsh-schedule/client'
import { SchedulePage, type SchedulePageProps } from '../src/client/SchedulePage.tsx'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { zh } from '../src/client/locales.ts'
import { browserTimeZone } from '../src/client/when.ts'

afterEach(cleanup)

const t: SchedulePageProps['t'] = makeTranslate(zh, commonZh)

function setup(
  projection: ScheduleProjection | undefined,
  run = vi.fn((_command: string) => Promise.resolve<string | null>(null)),
) {
  const store = createSnapshotStore<{ value: ScheduleProjection | undefined }>({ value: projection })
  const useProjection = (_key: string, selector?: (v: unknown) => unknown) =>
    bindSnapshotSelector(store)(s => (selector ?? (v => v))(s.value))
  const props = { useProjection, run, t } as unknown as SchedulePageProps
  const view = render(<SchedulePage {...props} />)
  return { store, run, view }
}

const empty: ScheduleProjection = { items: [] }

describe('SchedulePage', () => {
  it('locks the form until a workspace session exists', () => {
    setup(undefined)
    expect(screen.getByText('请先选择工作区')).toBeTruthy()
    expect(screen.getByRole('button', { name: '开始定时任务' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
  })

  it('creates a daily task at the default 09:00', async () => {
    const run = vi.fn((_command: string) => Promise.resolve<string | null>(null))
    setup(empty, run)
    fireEvent.change(screen.getByPlaceholderText('例如：检查构建'), { target: { value: '检查构建' } })
    fireEvent.change(screen.getByLabelText('时间'), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
    await waitFor(() => {
      expect(run).toHaveBeenCalledWith(`/schedule daily 10:00:00 ${browserTimeZone()} 检查构建`)
    })
    expect(screen.getByPlaceholderText('例如：检查构建')).toHaveProperty('value', '')
  })

  it('creates a weekly weekday task and lists calendar items', async () => {
    const run = vi.fn((_command: string) => Promise.resolve<string | null>(null))
    setup(empty, run)
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    fireEvent.click(screen.getByRole('button', { name: '每天' }))
    fireEvent.click(screen.getByRole('button', { name: '每周' }))
    fireEvent.click(screen.getByRole('button', { name: '一' }))
    fireEvent.click(screen.getByRole('button', { name: '六' }))
    fireEvent.change(screen.getByPlaceholderText('例如：检查构建'), { target: { value: '写日报' } })
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
    await waitFor(() => {
      expect(String(run.mock.calls[0]?.[0])).toContain('/schedule weekly 2,3,4,5,6 09:00:00')
    })
  })

  it('lists daily and weekly items and hides one-shots', async () => {
    const run = vi.fn((_command: string) => Promise.resolve<string | null>(null))
    setup({
      items: [
        {
          id: 'schedule-1',
          kind: 'daily',
          prompt: '检查构建',
          scheduledAt: '2099-01-01T01:00:00.000Z',
          time: '09:00:00',
          timeZone: 'UTC',
        },
        {
          id: 'schedule-2',
          kind: 'weekly',
          prompt: '写日报',
          scheduledAt: '2099-01-02T01:00:00.000Z',
          time: '09:00:00',
          timeZone: 'UTC',
          weekdays: [1, 2, 3, 4, 5],
        },
        {
          id: 'schedule-3',
          kind: 'weekly',
          prompt: '全周',
          scheduledAt: '2099-01-03T01:00:00.000Z',
          time: '09:00:00',
          timeZone: 'UTC',
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        },
        {
          id: 'schedule-4',
          kind: 'weekly',
          prompt: '周末',
          scheduledAt: new Date(Date.now() - 60_000).toISOString(),
          time: '09:00:00',
          timeZone: 'UTC',
          weekdays: [6, 7],
        },
        {
          id: 'schedule-soon',
          kind: 'daily',
          prompt: 'soon',
          scheduledAt: new Date(Date.now() + 20 * 60_000).toISOString(),
          time: '09:00:00',
          timeZone: 'UTC',
        },
        {
          id: 'schedule-hours',
          kind: 'daily',
          prompt: 'hours',
          scheduledAt: new Date(Date.now() + 90 * 60_000).toISOString(),
          time: '09:00:00',
          timeZone: 'UTC',
        },
        {
          id: 'schedule-after',
          kind: 'after',
          prompt: 'hidden',
          scheduledAt: '2099-01-01T00:00:00.000Z',
          afterSeconds: 600,
        },
      ],
    }, run)
    expect(screen.getAllByText('每天 09:00', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('工作日 09:00', { exact: false })).toBeTruthy()
    expect(screen.getByText('每周 09:00', { exact: false })).toBeTruthy()
    expect(screen.getByText('已到期，打开对话后会执行', { exact: false })).toBeTruthy()
    expect(screen.getByText('小时后', { exact: false })).toBeTruthy()
    expect(screen.getByText('分钟后', { exact: false })).toBeTruthy()
    expect(screen.queryByText('hidden')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: '取消' })[0]!)
    await waitFor(() => {
      expect(run).toHaveBeenCalledWith('/schedule delete schedule-1')
    })
  })

  it('surfaces runner failures and thrown errors', async () => {
    const fail = vi.fn(() => Promise.resolve('not_future'))
    setup(empty, fail)
    fireEvent.change(screen.getByPlaceholderText('例如：检查构建'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('not_future')
    })
    const boom = vi.fn(() => Promise.reject(new Error('disk')))
    cleanup()
    setup(empty, boom)
    fireEvent.change(screen.getByPlaceholderText('例如：检查构建'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('disk')
    })
    const rejectText = vi.fn(() => {
      return Promise.reject('nope')
    })
    cleanup()
    setup(empty, rejectText)
    fireEvent.change(screen.getByPlaceholderText('例如：检查构建'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: '开始定时任务' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('nope')
    })
    const cancelFail = vi.fn(() => Promise.resolve('gone'))
    cleanup()
    setup({
      items: [{
        id: 'schedule-1',
        kind: 'daily',
        prompt: 'x',
        scheduledAt: '2099-01-01T00:00:00.000Z',
        time: '09:00:00',
        timeZone: 'UTC',
      }],
    }, cancelFail)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('gone')
    })
    const cancelThrow = vi.fn(() => Promise.reject(new Error('disk')))
    cleanup()
    setup({
      items: [{
        id: 'schedule-1',
        kind: 'daily',
        prompt: 'x',
        scheduledAt: '2099-01-01T00:00:00.000Z',
        time: '09:00:00',
        timeZone: 'UTC',
      }],
    }, cancelThrow)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('disk')
    })
  })

  it('stringifies a non-Error cancel rejection', async () => {
    cleanup()
    const run = vi.fn(() => {
      return Promise.reject('nope')
    })
    setup({
      items: [{
        id: 'schedule-1',
        kind: 'daily',
        prompt: 'x',
        scheduledAt: '2099-01-01T00:00:00.000Z',
        time: '09:00:00',
        timeZone: 'UTC',
      }],
    }, run)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('nope')
    })
  })
})
