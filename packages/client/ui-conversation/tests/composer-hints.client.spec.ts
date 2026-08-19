/**
 * Composer-hint registry: the one way another plugin supplies a
 * non-blocking hero placeholder without disabling input.
 */

import { describe, expect, it, vi } from 'vitest'
import { ComposerHintRegistry } from '../src/client/input/hints.ts'

describe('ComposerHintRegistry', () => {
  it('creates a store on first read and notifies only when the placeholder moves', () => {
    const hints = new ComposerHintRegistry()
    const store = hints.storeFor('s1' as never)
    expect(hints.storeFor('s1' as never)).toBe(store)
    expect(store.getSnapshot()).toBeUndefined()

    const seen: Array<string | undefined> = []
    store.subscribe(() => { seen.push(store.getSnapshot()?.placeholder) })

    hints.set('s1' as never, { placeholder: '你卡在哪一步？' })
    hints.set('s1' as never, { placeholder: '你卡在哪一步？' })
    hints.set('s1' as never, { placeholder: '写给谁、做什么用、大概多长？' })
    hints.set('s1' as never, undefined)
    hints.set('s1' as never, undefined)

    expect(seen).toEqual([
      '你卡在哪一步？',
      '写给谁、做什么用、大概多长？',
      undefined,
    ])
  })

  it('forgets a session store so a later read starts empty', () => {
    const hints = new ComposerHintRegistry()
    hints.set('s1' as never, { placeholder: '你卡在哪一步？' })
    const previous = hints.storeFor('s1' as never)
    const listener = vi.fn()
    previous.subscribe(listener)

    hints.forget('s1' as never)
    const next = hints.storeFor('s1' as never)
    expect(next).not.toBe(previous)
    expect(next.getSnapshot()).toBeUndefined()
    hints.set('s1' as never, { placeholder: '写给谁、做什么用、大概多长？' })
    expect(listener).not.toHaveBeenCalled()
  })
})
