/**
 * Beginner `/schedule daily|weekly|delete` lines. The page never offers
 * one-shot or `every_seconds` chips.
 */

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

/**
 * Read the browser's IANA zone; `UTC` when Intl omits one.
 * @returns A zone name `/schedule daily|weekly` accepts.
 */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * Pad `HH:mm` to the calendar `HH:mm:ss` form.
 * @param time - `HH:mm` or already-padded `HH:mm:ss`.
 * @returns `HH:mm:ss`.
 */
export function padClockTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

/**
 * Build a `/schedule daily` line.
 * @param prompt - Reminder text; trimmed before encoding.
 * @param time - Local `HH:mm` or `HH:mm:ss`.
 * @param timeZone - Browser IANA zone.
 * @returns The command line, or undefined when the prompt or clock is empty.
 */
export function buildDailyLine(prompt: string, time: string, timeZone: string): string | undefined {
  const text = prompt.replace(/\s+/g, ' ').trim()
  if (text.length === 0 || !CLOCK.test(time)) return undefined
  return `/schedule daily ${padClockTime(time)} ${timeZone} ${text}`
}

/**
 * Build a `/schedule weekly` line.
 * @param prompt - Reminder text; trimmed before encoding.
 * @param time - Local `HH:mm` or `HH:mm:ss`.
 * @param timeZone - Browser IANA zone.
 * @param weekdays - ISO weekdays Monday=1 through Sunday=7.
 * @returns The command line, or undefined when prompt, clock, or weekdays are empty.
 */
export function buildWeeklyLine(
  prompt: string,
  time: string,
  timeZone: string,
  weekdays: readonly number[],
): string | undefined {
  const text = prompt.replace(/\s+/g, ' ').trim()
  const unique = [...new Set(weekdays)].filter(day => day >= 1 && day <= 7).sort((a, b) => a - b)
  if (text.length === 0 || !CLOCK.test(time) || unique.length === 0) return undefined
  return `/schedule weekly ${unique.join(',')} ${padClockTime(time)} ${timeZone} ${text}`
}

/**
 * Build a `/schedule delete` line for one projected id.
 * @param id - Projected reminder id (`schedule-N`).
 * @returns The command line `/schedule` accepts.
 */
export function buildDeleteLine(id: string): string {
  return `/schedule delete ${id}`
}
