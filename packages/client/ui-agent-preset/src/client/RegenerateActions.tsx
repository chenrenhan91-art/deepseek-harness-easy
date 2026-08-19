/**
 * Resend this Turn's user sentence from the assistant IconActions row.
 * Fork stays the way to compare two versions; this control runs the same
 * prompt again on the current session.
 */

import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './RegenerateActions.module.css'

/** Registration-side send verb closed over the addressed session. */
export interface RegenerateActionsInjected {
  /**
   * Queue one user message on this session, verbatim.
   * @param text - the Turn's original user sentence, including pin tokens.
   * @returns completion; business failures reject and land in promptError.
   */
  send: (text: string) => Promise<void>
}

/** Full props of the regenerate assistant-action entry. */
export type RegenerateActionsProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & InjectFace<RegenerateActionsInjected>
  & PropsLocale<'settings.agentPreset'>

/**
 * One "Regenerate" control for a finalized assistant message.
 * @param props - owner prompt fields, the send verb, and locale.
 * @returns the control, or null when this Turn has no user prompt text.
 */
export function RegenerateActions({
  promptText, regenerable = false, send, t,
}: RegenerateActionsProps) {
  if (promptText === undefined) return null
  const label = t('regenerate')
  const unavailable = !regenerable
  return (
    <Tooltip label={unavailable ? t('regenerateUnavailable') : label} side="bottom">
      {/* Native disabled buttons do not deliver the hover/focus events Tooltip needs. */}
      <button
        type="button"
        className={css.action}
        aria-label={label}
        aria-disabled={unavailable || undefined}
        data-unavailable={unavailable || undefined}
        data-regenerate=""
        onClick={unavailable
          ? undefined
          : () => {
            void send(promptText).catch(() => {
              // conversation.send already published promptError on the session.
            })
          }}
      >
        {label}
      </button>
    </Tooltip>
  )
}
