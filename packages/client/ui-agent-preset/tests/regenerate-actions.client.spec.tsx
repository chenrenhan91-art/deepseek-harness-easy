// @vitest-environment jsdom
/**
 * Resend this Turn's user sentence from the assistant IconActions row.
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { RegenerateActions } from '../src/client/RegenerateActions.tsx'
import type { RegenerateActionsProps } from '../src/client/RegenerateActions.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t = makeTranslate(zh)

function renderRegen(options: {
  promptText?: string
  regenerable?: boolean
  send?: () => Promise<void>
}) {
  const send = options.send ?? vi.fn(() => Promise.resolve())
  const view = render(
    <RegenerateActions {...({
      promptText: options.promptText,
      regenerable: options.regenerable,
      send,
      t,
    } as unknown as RegenerateActionsProps)} />,
  )
  return { view, send }
}

describe('RegenerateActions', () => {
  it('renders nothing without a Turn-local user prompt', () => {
    const { view } = renderRegen({})
    expect(view.queryByRole('button', { name: '再生成' })).toBeNull()
  })

  it('resends the prompt when the control is available', () => {
    const { view, send } = renderRegen({
      promptText: '/explain-clearly 讲一下',
      regenerable: true,
    })
    const button = view.getByRole('button', { name: '再生成' })
    expect(button.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(button)
    expect(send).toHaveBeenCalledWith('/explain-clearly 讲一下')
  })

  it('stays focusable and silent when the control is unavailable', () => {
    const { view, send } = renderRegen({
      promptText: '/explain-clearly 讲一下',
      regenerable: false,
    })
    const button = view.getByRole('button', { name: '再生成' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(button)
    expect(send).not.toHaveBeenCalled()
  })

  it('swallows a send rejection because conversation.send already published promptError', async () => {
    const send = vi.fn(() => Promise.reject(new Error('agent-busy')))
    const { view } = renderRegen({
      promptText: '讲一下',
      regenerable: true,
      send,
    })
    fireEvent.click(view.getByRole('button', { name: '再生成' }))
    await Promise.resolve()
    expect(send).toHaveBeenCalledOnce()
  })
})
