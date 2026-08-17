# Agent Note: Briefing mode replaces learn-code

Status: implemented

English | [中文](2026-08-17-briefing-mode-replaces-learn-code.zh.md)

## Problem

The eighth beginner card taught programming by editing a tiny runnable project. Operators collecting AI, finance, and tech updates from public and open-source channels had to fight a coding-coach persona, or leave the eight-card roster.

## Decision

**The eighth card is 资讯收集 (`briefing`).** [`apps/cli/config/agent-presets/briefing/`](../../../../apps/cli/config/agent-presets/briefing/) occupies `order: 8` in place of `learn-code`. The roster stays eight modes; `study` remains the deployment default. Card copy is `资讯收集` / `整理 AI、金融、科技的公开信源，写成短简报`, with `icon: search`. The agent plane is unchanged: persona plus three Chinese skills plus shared `vision`.

**Chat briefing first.** The persona and `draft-a-brief` write a short grouped brief in the conversation. A workspace `.md` is written only when the user asks to keep it. Each item is title, why it matters, and an original URL, grouped under AI / 金融 / 科技 when that group has items. There is no delta-versus-last-time section and no suggested follow-up.

**Builtin public roster, on demand.** `source-roster` lists public GitHub releases, official blogs, arXiv recent lists, and official public data pages (FRED, SEC EDGAR). Extra sources are allowed only when they are similarly public, official, or open-source and `web_fetch` can open them. `keep-the-source` drops any item whose original page cannot be fetched. The mode does not set up daily or weekly schedules; that job stays on 电脑自动化.

**`learn-code` remaps like the other deleted shipped ids.** `RETIRED_SHIPPED_PRESET_IDS` includes `learn-code`, so a leftover session or settings default under that id opens on the unnamed deployment default rather than failing, and is not aliased onto `briefing` ([retired-preset resume](../bug-fix/2026-08-16-retired-preset-resume-remaps-to-default.md)).

The eight-mode roster remains owned by the [beginner Web workbench](./2026-08-15-beginner-web-workbench.md). Pin names are owned by [mode skill pins](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md).

## Alternatives considered

**Keep 学编程 and add 资讯收集 as a ninth card.** Rejected: the product is an eight-card beginner grid; a ninth card would change the first-screen density without retiring the unused coaching mode.

**Keep the directory id `learn-code` and only change copy and skills.** Rejected: leftover programming-coach sessions would silently become briefing sessions, and the id would keep teaching the wrong job.

**Alias `learn-code` onto `briefing`.** Rejected: a started 学编程 transcript is not a briefing history. The unnamed default is already the one rule for deleted shipped ids.

**Teach 定时任务 for a daily or weekly brief.** Rejected: this mode is one brief when the user asks. Recurring fetch belongs to 电脑自动化.

**A longer brief (delta versus last time, suggested follow-ups, always write a file).** Rejected: the requested deliverable is a short chat brief with a file only on request.

## Consequences

- The mode grid's last card is 资讯收集. A session that still names `learn-code` opens on `study`.
- Finance coverage is thinner than AI because public OSS product channels are fewer; unsourced market tips are out of scope.
- `PRIMARY_PINS` leads the briefing row with `source-roster`, so the chips read 公开信源 / 出短简报 / 核对出处 after companion alphabetical order.

## Testing

`apps/cli/tests/web-agent-presets.e2e.ts` pins the eight-id roster ending in `briefing` and the `source-roster` / `draft-a-brief` / `keep-the-source` / `vision` catalog. `apps/web/tests/agent-preset-selection.e2e.ts` and the lifecycle-chrome goldens pin the 资讯收集 card copy. `packages/preset/agent-presets/tests/settings.spec.ts` and `packages/client/runtime/tests/workspaces-service.client.spec.ts` pin `learn-code` as a retired shipped id.
