# dsh-client-ui-agent-preset

English | [中文](README.zh.md)

The agent-preset surfaces: a mode grid filling the new-session screen, a General-settings row choosing which [preset](../../preset/agent-presets/README.md) later sessions are composed from, a read-only label in the session header, and the composer skill-pin tags for the mode's domain skills.

## Why it is a new-session preference

A session's preset is fixed when the session is created — the host refuses to adopt an existing session under a different one, because that session's history was produced under the first preset's tools. So neither picker can be a live switch, and the settings row says so: changing it applies to sessions started afterwards while running sessions keep the composition they began with.

## The mode grid

The first thing on the new-session screen, under the input box: one card per preset, with the preset's name, its one-sentence description, and the glyph it asked for. Cards rather than a dropdown because choosing what the agent is good at is the first decision a beginner makes and the one they are least equipped to hunt for — every option is readable at once, and the group behaves as a radio group with exactly one card chosen.

The grid opens on the deployment default and its pick is *staged* — the screen precedes the session it would apply to. The stage reaches a blank session whose recorded preset is still on the roster, which covers both the session the workspace connect created and the blank one it reused; riding along on `sessions.create` would miss the second. It is spent on first use, so the next new session opens on the default again, exactly like the workspace picker beside it. A default changed on the settings surface moves the grid too, otherwise the screen that starts the next session would keep offering the previous default until a reload.

A click that cannot recompose the current session — it has started, or it still names a preset the roster dropped — mints a new blank session already composed from the pick and opens it. `agentPreset.select` resumes the current identity first, so applying it to a retired id (`standard` after the beginner roster) is the error the card used to surface.

A preset names its glyph by name in `preset.yml` (`icon: question`). A preset naming none, or naming one this build does not draw, gets the generic glyph — an unknown name costs a plain card, never a missing one.

## Mode skill pins

On the composer, immediately above the input card: up to three tags for the current session's mode-owned skills. A pick on the grid refreshes `skill.list` and writes those `/name` tokens into the draft so the host injects the skill bodies on send. The shared `vision` skill stays in `+` and is not pinned. Dismissing a tag drops that token; switching mode replaces the previous mode's tokens and leaves the user's prose. See [mode skill pins](../../../.agents/notes/implemented/feature/2026-08-16-mode-skill-pins-and-preset-local-catalog.md).

## The session-header label

Beside the session title: the preset THIS session runs, as static chrome. A control there would promise a switch the host refuses outright. It reads the preset from the session's own summary and resolves the display name against the same roster the General row reads. Forwarded `agent-preset/selected` owner events fold committed blank-session switches into that shared summary in every tab; the initiating tab may already have applied the RPC echo, and the merge is idempotent.

## What it reads and writes

Options and the current default both come from one `agentPreset.list` call. The roster already reports which id a session with no explicit choice gets, so the row needs no settings-schema introspection; the write targets the `agent-presets` settings namespace's `default` field, which is what the host resolves at creation.

A locally authored preset is exactly as privileged as the plugins it names, so the settings list marks `user` rows rather than presenting every preset as shipped and vetted.

Display text comes from the preset's own files — `name`, `description`, and `icon` in its `preset.yml`, unlocalized and shown as written. A preset that published none is listed by its id, which is why a shipped preset states its copy in the language its deployment ships.

The row re-reads on `settings/changed` for its own namespace and on `connection/reset`: the roster is a live directory and the default is a settings field, so an external edit or a reconnect can both move it.

Setting the default writes the `agent-presets` settings namespace, which the host exposes to configuration clients ([`dsh-apiproxy`](../../host/apiproxy/README.md) keeps an explicit allowlist — a namespace outside it makes a picker move and then silently forget).

`agentPreset.list` is not loopback-pinned ([`dsh-client-connection`](../connection/README.md)): it carries ids, trust, and display metadata, and a LAN client's picker needs it.

## When the surfaces are absent

A deployment that composes no presets answers with an empty roster, and the grid, the row, and the label all render nothing — every session then shares the host composition and there is nothing to choose between. The two pickers also drop a roster row the host marked `broken`: they choose the NEXT session's composition, and offering one that cannot compose would only defer the failure to the session start.

## Model Experience

Indirectly, through the preset a later session is composed from; [`dsh-agent-presets`](../../preset/agent-presets/README.md) owns what that composition puts in front of the model.

#### KV Cache effect

No direct invalidation. Changing the default never touches a running session's prefix; a session created afterwards establishes its own prefix from its own composition.

## Known Limitations and Deferred Work

- **A preset without metadata is listed by id** — display text is optional, and a preset given no name falls back to its directory name.
- **Presets are edited in their own files** — the browser creates, copies, and deletes nothing; a deployment adds a mode by adding a directory under its preset root.
- **Composition edits are invisible to the page** — the files are edited outside the browser and nothing on the wire announces a file change, so the roster re-reads on its own actions, `settings/changed`, and `connection/reset`, not on every disk edit.
