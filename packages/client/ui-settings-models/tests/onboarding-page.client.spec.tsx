// @vitest-environment jsdom
/** First-run API-key page behavior over the shared Models join. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Schema from '@deepseek-ai/schemastery'
import type { RpcResponse, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { ApiKeyOnboarding } from '../src/client/ApiKeyOnboarding.tsx'
import type { ApiKeyOnboardingProps } from '../src/client/ApiKeyOnboarding.tsx'
import { ModelsSettingsStore } from '../src/client/store.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  document.getElementById('root')?.remove()
})

let nextRpc = 0
function ok<T>(value: T): RpcResponse<T> {
  return { rpcId: `onboarding-${nextRpc++}` as never, result: { ok: true, value } }
}
function fail<T>(message: string): RpcResponse<T> {
  return {
    rpcId: `onboarding-${nextRpc++}` as never,
    result: { ok: false, error: { code: 'internal', message, details: {} } },
  }
}
/** The refusal `llm.discoverModels` answers with, carrying its blame. */
function discoveryFailure<T>(message: string, reason: 'invalid-credential' | 'endpoint-unusable'): RpcResponse<T> {
  return {
    rpcId: `onboarding-${nextRpc++}` as never,
    result: {
      ok: false,
      error: { code: 'model-discovery-failed', message, details: { settingsNs: 'llm-deepseek', reason } },
    },
  }
}

