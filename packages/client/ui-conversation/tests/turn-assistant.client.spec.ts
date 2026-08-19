/**
 * Turn-local assistant and user text readers: they walk only the Location
 * index for one Turn, never the Chat window.
 */

import { describe, expect, it } from 'vitest'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatSnapshot, UserMessageNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '../src/client/contract/chat-nodes.ts'
import { assistantText, turnPromptText } from '../src/client/chat/turn-assistant.ts'

function chatWith(
  nodes: Record<string, ChatNode>,
  turnKeys: Readonly<Record<number, readonly string[]>>,
): ChatSnapshot {
  return {
    ...EMPTY_CHAT_SNAPSHOT,
    nodes: {
      get: key => nodes[key],
      values: () => Object.values(nodes),
    },
    locations: {
      getTurn: turn => turnKeys[turn] ?? [],
      getStep: () => [],
    },
  }
}

function userNode(key: string, content: UserMessageNode['content']): ChatNode {
  return {
    key,
    id: key,
    kind: 'user',
    target: 'chat',
    anchorSeq: 1,
    location: { kind: 'session' },
    visibility: 'visible',
    data: { kind: 'user', seq: 1, time: 1, content, source: null },
  } as ChatNode
}

describe('assistantText', () => {
  it('concatenates text blocks and skips every other kind', () => {
    expect(assistantText([
      { kind: 'text', text: 'hello' },
      { kind: 'reasoning', text: 'hidden' } as never,
      { kind: 'text', text: ' world' },
    ])).toBe('hello world')
    expect(assistantText([])).toBe('')
  })
})

describe('turnPromptText', () => {
  it('returns the first Turn-local user node that has text', () => {
    const chat = chatWith({
      missing: undefined as never,
      image: userNode('image', [{ type: 'image' } as never]),
      empty: userNode('empty', [{ type: 'text', text: '' }]),
      assistant: { kind: 'assistant-step' } as ChatNode,
      prompt: userNode('prompt', [
        { type: 'text', text: '/explain-clearly ' },
        { type: 'text', text: '讲一下' },
      ]),
    }, { 1: ['gone', 'image', 'empty', 'assistant', 'prompt'] })
    expect(turnPromptText(chat, 1)).toBe('/explain-clearly 讲一下')
  })

  it('returns undefined when the Turn has no user text', () => {
    const chat = chatWith({
      image: userNode('image', [{ type: 'image' } as never]),
    }, { 1: ['image'], 2: [] })
    expect(turnPromptText(chat, 1)).toBeUndefined()
    expect(turnPromptText(chat, 2)).toBeUndefined()
  })
})
