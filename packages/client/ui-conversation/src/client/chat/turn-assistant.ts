import type {
  AssistantBlock, ChatSnapshot, UserMessageNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '../contract/chat-nodes.ts'

/**
 * Collect visible prose from one Assistant lifecycle.
 * @param blocks - Assistant content blocks.
 * @returns concatenated text blocks.
 */
export function assistantText(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('')
}

/**
 * Collect the first non-empty user-message text in one Turn from the
 * Turn-local Location index. Does not scan the Chat window.
 * @param chat - assembled Chat snapshot.
 * @param turn - Turn number whose user prompt to read.
 * @returns concatenated text blocks of the first user node that has any, or
 * undefined when the Turn has no such node.
 */
export function turnPromptText(chat: ChatSnapshot, turn: number): string | undefined {
  for (const key of chat.locations.getTurn(turn)) {
    const node = chat.nodes.get(key) as ChatNode | undefined
    if (node?.kind !== 'user') continue
    const text = userPromptText(node.data.content)
    if (text !== '') return text
  }
  return undefined
}

/**
 * Concatenate text blocks from one user message.
 * @param content - user-message content blocks.
 * @returns joined text, empty when the message has none.
 */
function userPromptText(content: UserMessageNode['content']): string {
  return content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}