const DeepSeekConfig = Schema.object({
  apiKeyEnv: Schema.string().role('credential-ref'),
  baseURL: Schema.string().pattern(/^https:\/\//),
})

function deepSeekNamespace(apiKeyEnv: string | null): SettingsNamespaceView {
  const value = apiKeyEnv === null ? {} : { apiKeyEnv }
  return {
    ns: 'llm-deepseek',
    schema: JSON.parse(JSON.stringify(DeepSeekConfig.toJSON())) as unknown,
    value,
    base: value,
    user: {},
    applies: 'live',
    secrets: [],
    revision: 0,
  }
}

function harness(options: {
  provider?: boolean
  providerActive?: boolean
  settingsNamespace?: boolean
  apiKeyEnv?: string | null
  configured?: () => boolean
  credential?: { source?: string; writable: boolean }
  describeFailure?: string
  settingsWritable?: boolean
  providersReject?: boolean
  discover?: () => Promise<RpcResponse<{ models: { id: string }[] }>>
  setFailure?: string
  setReject?: string
} = {}) {
  if (document.getElementById('root') === null) {
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    document.body.append(appRoot)
  }
  let fileConfigured = false
  const configured = options.configured ?? (() => fileConfigured)
  const apiKeyEnv = options.apiKeyEnv === undefined ? 'DEEPSEEK_API_KEY' : options.apiKeyEnv
  const discoverModels = vi.fn(options.discover ?? (() => Promise.resolve(ok({ models: [{ id: 'deepseek-chat' }] }))))
  const set = vi.fn((_payload: { ref: string; value: string }) => {
    if (options.setReject !== undefined) return Promise.reject(new Error(options.setReject))
    if (options.setFailure !== undefined) return Promise.resolve(fail(options.setFailure))
    fileConfigured = true
    return Promise.resolve(ok({}))
  })
  const face = {
    llm: {
      providers: () => {
        if (options.providersReject === true) return Promise.reject(new Error('provider transport unavailable'))
        return Promise.resolve(ok({
          providers: options.provider === false
            ? []
            : [{
              provider: 'deepseek-official',
              displayName: 'DeepSeek',
              settingsNs: 'llm-deepseek',
              settingsPath: [],
              active: options.providerActive ?? true,
            }],
        }))
      },
      discoverModels,
    },
    settings: {
      describe: () => Promise.resolve(ok({
        writable: options.settingsWritable ?? true,
        hasDocument: false,
        namespaces: options.settingsNamespace === false ? [] : [deepSeekNamespace(apiKeyEnv)],
      })),
      mutate: vi.fn(),
    },
    credentials: {
      describe: () => options.describeFailure === undefined
        ? Promise.resolve(ok({
          credentials: {
            DEEPSEEK_API_KEY: {
              configured: configured(),
              ...configured() && options.credential?.source !== undefined
                ? { source: options.credential.source }
                : {},
              writable: options.credential?.writable ?? true,
            },
          },
        }))
        : Promise.resolve(fail(options.describeFailure)),
      set,
    },
  }
  const controller = new ModelsSettingsStore(face as never)
  const openSection = vi.fn()
  const complete = vi.fn()
  const unusedHook = (() => { throw new Error('unused standard hook') }) as never
  const props: ApiKeyOnboardingProps = {
    stepId: 'deepseek-official',
    complete,
    openSection,
    useSessions: unusedHook,
    useWorkspaces: unusedHook,
    controller,
    useModels: bindSnapshotSelector(controller.store),
    api: face as never,
    t: key => en[key],
  }
  return { controller, complete, openSection, props, discoverModels, set }
}

/** Type a key into the page's one field. */
function typeKey(value: string): void {
  fireEvent.change(screen.getByLabelText(en.keyInput), { target: { value } })
}

describe('the first-run API-key page', () => {
  it('takes the whole screen and states what the assistant will be allowed to do', async () => {
    const h = harness()
    render(<ApiKeyOnboarding {...h.props} />)

    expect(await screen.findByRole('heading', { name: en.onboardingTitle })).toBeTruthy()
    expect(document.getElementById('root')?.inert).toBe(true)
    // Where to get a key, and what full access means, are both on the first
    // screen: this is the only moment the product has the user's attention
    // before it starts running commands for them.
    expect(screen.getByRole('link', { name: en.onboardingOpenConsole }).getAttribute('href'))
      .toBe('https://platform.deepseek.com/api_keys')
    expect(screen.getByRole('link', { name: en.onboardingOpenTopUp }).getAttribute('href'))
      .toBe('https://platform.deepseek.com/top_up')
    expect(screen.getByText(en.onboardingPermissionBody)).toBeTruthy()
    const field = screen.getByLabelText<HTMLInputElement>(en.keyInput)
    await waitFor(() => { expect(document.activeElement).toBe(field) })
    // A pasted key is a secret on a shared screen.
    expect(field.type).toBe('password')
  })

  it('probes the typed key before storing it, then leaves once the route works', async () => {
    const h = harness()
    render(<ApiKeyOnboarding {...h.props} />)
    await screen.findByRole('heading', { name: en.onboardingTitle })

    typeKey('  sk-live  ')
    fireEvent.click(screen.getByRole('button', { name: en.onboardingVerify }))

    await waitFor(() => { expect(h.set).toHaveBeenCalled() })
    // Trimmed once, so the probe and the stored credential are the same key.
    expect(h.discoverModels).toHaveBeenCalledWith({
      settingsNs: 'llm-deepseek', provider: 'deepseek-official', apiKey: 'sk-live',
    })
    expect(h.set).toHaveBeenCalledWith({ ref: 'DEEPSEEK_API_KEY', value: 'sk-live' })
    await waitFor(() => { expect(h.complete).toHaveBeenCalled() })
    expect(screen.queryByRole('heading', { name: en.onboardingTitle })).toBeNull()
  })

  it('stores nothing when the provider refuses the key, and says which one to fix', async () => {
    const h = harness({
      discover: () => Promise.resolve(discoveryFailure('models refused this API key (401)', 'invalid-credential')),
    })
    render(<ApiKeyOnboarding {...h.props} />)
    await screen.findByRole('heading', { name: en.onboardingTitle })

    typeKey('sk-wrong')
    fireEvent.click(screen.getByRole('button', { name: en.onboardingVerify }))

    expect(await screen.findByText(en.onboardingKeyRefused)).toBeTruthy()
    // The whole point of probing first: a rejected key is never written, and
    // the page stays open on the field to correct.
    expect(h.set).not.toHaveBeenCalled()
    expect(h.complete).not.toHaveBeenCalled()
    expect(screen.getByLabelText<HTMLInputElement>(en.keyInput).value).toBe('sk-wrong')
  })

  it('blames the connection for every other refusal', async () => {
    for (const options of [
      { discover: () => Promise.resolve(discoveryFailure('could not reach the endpoint', 'endpoint-unusable')) },
      { discover: () => Promise.reject(new Error('connection lost')) },
    ]) {
      const h = harness(options as never)
      const view = render(<ApiKeyOnboarding {...h.props} />)
      await screen.findByRole('heading', { name: en.onboardingTitle })

      typeKey('sk-live')
      fireEvent.click(screen.getByRole('button', { name: en.onboardingVerify }))

      expect(await screen.findByText(en.onboardingUnreachable)).toBeTruthy()
      expect(h.set).not.toHaveBeenCalled()
      // The reported cause stays visible under the plain sentence.
      expect(screen.getByText(/could not reach the endpoint|connection lost/)).toBeTruthy()
      // The button is usable again rather than stuck mid-check.
      expect(screen.getByRole<HTMLButtonElement>('button', { name: en.onboardingVerify }).disabled).toBe(false)
      view.unmount()
    }
  })

  it('reports a working key that could not be saved', async () => {
    for (const options of [{ setFailure: 'the credential store is read-only' }, { setReject: 'connection lost' }]) {
      const h = harness(options)
      const view = render(<ApiKeyOnboarding {...h.props} />)
      await screen.findByRole('heading', { name: en.onboardingTitle })

      typeKey('sk-live')
      fireEvent.click(screen.getByRole('button', { name: en.onboardingVerify }))

      expect(await screen.findByText(
        options.setFailure === undefined ? en.onboardingUnreachable : en.onboardingSaveFailed,
      )).toBeTruthy()
      expect(h.complete).not.toHaveBeenCalled()
      view.unmount()
    }
  })

  it('refuses a key it can already tell is not one, without asking the provider', async () => {
    const h = harness()
    render(<ApiKeyOnboarding {...h.props} />)
    await screen.findByRole('heading', { name: en.onboardingTitle })
    const verify = screen.getByRole<HTMLButtonElement>('button', { name: en.onboardingVerify })
    expect(verify.disabled).toBe(true)

    typeKey('   ')
    expect(verify.disabled).toBe(true)
    typeKey('DEEPSEEK_API_KEY=sk-live')
    expect(screen.getByText(en.keyIllegalCharacters)).toBeTruthy()
    expect(verify.disabled).toBe(true)

    fireEvent.submit(screen.getByLabelText(en.keyInput).closest('form')!)
    expect(h.discoverModels).not.toHaveBeenCalled()
  })

  it('lets a user past it without a key', async () => {
    const h = harness()
    render(<ApiKeyOnboarding {...h.props} />)
    await screen.findByRole('heading', { name: en.onboardingTitle })

    fireEvent.click(screen.getByRole('button', { name: en.onboardingLater }))

    expect(h.complete).toHaveBeenCalledOnce()
    expect(h.set).not.toHaveBeenCalled()
    expect(h.discoverModels).not.toHaveBeenCalled()
  })

  it('never blocks a product that has nothing to ask for', async () => {
    for (const h of [
      harness({ describeFailure: 'credentials service is absent' }),
      harness({ credential: { writable: false } }),
      harness({ settingsWritable: false }),
      harness({ providersReject: true }),
      harness({ providerActive: false }),
      harness({ settingsNamespace: false }),
      harness({ apiKeyEnv: null }),
      harness({ provider: false }),
      harness({ configured: () => true, credential: { source: 'env', writable: false } }),
    ]) {
      const view = render(<ApiKeyOnboarding {...h.props} />)
      await act(async () => { await h.controller.load() })
      expect(screen.queryByRole('heading', { name: en.onboardingTitle })).toBeNull()
      await waitFor(() => { expect(h.complete).toHaveBeenCalled() })
      // A step that shows nothing must also block nothing.
      expect(document.getElementById('root')?.inert).not.toBe(true)
      view.unmount()
    }
  })

  it('closes when a credential arrives from somewhere else', async () => {
    const h = harness({ configured: () => false })
    render(<ApiKeyOnboarding {...h.props} />)
    await screen.findByRole('heading', { name: en.onboardingTitle })

    h.props.controller.store.update((state) => {
      state.rows = state.rows.map(row => ({
        ...row,
        credential: { configured: true, writable: true },
      }))
    })

    await waitFor(() => { expect(screen.queryByRole('heading', { name: en.onboardingTitle })).toBeNull() })
    expect(h.complete).toHaveBeenCalled()
  })
})
