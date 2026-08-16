/**
 * Draft helpers for mode skill pins: the same `/name` grammar the host
 * `dsh-tool-skill` pre-step injects, so a pin in the composer is the gesture
 * that loads that skill's body.
 */

/** Shared skill every beginner mode mounts; listed in `+`, never auto-pinned. */
export const SHARED_SKILL_ID = 'vision'

/** A mode arms at most this many of its own skills. */
export const PIN_CAP = 3

/**
 * A whitespace-bounded `/name` token. Kept in lockstep with
 * `SKILL_GESTURE` in `@deepseek-ai/dsh-tool-skill`.
 */
const SKILL_GESTURE = /(^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/g

/** Domain skills that lead the pin row when the catalog also has companions. */
const PRIMARY_PINS = new Set([
  'build-a-page',
  'draft-and-revise',
  'clean-a-sheet',
  'tidy-files',
  'explain-clearly',
  'make-a-deck',
  'set-up-a-routine',
  'first-project',
])

/** One catalog row the pin row can show. */
export interface SkillPinSource {
  readonly name: string
  readonly description: string
}

/** One armed pin: kebab-case id plus the Chinese (or fallback) chip label. */
export interface SkillPin {
  readonly name: string
  readonly label: string
}

/**
 * `/name` tokens already in the draft, first-seen order.
 * @param draft - current composer text.
 * @returns unique skill names.
 */
export function armedNames(draft: string): string[] {
  const names: string[] = []
  SKILL_GESTURE.lastIndex = 0
  for (const match of draft.matchAll(SKILL_GESTURE)) {
    const name = match[2]
    if (name !== undefined && !names.includes(name)) names.push(name)
  }
  return names
}

/**
 * Chip label: the text before the first fullwidth colon, else the id.
 * @param description - skill catalog description.
 * @param id - kebab-case skill name.
 * @returns short label for the tag.
 */
export function pinLabel(description: string, id: string): string {
  const cut = description.indexOf('：')
  return cut > 0 ? description.slice(0, cut) : id
}

/**
 * Mode-owned pins from a session catalog: drop the shared vision skill, keep
 * at most {@link PIN_CAP}, primary domain skill first.
 * @param skills - user-invocable catalog rows.
 * @returns pins to arm in the composer.
 */
export function modePins(skills: readonly SkillPinSource[]): SkillPin[] {
  return skills
    .filter(skill => skill.name !== SHARED_SKILL_ID)
    .slice()
    .sort((a, b) => pinRank(a.name) - pinRank(b.name) || a.name.localeCompare(b.name))
    .slice(0, PIN_CAP)
    .map(skill => ({ name: skill.name, label: pinLabel(skill.description, skill.name) }))
}

/**
 * Prepend missing `/name` tokens, leaving existing ones and user prose in place.
 * @param draft - current composer text.
 * @param names - pins that should be armed.
 * @returns next draft.
 */
export function prependPins(draft: string, names: readonly string[]): string {
  const existing = new Set(armedNames(draft))
  const missing = names.filter(name => !existing.has(name))
  if (missing.length === 0) return draft
  const prefix = missing.map(name => `/${name}`).join(' ')
  if (draft === '') return `${prefix} `
  if (/^\s/.test(draft)) return `${prefix}${draft}`
  return `${prefix} ${draft}`
}

/**
 * Remove one `/name` token. A longer name that only shares a prefix stays.
 * @param draft - current composer text.
 * @param name - pin to drop.
 * @returns next draft.
 */
export function removePin(draft: string, name: string): string {
  const token = `/${name}`
  let start = 0
  let out = ''
  SKILL_GESTURE.lastIndex = 0
  for (const match of draft.matchAll(SKILL_GESTURE)) {
    if (match[2] !== name) continue
    const lead = match[1] ?? ''
    const tokenStart = match.index + lead.length
    out += draft.slice(start, tokenStart)
    start = tokenStart + token.length
    if (draft[start] === ' ') start += 1
  }
  out += draft.slice(start)
  return out.replace(/[ \t]+\n/g, '\n').replace(/^\s+/, '').replace(/[ \t]+$/, '')
}

/**
 * Replace one mode's pins with another's, leaving unrelated `/name` tokens
 * and the user's prose.
 * @param draft - current composer text.
 * @param previous - pins the last mode armed.
 * @param next - pins the new mode should arm.
 * @returns next draft.
 */
export function swapPins(draft: string, previous: readonly string[], next: readonly string[]): string {
  let out = draft
  for (const name of previous) {
    if (!next.includes(name)) out = removePin(out, name)
  }
  return prependPins(out, next)
}

/**
 * @param name - skill id.
 * @returns sort key; primary domain skills lead.
 */
function pinRank(name: string): number {
  return PRIMARY_PINS.has(name) ? 0 : 1
}
