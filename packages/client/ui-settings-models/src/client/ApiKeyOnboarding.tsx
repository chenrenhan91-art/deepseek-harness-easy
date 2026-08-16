/**
 * First-run page: the whole screen until this browser can reach a model.
 *
 * Readiness comes from the same provider/settings/credential join as the
 * Models page — any provider the user can already talk to ends the step, and
 * only a user with none is walked through the official DeepSeek route. The
 * page owns its own two fields instead of reusing the Models editor: a person
 * who has never held an API key needs the official create-key and top-up
 * links and proof that the one they pasted works, and neither belongs on a
 * settings card.
 *
 * The key is probed before it is stored. `llm.discoverModels` asks DeepSeek
 * for its model listing with exactly this key, so a typo is refused here, at
 * the field, instead of surfacing as a failed first message.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { IApiClient, RpcError } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Input, OnboardingSurface } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ModelsSettingsState, ModelsSettingsStore } from './store.ts'
import { messageOf, onboardingReadiness } from './store.ts'
import { apiKeyFailure } from './apiKey.ts'
import type { en } from './locales.ts'
import css from './ApiKeyOnboarding.module.css'

/** The official DeepSeek route this page can obtain a key for. */
const PROVIDER = 'deepseek-official'

/** Settings namespace owning that route, and its model-listing probe. */
const SETTINGS_NS = 'llm-deepseek'

/** Official DeepSeek console: create an API key. */
const DEEPSEEK_API_KEYS_URL = 'https://platform.deepseek.com/api_keys'

/** Official DeepSeek console: add prepaid API balance. */
const DEEPSEEK_TOP_UP_URL = 'https://platform.deepseek.com/top_up'

/** Registration-side dependencies of {@link ApiKeyOnboarding}. */
export interface ApiKeyOnboardingInjected {
  hooks: {
    /** Shared Models-page join state, bound by the slot renderer. */
    models: SnapshotStore<ModelsSettingsState>
  }
  /** Shared Models-page join controller. */
  controller: ModelsSettingsStore
  /** Probe (`llm`) and credential-write (`credentials`) faces. */
  api: Pick<IApiClient, 'settings' | 'credentials' | 'llm'>
  /** Feature copy. */
  t: (key: keyof typeof en) => string
}

/** Slot owner props plus the feature's injected dependencies. */
export type ApiKeyOnboardingProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<ApiKeyOnboardingInjected>

/** What the page is waiting on, and what it says while it waits. */
type Busy = 'onboardingVerifying' | 'onboardingSaving'

/** A refusal the page shows: one plain sentence, plus the reported cause. */
interface Failure {
  copy: keyof typeof en
  detail: string
}

/* v8 ignore next 3 -- closed-union defaults only defend future source widening */
function assertNever(_value: never): never {
  throw new Error('unexpected DeepSeek onboarding state')
}

/**
 * Which sentence a refused probe deserves. The reply's `reason` separates the
 * key from everything else, so the page names the field to correct without
 * reading the adapter's own English text.
 * @param error - the refusal `llm.discoverModels` answered with.
 * @returns the copy key and the reported cause to show beneath it.
 */
function probeFailure(error: RpcError): Failure {
  const refusedKey = error.code === 'model-discovery-failed'
    && error.details.reason === 'invalid-credential'
  return {
    copy: refusedKey ? 'onboardingKeyRefused' : 'onboardingUnreachable',
    detail: error.message,
  }
}

/**
 * Walk a first-run user from no API key to a working one.
 * @param props - settings-shell owner state and Models feature dependencies.
 * @returns the first-run page, or null once onboarding needs no intervention.
 */
