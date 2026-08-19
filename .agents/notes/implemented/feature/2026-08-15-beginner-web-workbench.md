# Agent Note: Beginner Web workbench

Status: implemented

English | [中文](2026-08-15-beginner-web-workbench.zh.md)

## Problem

The shipped Web UI was a coding-agent console: expert chrome (goals, jobs, subagents, trajectory, plugin config), English-first copy, four overlapping presets (`standard` / `code` / `minimal` / `cordis`), and a Settings detour before a first-time user could talk to a model. A person who had never used an agent had no mode cards, no proof their API key worked, and a default permission that still asked before ordinary workspace writes.

## Decision

**One beginner Web composition.** [`packages/bundle/web-app/cordis.patch.yml`](../../../../packages/bundle/web-app/cordis.patch.yml) is the Web product: it disables host rows for goals, jobs, subagents, Ralph, workflow, and plugin-config tools, and it does not load the expert client packages those rows drove. Chat is the only conversation view; view tabs hide when only Chat is composed.

**Eight modes replace the four shipped presets.** `apps/cli/config/agent-presets/` holds `web-page`, `writing`, `sheet`, `files`, `study`, `slides`, `autopilot`, and `briefing`. Each directory has Chinese `preset.yml` metadata, the same agent-plane tool roster (filesystem, shell, skill, plan, todo, web, schedule, ask-user, image read), a persona, and three original Chinese domain skills. `study` is the deployment default because it answers a question without producing files. All eight mount the shared skills at [`apps/cli/config/skills/`](../../../../apps/cli/config/skills/) (`vision` and `fit`) via `../../skills/` in addition to their own `skills/`, and set `includeDefaultRoots: false` so `+` does not list `~/.agents/skills` or the workspace. `standard`, `code`, `minimal`, `cordis`, and `learn-code` are absent from this roster. The JSON-RPC [`minimal.cordis.yml`](../../../../examples/jsonrpc-agent/minimal.cordis.yml) remains the two-tool RL composition for that launch path ([minimal-preset composition](../bug-fix/2026-08-10-minimal-preset-owns-rl-composition.md), [bare two-tool runtime](./2026-08-11-minimal-profiles-bare-two-tool-runtime.md)). Picking a mode arms its domain skills as composer tags ([mode skill pins](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md)). The eighth card is the briefing editor ([briefing mode](./2026-08-17-briefing-mode-replaces-learn-code.md)).

**Mode cards on the new-session screen.** `@deepseek-ai/dsh-client-ui-agent-preset` occupies `conversation.hero.modes` with a radio-group of cards. The pick is staged until a blank session exists. A started session is refused (`agent-preset-locked`). Display text comes from each `preset.yml` as written.

**Full-page API-key guide.** After the versioned welcome notice (`OnboardingModal`), `ui-settings-models` renders `ApiKeyOnboarding` over the whole viewport when no provider is usable. The page links to the official create-key and top-up pages, probes the key with `llm.discoverModels` before `credentials.set`, and states that a working key lets the assistant act under the session's permission preset. A later `QUOTA` / 402 failure in the workbench repeats the official top-up link. Skipping completes only the coordinator pass. The welcome notice still uses the shared modal ([shared-modal onboarding](./2026-08-13-shared-modal-product-onboarding.md)); this note owns the credential page. The desktop Release pack is a separate distribution path ([desktop release pack](./2026-08-16-desktop-release-pack.md)).

**Chinese-first Web.** The locale plugin's `Config` is `LocaleSettingsSchema`; the Web patch sets `preference: zh` as the settings base. Dictionaries, not client fallbacks, own visible strings. The pre-plugin boot page hard-codes `正在加载插件…` / `加载插件失败` because the locale plugin has not activated. Permission pickers render the host `name` unchanged ([Full access confirmation](./2026-07-31-gui-full-access-confirmation.md)): the Web patch writes `只读` / `工作区可写` / `完全放开`, so those labels appear even when the UI locale is English. Confirmation copy stays locale-owned (`确认启用完全放开？` / `Enable Full access?`).

**Full access is the Web session default.** The Web permission row (outside `insert:`, so it overrides the base row's whole config) sets `defaultPreset: danger-full-access`. A fresh session pins that preset; `sandbox-policy.defaultMode` and `approval.config.policy` on the process remain the base `workspace-write` / `ask` until the session pin applies ([workspace-write defaults](./2026-07-31-workspace-write-surface-default.md)). Switching into `danger-full-access` from another preset still requires the acknowledgement dialog.

## Alternatives considered

**Keep expert chrome behind an advanced toggle.** Rejected: a toggle is a second product the beginner still has to discover, and the stripped packages had no beginner job.

**Localize by rewriting Host command and permission catalogs into Chinese.** Rejected: TUI, ACP, and an English Web locale share those catalogs. Client dictionaries overlay known Host command descriptions; permission names are host config because the Web assembly is the product that ships Chinese labels.

**Probe the key only after the first failed model turn.** Rejected: a typo would look like a model or network failure. `llm.discoverModels` with this key is the same listing the Models page already uses.

**Default to `workspace-write` on Web as on the base.** Rejected for this product: a beginner who just pasted a key and picked a mode should not be interrupted on the first file write. The acknowledgement dialog remains the gate when leaving a safer preset.

**Give each mode a different tool set.** Rejected: the mode is persona plus skills. Divergent catalogs make "switch mode" a capability change the header label cannot explain.

## Verification

`apps/cli/tests/web-agent-presets.e2e.ts` boots the shipped Web patches and pins the eight-mode roster, default `study`, shared vision mount, and identical tool names across modes. `apps/web/tests/shipped-composition.e2e.ts` pins the beginner catalog (plus packaged `glob` / `grep`), `permissionPresets.defaultPreset === 'danger-full-access'`, and process `sandboxPolicy.defaultMode === 'workspace-write'`. Client tests pin host-name permission labels, the 完全放开 confirmation copy, the mode grid, the API-key probe, and the official create-key / top-up links. Keyless assembled Web snapshots cover onboarding, the mode grid, the Access chip, and Chinese chrome; refresh them with `pnpm run test:web:refresh`.

## Consequences

- Web is a Chinese beginner workbench. Expert surfaces (goals, jobs, subagents, trajectory, plugin config, Ralph, workflow) are not composed. Reintroducing one is a new product decision, not a missing row.
- A user-authored preset that claims a shipped id still loses to the earlier system root (`study` shadows a home `study`).
- English UI locale does not English the permission chip: names live on the Web permission row.
- The JSON-RPC minimal example is the remaining two-tool RL composition; Web no longer ships `minimal`.
- A session or settings default that still names a deleted shipped id (`standard` / `code` / `minimal` / `cordis` / `learn-code`) remaps through the unnamed default rather than refusing to open ([retired-preset resume](../bug-fix/2026-08-16-retired-preset-resume-remaps-to-default.md)).
- Windows: each beginner mode gates `tool-bash` / `tool-pwsh` with interpolated `disabled`, same as the former general-purpose presets ([loader `disabled` interpolation](../architecture/2026-08-11-loader-entry-disabled-interpolation.md)).
