# Agent Note: Localized slash-menu captions and the shipped vision skill

Status: implemented

English | [中文](2026-08-15-localized-slash-menu-and-vision-skill.zh.md)

## Problem

The Web slash menu showed Host command descriptions as English catalog strings even when the UI locale was Chinese, so `/model` (a client contribution) was the only localized row. The composer `+` launcher also opened only the command source, so a shipped skill could not appear in that picker.

## Decision

**Locale-owned Host captions.** `@deepseek-ai/dsh-client-ui-commands` overlays `description.<name>` from its `command` dictionaries onto Host catalog rows it knows. English copy matches the Host strings so an English locale keeps the existing menu. Unknown Host names keep the catalog string. Client contributions such as `/model` still own their own `command.description`.

**Launcher lists every `/` source.** `toggleSource` still records which chrome control opened the menu, but it seeds and fetches every source registered on that trigger. Empty ready groups stay hidden. Typing `/` and pressing `+` therefore share the same command-plus-skill roster; `@` subagent sources stay on their own trigger.

**Shipped `vision` skill.** [`apps/cli/config/skills/vision/`](../../../../apps/cli/config/skills/vision/) is a custom skill root on every shipped beginner mode (`web-page`, `writing`, `sheet`, `files`, `study`, `slides`, `autopilot`, `briefing`), mounted via `../../skills/` beside each mode's own `skills/`. The skill is user-invocable; a menu pick inserts `/vision ` and the Host pre-step injects the body. The [beginner Web workbench](./2026-08-15-beginner-web-workbench.md) owns that roster.

## Alternatives considered

**Rewrite Host `commands.register` descriptions into Chinese.** Rejected: TUI, ACP, and the English Web locale share that catalog.

**Register `/vision` as a client command contribution.** Rejected: a contribution with that name would claim `/vision` before the skill gesture, so the Host would never inject the body.

**Keep the `+` launcher command-only.** Rejected: the picker the user opens from chrome would never show a shipped skill.

## Verification

Command UI tests pin Chinese overlay of owned Host names and pass-through of unknown names. Input-trigger tests pin the launcher fetching command and skill groups together. Keyless Web goldens cover the Chinese slash menu including the Skills group when the preset mounts `vision`.

## Consequences

- Chinese Web shows localized Host command captions; English Web matches the Host catalog.
- The `+` menu can list skills. Beginner modes set `includeDefaultRoots: false`, so that list is the mode's own skills plus `vision`, not `~/.agents/skills` or the workspace ([mode skill pins](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md)).
- Changing a Host command's English catalog string requires the matching `description.*` English dictionary entry or the English menu diverges.
