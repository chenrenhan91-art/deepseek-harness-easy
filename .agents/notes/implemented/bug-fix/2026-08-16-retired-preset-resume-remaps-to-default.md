# Agent Note: Retired preset resume remaps to the default

Status: implemented

English | [中文](2026-08-16-retired-preset-resume-remaps-to-default.zh.md)

## Problem

The beginner Web roster deleted `standard`, `code`, `minimal`, and `cordis` ([beginner Web workbench](../feature/2026-08-15-beginner-web-workbench.md)). Sessions created under those ids still record them. Opening one called `agentFor`, which composed the stored id and failed with `preset "standard" not found`. The mode grid's click path is `agentPreset.select`, and select resumes the agent first, so a card click on that blank session died on the same error. A settings document that still named `standard` as the user default would have failed every nameless create the same way.

## Decision

Three recoveries:

- `AgentPresets.resolve()` with no id retries `config.default` when `defaultId` is absent from the roster. An explicit id that is one of the retired shipped names (`standard`, `code`, `minimal`, `cordis`, `learn-code`) does the same, because resume, select, and mount all go through `resolve` and a leftover `standard` session would otherwise fail every one of them. Any other explicit id still throws.
- Gateway `composeAgent` remaps a **recorded** id by roster membership, not `instanceof UnknownPresetError` (a second package copy would miss the class and rethrow `preset "standard" not found`). `session.create` and `agentPreset.select` still fail loud on an explicit unknown id.
- The mode grid does not call `agentPreset.select` on a session whose recorded preset is missing from the roster. That select would resume the retired identity and fail. A click mints a new blank session with `session.create({ agentPreset })` and opens it. New Session also skips reuse of a blank that still names `standard`, `code`, `minimal`, `cordis`, or `learn-code`, so the sidebar action does not land on the same identity again.

The mode grid ignores a current-session preset that is not on the roster and shows the deployment default. A started session whose preset is still on the roster stays locked (`agent-preset-locked`); a click in that state also mints a new session so the card still switches the composition the user will talk to.

The log of the retired session is not rewritten on remap.

## Alternatives considered

**Alias each retired id onto a successor (`standard` → `study`, `code` → `learn-code`).** Rejected: the eight modes share one tool roster, and a deleted user preset would still need a generic fallback. The unnamed default is one rule.

**Only remap on resume and keep applying `select` to the same session.** Rejected for the click path: `select` resumes the retired identity first, and that is the error the card click surfaces. Minting a session that already names the pick does not touch the old identity.

**Rewrite the log on remap.** Rejected: `agent-preset/selected` is a blank-session choice. A started session's earlier turns ran under the retired composition; appending a new id would make every later reconstruct claim the default for the whole history.

## Consequences

- A session recorded under a deleted shipped id opens on `study` (the Web deployment default). Clicking a mode card starts a new blank session in that mode rather than recomposing the retired identity.
- A stale `agent-presets.default` setting no longer fails every new session; `agentPreset.list` marks the resolved default, not the raw settings string.
- An explicit request for a missing id is still `agent-preset-not-found`.

## Testing

`packages/preset/agent-presets/tests/settings.spec.ts` pins the unnamed resolve fallback and the still-loud explicit id, including `learn-code`. `packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts` resumes a cold `standard` session against a `study`/`writing` roster and selects `writing`. `packages/client/ui-agent-preset/tests/apply.client.spec.ts` opens the grid on `study` when the current session still names `standard`, and mints a `writing` session instead of calling `select` on that retired row or on a started session. `packages/client/runtime/tests/workspaces-service.client.spec.ts` skips New Session reuse of a blank that still names `standard` or `learn-code`.
