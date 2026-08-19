# Agent Note: Mode skill pins and preset-local catalogs

Status: implemented

English | [中文](2026-08-16-mode-skill-pins-and-preset-local-catalog.zh.md)

## Problem

The composer `+` menu listed every user-invocable skill the session could see. Beginner modes mounted `skill-filesystem` with the default `includeDefaultRoots: true`, so `~/.agents/skills` and the workspace appeared beside the one shipped domain skill. Clicking a mode card changed the persona but did not put that mode's methods into the next message, so a beginner who picked 做网页 still had to discover `/build-a-page` themselves.

## Decision

**Preset-local catalogs.** Every shipped beginner mode sets `includeDefaultRoots: false` on its `skill-filesystem` row and keeps two `customSkillDirs`: the mode's own `skills/` and the shared `../../skills/` root (`vision` and `fit`). `+` therefore lists that mode's domain skills plus those shared skills, not the operator's personal Cursor or Cloudflare skills.

**Three original skills per mode.** Each mode ships its original domain skill plus two companions written in Chinese for this product. The companions take direction from widely used public skills (notably Anthropic's `frontend-design` for 做网页's `look-distinct`) and do not copy those files. Shared skills `vision` and `fit` stay in the catalog and in `+`; they are never auto-pinned.

**Composer tags arm the mode.** `@deepseek-ai/dsh-client-ui-agent-preset` occupies `conversation.input.dock` at order 25 with `SkillPins`. On catalog load and on `agent-preset/selected`, it pins up to three skills that are not in `SHARED_SKILL_IDS` and not catalog-only companions, and writes their `/name` tokens into the draft. The host `dsh-tool-skill` pre-step already injects every such token. The chip label is the catalog description text before the first `：`, so 学习答疑 shows 讲明白; `check-understanding` and `work-an-example` stay in `+` ([empty-session defaults](2026-08-19-workbench-empty-session-and-turn-actions.md)). Dismissing a chip removes that token; clicking it again puts the token back. Switching mode replaces the previous mode's tokens and leaves unrelated ones (`/vision`, `/fit`) and the user's prose.

| Mode | Pins |
|---|---|
| `web-page` | `build-a-page`, `look-distinct`, `check-on-phone` |
| `writing` | `draft-and-revise`, `write-plain`, `keep-the-facts` |
| `sheet` | `clean-a-sheet`, `read-the-numbers`, `make-a-chart` |
| `files` | `tidy-files`, `name-clearly`, `find-twins` |
| `study` | `explain-clearly` (`check-understanding` and `work-an-example` stay in `+`) |
| `slides` | `make-a-deck`, `one-point`, `speak-the-deck` |
| `autopilot` | `set-up-a-routine`, `check-it-ran`, `safe-batch` |
| `briefing` | `source-roster`, `draft-a-brief`, `keep-the-source` |

## Alternatives considered

**Keep default roots and filter the `+` menu in the browser.** Rejected: the catalog would still inject personal skills into the model-facing `skill` tool, and a filter would hide a capability the session still had.

**Pin `vision` or `fit` with the mode skills.** Rejected: image work and the deliverable fitness check are optional on a short spoken turn; auto-injecting them wastes context. The [global fit skill](2026-08-19-global-fit-skill.md) owns `fit`.

**A new send hook that prepends names the draft does not show.** Rejected: the host already treats `/name` in the user message as the invocation gesture, and the existing text-ref decoration already marks those tokens. A second wire path would diverge TUI, ACP, and Web.

**Copy Anthropic `frontend-design` or other GitHub skill files into the tree.** Rejected: those files are third-party copyright. The shipped skills are original Chinese instructions that keep only the public idea (pick a look before writing CSS; check understanding after teaching).

## Consequences

- A developer machine with `~/.agents/skills` no longer pollutes the beginner `+` menu or the model catalog on Web.
- A workspace `.agents/skills` file is invisible to shipped modes until someone turns `includeDefaultRoots` back on.
- Sending from a blank composer that already holds pin tokens delivers those skills with no other user prose; the send button is enabled once the pins land.
- Adding a fourth domain skill to a mode does not pin it unless it sorts into the first three after the primary-skill rank.

## Testing

`packages/client/ui-agent-preset` unit tests pin draft swap/remove, catalog-to-pin mapping (shared skills and study companions dropped, cap 3 on other modes), dock registration, tag toggle, and the briefing primary pin. `apps/cli/tests/web-agent-presets.e2e.ts` pins the three-plus-shared catalogs on `study`, `web-page`, and `briefing`, and that a workspace `.dsh/skills` file stays out of a beginner mode catalog. `apps/web/tests/agent-preset-selection.e2e.ts` pins the writing pin row, the study pin row (only `explain-clearly`), the matching slash catalogs, and the absence of a seeded workspace skill.
