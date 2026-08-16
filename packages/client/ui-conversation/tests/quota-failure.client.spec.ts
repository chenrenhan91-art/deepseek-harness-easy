import { describe, expect, it } from 'vitest'
import { DEEPSEEK_TOP_UP_URL, isQuotaFailure } from '../src/client/quota-failure.ts'

describe('quota failure recognition', () => {
  it('accepts the structured QUOTA code and official top-up URL', () => {
    expect(isQuotaFailure('QUOTA')).toBe(true)
    expect(DEEPSEEK_TOP_UP_URL).toBe('https://platform.deepseek.com/top_up')
  })

  it('accepts 402 and insufficient-balance wording when the code is absent', () => {
    expect(isQuotaFailure(undefined, 'HTTP 402 Payment Required')).toBe(true)
    expect(isQuotaFailure(undefined, 'insufficient_quota')).toBe(true)
    expect(isQuotaFailure(undefined, 'insufficient balance')).toBe(true)
  })

  it('rejects ordinary transport and auth failures', () => {
    expect(isQuotaFailure('AUTH', 'API key is invalid')).toBe(false)
    expect(isQuotaFailure(undefined, 'HTTP 429: rate limit reached')).toBe(false)
  })
})
