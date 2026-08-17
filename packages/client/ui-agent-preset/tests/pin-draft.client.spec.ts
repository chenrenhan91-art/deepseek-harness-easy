/**
 * Mode pin draft math: the same `/name` grammar the host injects, so a tag
 * in the composer is the gesture that loads that skill.
 */

import { describe, expect, it } from 'vitest'
import {
  armedNames, modePins, PIN_CAP, pinLabel, prependPins, removePin, SHARED_SKILL_ID, swapPins,
} from '../src/client/pin-draft.ts'

describe('pin-draft', () => {
  it('reads unique /name tokens in first-seen order', () => {
    expect(armedNames('/explain-clearly 讲一下 /explain-clearly /work-an-example')).toEqual([
      'explain-clearly',
      'work-an-example',
    ])
    expect(armedNames('no skills here')).toEqual([])
    expect(armedNames('x/not-a-skill /usr/bin')).toEqual([])
  })

  it('labels a pin from the text before the fullwidth colon', () => {
    expect(pinLabel('讲明白：把复杂概念拆开', 'explain-clearly')).toBe('讲明白')
    expect(pinLabel('no colon here', 'explain-clearly')).toBe('explain-clearly')
    expect(pinLabel('：leading colon', 'explain-clearly')).toBe('explain-clearly')
  })

  it('drops the shared vision skill, caps the row, and leads with the primary', () => {
    const pins = modePins([
      { name: SHARED_SKILL_ID, description: '视觉技能：看图' },
      { name: 'work-an-example', description: '带做一道：走完例子' },
      { name: 'explain-clearly', description: '讲明白：拆开讲' },
      { name: 'check-understanding', description: '真懂了吗：出一道小题' },
      { name: 'zz-extra', description: '多余：不应入选' },
    ])
    expect(pins).toHaveLength(PIN_CAP)
    expect(pins.map(pin => pin.name)).toEqual([
      'explain-clearly',
      'check-understanding',
      'work-an-example',
    ])
    expect(pins[0]?.label).toBe('讲明白')
    expect(pins.some(pin => pin.name === SHARED_SKILL_ID)).toBe(false)
  })

  it('leads the briefing row with the roster skill', () => {
    expect(modePins([
      { name: SHARED_SKILL_ID, description: '视觉技能：看图' },
      { name: 'keep-the-source', description: '核对出处：打不开原文的条目不要写进简报' },
      { name: 'draft-a-brief', description: '出短简报：按领域分组' },
      { name: 'source-roster', description: '公开信源：优先用内置公开信源' },
    ]).map(pin => pin.name)).toEqual([
      'source-roster',
      'draft-a-brief',
      'keep-the-source',
    ])
  })

  it('prepends only the missing tokens and keeps user prose', () => {
    expect(prependPins('', ['explain-clearly', 'work-an-example'])).toBe(
      '/explain-clearly /work-an-example ',
    )
    expect(prependPins('帮我讲导数', ['explain-clearly'])).toBe('/explain-clearly 帮我讲导数')
    expect(prependPins(' 已有空格', ['explain-clearly'])).toBe('/explain-clearly 已有空格')
    expect(prependPins('/explain-clearly 已有', ['explain-clearly', 'work-an-example'])).toBe(
      '/work-an-example /explain-clearly 已有',
    )
    expect(prependPins('/explain-clearly 已有', ['explain-clearly'])).toBe('/explain-clearly 已有')
  })

  it('removes one token without touching a longer name that shares a prefix', () => {
    expect(removePin('/explain-clearly 帮我讲', 'explain-clearly')).toBe('帮我讲')
    expect(removePin('先看 /explain-clearly 再问', 'explain-clearly')).toBe('先看 再问')
    expect(removePin('/explain-clearly-extra /explain-clearly', 'explain-clearly')).toBe(
      '/explain-clearly-extra',
    )
    expect(removePin('没有这个', 'explain-clearly')).toBe('没有这个')
    expect(removePin('/explain-clearly  \n下一行', 'explain-clearly')).toBe('下一行')
  })

  it('swaps one mode’s pins for another and leaves unrelated tokens', () => {
    const draft = '/explain-clearly /vision 帮我讲'
    expect(swapPins(draft, ['explain-clearly', 'work-an-example'], ['draft-and-revise', 'write-plain']))
      .toBe('/draft-and-revise /write-plain /vision 帮我讲')
    expect(swapPins(draft, ['explain-clearly'], ['explain-clearly', 'work-an-example']))
      .toBe('/work-an-example /explain-clearly /vision 帮我讲')
  })
})
