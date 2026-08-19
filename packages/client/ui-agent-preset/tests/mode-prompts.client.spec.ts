/**
 * Beginner mode ids that own composer copy: the closed set SkillPins reads.
 */

import { describe, expect, it } from 'vitest'
import { isModePromptId, MODE_PROMPT_IDS, modePromptKeys } from '../src/client/mode-prompts.ts'
import { zh } from '../src/client/locales.ts'

describe('mode-prompts', () => {
  it('accepts only the eight shipped beginner ids', () => {
    expect(MODE_PROMPT_IDS.every(isModePromptId)).toBe(true)
    expect(isModePromptId('mine')).toBe(false)
    expect(isModePromptId('')).toBe(false)
  })

  it('names locale keys that exist on the Chinese dictionary', () => {
    for (const id of MODE_PROMPT_IDS) {
      const keys = modePromptKeys(id)
      expect(zh[keys.placeholder]).toBeTypeOf('string')
      expect(zh[keys.example1]).toBeTypeOf('string')
      expect(zh[keys.example2]).toBeTypeOf('string')
    }
  })
})
