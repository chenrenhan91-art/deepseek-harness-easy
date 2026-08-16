/** Official DeepSeek console: add prepaid API balance. */
export const DEEPSEEK_TOP_UP_URL = 'https://platform.deepseek.com/top_up'

/**
 * Whether a failure is an exhausted account quota or balance.
 * @param code - structured failure code when the adapter classified it.
 * @param message - provider or RPC text, used when the code is absent.
 * @returns true for `QUOTA` and for 402 / insufficient-balance wording.
 */
export function isQuotaFailure(code: string | undefined, message = ''): boolean {
  if (code === 'QUOTA') return true
  return /\b402\b/.test(message) || /\binsufficient[\s_-]+(?:quota|balance|credits?)\b/i.test(message)
}
