/**
 * Composer hints: the one way another plugin supplies a non-blocking
 * placeholder for a session's hero composer.
 *
 * A hint never disables input. A raised {@link ComposerBlock} still wins:
 * ConversationRoot only reads a hint while the hero bar is live.
 */

import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** Non-blocking placeholder for one session's hero composer. */
export interface ComposerHint {
  /**
   * Localized placeholder replacing the hero composer's own, owned by the
   * plugin that set the hint.
   */
  readonly placeholder: string
}

/** The registry face other plugins reach through `ctx.conversation.hints`. */
export interface ComposerHints {
  /**
   * Set or clear this session's hint. Idempotent: setting a hint equal to
   * the current one, or clearing an absent one, notifies nobody.
   * @param sessionId - the session whose composer is affected.
   * @param hint - the hint to set, or undefined to clear it.
   */
  set(sessionId: SessionId, hint: ComposerHint | undefined): void
  /**
   * The store the composer subscribes to for one session. Created on first
   * read from either side, so a plugin may set a hint before the session's
   * composer mounts and the composer still sees it.
   * @param sessionId - the session to observe.
   * @returns that session's hint store (undefined value = no hint).
   */
  storeFor(sessionId: SessionId): SnapshotStore<ComposerHint | undefined>
  /**
   * Drop one session's store. The session scope's disposer may call this; a
   * hint owner never needs to.
   * @param sessionId - the session being torn down.
   */
  forget(sessionId: SessionId): void
}

/** The per-session composer-hint registry (one instance per plugin fiber). */
export class ComposerHintRegistry implements ComposerHints {
  private readonly stores = new Map<SessionId, SnapshotStore<ComposerHint | undefined>>()

  /** @inheritdoc */
  set(sessionId: SessionId, hint: ComposerHint | undefined): void {
    const store = this.storeFor(sessionId)
    const current = store.getSnapshot()
    if (current?.placeholder === hint?.placeholder) return
    store.set(hint)
  }

  /** @inheritdoc */
  storeFor(sessionId: SessionId): SnapshotStore<ComposerHint | undefined> {
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) return existing
    const created = createSnapshotStore<ComposerHint | undefined>(undefined)
    this.stores.set(sessionId, created)
    return created
  }

  /** @inheritdoc */
  forget(sessionId: SessionId): void {
    this.stores.delete(sessionId)
  }
}
