// @vitest-environment jsdom
/**
 * Sidebar schedule action: opens and closes the overlay page.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { zh } from '../src/client/locales.ts'
import { ScheduleSidebar } from '../src/client/ScheduleSidebar.tsx'

afterEach(cleanup)

const t = makeTranslate(zh, commonZh)

// The action reads only `wide`, `useProjection`, `run`, and `t`; the rest of
// the framework standard kit is inert here.
const inertStandard = {
  useSession: (() => undefined) as never,
  sessionId: undefined,
  useInput: (() => undefined) as never,
  inputActions: undefined,
  useSessions: (() => undefined) as never,
  useWorkspaces: (() => undefined) as never,
}

function renderSidebar(wide = true) {
  const store = createSnapshotStore({ value: undefined })
  const useProjection = (_key: string, selector?: (v: unknown) => unknown) =>
    bindSnapshotSelector(store)(s => (selector ?? (v => v))(s.value))
  const run = vi.fn((_command: string) => Promise.resolve<string | null>(null))
  const view = render(
    <ScheduleSidebar {...inertStandard} wide={wide} useProjection={useProjection as never} run={run} t={t} />,
  )
  return { view, run }
}

describe('ScheduleSidebar', () => {
  it('opens the page from the expanded and rail controls and closes on Escape', () => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-shell-overlay', '')
    const frame = document.createElement('div')
    const sidebar = document.createElement('div')
    Object.defineProperty(sidebar, 'getBoundingClientRect', {
      value: () => ({ right: 280, left: 0, top: 0, bottom: 0, width: 280, height: 800 }),
    })
    frame.append(sidebar, overlay)
    document.body.append(frame)

    const { view } = renderSidebar(true)
    fireEvent.click(screen.getByRole('button', { name: '定时任务' }))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: '定时任务' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    view.rerender(
      <ScheduleSidebar
        {...inertStandard}
        wide={false}
        useProjection={() => undefined}
        run={vi.fn()}
        t={t}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '定时任务' }))
    fireEvent.click(document.querySelector('[class*="mask"]') as Element)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '定时任务' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    frame.remove()

    const { view: noFrame } = renderSidebar(true)
    fireEvent.click(screen.getAllByRole('button', { name: '定时任务' })[0]!)
    expect(screen.getByRole('dialog')).toBeTruthy()
    noFrame.unmount()
  })
})
