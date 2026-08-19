/**
 * Beginner mode ids that own a hero placeholder and two empty-session
 * example prompts. Custom or unknown presets keep the generic hero copy.
 */

/** Preset ids that ship mode-owned composer copy. */
export const MODE_PROMPT_IDS = [
  'study',
  'web-page',
  'writing',
  'sheet',
  'files',
  'slides',
  'autopilot',
  'briefing',
] as const

/** One of the eight shipped beginner modes. */
export type ModePromptId = (typeof MODE_PROMPT_IDS)[number]

const MODE_PROMPT_ID_SET: ReadonlySet<string> = new Set(MODE_PROMPT_IDS)

/**
 * @param id - a session or grid preset id.
 * @returns whether that id owns mode-specific composer copy.
 */
export function isModePromptId(id: string): id is ModePromptId {
  return MODE_PROMPT_ID_SET.has(id)
}

/** Locale keys for one mode's hero placeholder and two example prompts. */
export interface ModePromptKeys {
  readonly placeholder: `prompt.${ModePromptId}.placeholder`
  readonly example1: `prompt.${ModePromptId}.example1`
  readonly example2: `prompt.${ModePromptId}.example2`
}

/**
 * Locale keys for a shipped mode's composer copy.
 * @param id - a {@link ModePromptId}.
 * @returns the three keys SkillPins reads through `t`.
 */
export function modePromptKeys(id: ModePromptId): ModePromptKeys {
  return {
    placeholder: `prompt.${id}.placeholder`,
    example1: `prompt.${id}.example1`,
    example2: `prompt.${id}.example2`,
  }
}
