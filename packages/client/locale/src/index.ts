/** Host registration for the browser locale preference. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  LOCALE_IDS, LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema, type LocaleSettings,
} from './locale-settings.ts'

export {
  LOCALE_IDS, LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE,
  type LocaleId, type LocaleSettings,
} from './locale-settings.ts'

/**
 * Plugin config: the deployment's locale, resolved below the user layer. A
 * Chinese-first assembly declares `preference: zh` so a browser reporting any
 * other language still opens in Chinese; leaving it out delegates to the
 * browser's own language. Either way the Language row still wins, because a
 * user selection is stored in the layer above this one.
 */
export type Config = LocaleSettings

export const Config: z<Config> = z.object({
  preference: z.union([...LOCALE_IDS]).required(false),
})

/**
 * Register the durable locale section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 * @param config - resolved plugin config, layered under the user document.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(LOCALE_SETTINGS_NAMESPACE),
      LocaleSettingsSchema,
      { base: config },
    )
  })
}
