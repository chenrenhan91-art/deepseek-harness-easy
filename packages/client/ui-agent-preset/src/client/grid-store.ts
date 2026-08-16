/**
 * Mode-grid controller: which preset the NEXT session gets.
 *
 * The new-session screen has no session, so a pick is staged rather than
 * applied. It reaches a session when one becomes current and is still blank —
 * whether the workspace connect created it or reused an existing blank one,
 * which is why staging cannot simply ride along on `sessions.create`.
 *
 * The stage is forgotten once applied: the next new session starts from the
 * deployment default again, matching the workspace picker beside it.
 */

import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import {
  createSnapshotStore, type SessionId, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import { messageOf, presetOptions } from './settings-store.ts'
import type { AgentPresetOption } from './settings-store.ts'

/** Mode-grid snapshot. */
export interface ModeGridState {
  /** Presets the deployment supplies; empty means the grid renders nothing. */
  options: readonly AgentPresetOption[]
  /** The staged choice, empty until the roster loads. */
  current: string
  /** A rejected apply's message, cleared by the next attempt. */
  error: string | null
  busy: boolean
}

const INITIAL: ModeGridState = { options: [], current: '', error: null, busy: false }

/** One session's identity and whether it has started. */
export interface ModeSessionSummary {
  /** The session the grid would apply its staged choice to. */
  id: SessionId
  /** False once a turn has run — applying is refused from then on. */
  blank: boolean
  /** The preset the session already runs, when the summary reports one. */
  agentPreset?: string
}

/** Stages the next session's preset and applies it when one appears. */
export class ModeGridController {
  /** Grid snapshot the renderer subscribes to. */
  readonly store: SnapshotStore<ModeGridState> = createSnapshotStore(INITIAL)

  /**
   * The deployment default, so a consumed stage can fall back to it without
   * re-reading the roster.
   */
  private fallback = ''

  /** Set while a pick is waiting for a session; cleared once applied. */
  private staged: string | undefined

  constructor(
    private readonly api: Pick<IApiClient, 'agentPresets'>,
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession: () => ModeSessionSummary | undefined,
    /**
     * Publish an applied switch into the session list, so the header label
     * moves with the composition instead of waiting for the next full list
     * refresh. Optional: a harness that renders no list omits it.
     */
    private readonly onApplied?: (sessionId: string, agentPreset: string) => void,
    /**
     * Mint a blank session already composed from the staged preset. Used when
     * the current session cannot take a switch — it has started, or it still
     * names a preset the roster dropped, so `agentPreset.select` would resume
     * that identity and fail.
     */
    private readonly mint?: (agentPreset: string) => Promise<void>,
  ) {}

  private set(patch: Partial<ModeGridState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /**
   * Read the roster and open the grid on the deployment default.
   * @returns once the snapshot reflects the host.
   */
  async load(): Promise<void> {
    try {
      const response = await this.api.agentPresets.list({})
      if (!response.result.ok) {
        this.set({ error: response.result.error.message })
        return
      }
      const { presets } = response.result.value
      this.fallback = presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id ?? ''
      const options = presetOptions(presets)
      const sessionPreset = this.currentSession()?.agentPreset
      const knownSession = sessionPreset !== undefined
        && options.some(option => option.id === sessionPreset)
      this.set({
        options,
        // Staged pick first, then the composition the current session
        // already carries when that id is still on the roster, then the
        // deployment default. A session that still names a retired id must
        // not pin the grid to a card that does not exist — the host remounts
        // that session on the default, and the next click applies the pick.
        // The middle term keeps a late-landing load from regressing the
        // display after an applied stage was consumed.
        current: this.staged ?? (knownSession ? sessionPreset : undefined) ?? this.fallback,
        error: null,
      })
    } catch (error) {
      this.set({ error: messageOf(error) })
    }
  }

  /**
   * Stage one preset for the next session, applying it immediately when a
   * blank session is already current.
   * @param id - the preset to stage.
   * @returns once the stage settled, and the apply too when one happened.
   */
  async select(id: string): Promise<void> {
    if (this.store.getSnapshot().busy) return
    this.staged = id
    this.set({ current: id, error: null })
    await this.apply()
  }

  /**
   * Hand the staged choice to the current session, if there is one to take it.
   *
   * Called both by `select()` and by whoever observes the current session
   * changing, because the session may appear either before or after the pick.
   * @returns once the switch settled, or immediately when there is nothing to do.
   */
  async apply(): Promise<void> {
    if (this.store.getSnapshot().busy) return
    const staged = this.staged
    const session = this.currentSession()
    if (staged === undefined) return
    if (session === undefined) return
    const known = session.agentPreset === undefined
      || this.store.getSnapshot().options.some(option => option.id === session.agentPreset)
    // Recompose only a blank session whose recorded preset is still on the
    // roster. A retired id (`standard` after the beginner roster) cannot be
    // resumed just to switch it; mint a session that already names the pick.
    if (session.blank && known && session.agentPreset !== staged) {
      this.set({ busy: true, error: null })
      try {
        const response = await this.api.agentPresets.select({ sessionId: session.id, agentPreset: staged })
        if (response.result.ok) {
          this.staged = undefined
          this.set({ busy: false, current: response.result.value.agentPreset })
          this.onApplied?.(session.id, response.result.value.agentPreset)
          return
        }
        if (this.mint === undefined) {
          this.staged = undefined
          this.set({ busy: false, error: response.result.error.message, current: this.fallback })
          return
        }
      } catch (error) {
        if (this.mint === undefined) {
          this.staged = undefined
          this.set({ busy: false, error: messageOf(error), current: this.fallback })
          return
        }
      }
    } else if ((session.blank && known && session.agentPreset === staged) || this.mint === undefined) {
      this.staged = undefined
      return
    }
    const mint = this.mint
    this.set({ busy: true, error: null })
    try {
      await mint(staged)
      this.staged = undefined
      this.set({ busy: false, current: staged, error: null })
    } catch (error) {
      this.staged = undefined
      this.set({ busy: false, error: messageOf(error), current: this.fallback })
    }
  }
}