export function ApiKeyOnboarding(props: ApiKeyOnboardingProps): ReactNode {
  const { complete, controller, useModels, api, t } = props
  const state = useModels(snapshot => snapshot)
  const readiness = onboardingReadiness(state)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState<Busy | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)

  useEffect(() => {
    if (state.status === 'idle') void controller.load()
  }, [controller, state.status])

  useEffect(() => {
    if (
      readiness.kind === 'adapter-absent'
      || readiness.kind === 'provider-ready'
      || readiness.kind === 'unavailable'
    ) complete()
  }, [complete, readiness.kind])

  switch (readiness.kind) {
    case 'loading':
    case 'adapter-absent':
    case 'provider-ready':
    case 'unavailable':
      return null
    case 'credential-missing':
      break
    /* v8 ignore next -- every current readiness variant is handled above */
    default:
      return assertNever(readiness)
  }

  const row = state.rows.find(candidate =>
    candidate.entry.provider === PROVIDER
    && candidate.entry.settingsNs === SETTINGS_NS
    && candidate.entry.settingsPath.length === 0)
  /* v8 ignore next 2 -- credential-missing is derived only from this exact joined row, which names its reference. */
  const ref = row?.apiKeyEnv
  if (ref === undefined) return null

  const typed = key.trim()
  const malformed = apiKeyFailure(key)
  const submittable = typed.length > 0 && malformed === undefined && busy === null

  const submit = async (): Promise<void> => {
    setFailure(null)
    setBusy('onboardingVerifying')
    try {
      const probe = await api.llm.discoverModels({
        settingsNs: SETTINGS_NS,
        provider: PROVIDER,
        apiKey: typed,
      })
      if (!probe.result.ok) {
        setFailure(probeFailure(probe.result.error))
        return
      }
      setBusy('onboardingSaving')
      const stored = await api.credentials.set({ ref, value: typed })
      if (!stored.result.ok) {
        setFailure({ copy: 'onboardingSaveFailed', detail: stored.result.error.message })
        return
      }
    } catch (error) {
      // The transport rejected rather than answering; without this the page
      // would sit busy with nothing said.
      setFailure({ copy: 'onboardingUnreachable', detail: messageOf(error) })
      return
    } finally {
      setBusy(null)
    }
    // The stored key makes the route usable, which is what ends this step:
    // the refreshed join flips readiness and the effect above completes it.
    await controller.load()
  }

  return (
    <OnboardingSurface>
      <div className={css.page}>
        <div className={css.content}>
          <h1 className={css.title}>{t('onboardingTitle')}</h1>
          <p className={css.lead}>{t('onboardingLead')}</p>

          <section className={css.step}>
            <h2 className={css.stepTitle}>{t('onboardingGetTitle')}</h2>
            <p className={css.stepBody}>{t('onboardingGetBody')}</p>
            <div className={css.consoleLinks}>
              <a className={css.consoleLink} href={DEEPSEEK_API_KEYS_URL} target="_blank" rel="noreferrer">
                {t('onboardingOpenConsole')}
              </a>
              <a className={css.consoleLink} href={DEEPSEEK_TOP_UP_URL} target="_blank" rel="noreferrer">
                {t('onboardingOpenTopUp')}
              </a>
            </div>
          </section>

          <section className={css.step}>
            <h2 className={css.stepTitle}>{t('onboardingPasteTitle')}</h2>
            <p className={css.stepBody}>{t('onboardingPasteBody')}</p>
            <form
              className={css.form}
              onSubmit={(event) => {
                event.preventDefault()
                if (submittable) void submit()
              }}
            >
              <Input
                className={css.field as string}
                type="password"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                aria-label={t('keyInput')}
                placeholder={t('keyPlaceholder')}
                value={key}
                disabled={busy !== null}
                onChange={(event) => { setKey(event.target.value) }}
              />
              <Button type="submit" variant="primary" className={css.submit} disabled={!submittable}>
                {busy === null ? t('onboardingVerify') : t(busy)}
              </Button>
            </form>
            {malformed === undefined
              ? null
              : <p className={css.error} role="alert">{t(malformed)}</p>}
            {failure === null
              ? null
              : (
                <p className={css.error} role="alert">
                  {t(failure.copy)}
                  <span className={css.detail}>{failure.detail}</span>
                </p>
              )}
          </section>

          <section className={css.notice}>
            <h2 className={css.noticeTitle}>{t('onboardingPermissionTitle')}</h2>
            <p className={css.stepBody}>{t('onboardingPermissionBody')}</p>
          </section>

          <button type="button" className={css.later} onClick={() => { complete() }}>
            {t('onboardingLater')}
          </button>
        </div>
      </div>
    </OnboardingSurface>
  )
}
