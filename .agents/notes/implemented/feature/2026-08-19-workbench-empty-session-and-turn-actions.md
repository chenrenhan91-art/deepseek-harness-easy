# Agent Note: Empty-session mode prompts, regenerate, and HTML auto-open

Status: implemented

English | [中文](2026-08-19-workbench-empty-session-and-turn-actions.zh.md)

> Scope: beginner Web workbench first-batch UX. Study pins, per-mode hero copy, assistant-row regenerate, and opening a 做网页 / 做 PPT HTML file after the turn ends. Not in scope: in-app iframe preview, pinning `vision`, or editing a sent user message. Origin conversation changes are the no-op-unless-composed hint and assistant-action fields, plus the plus launcher always opening at leading position.

## Problem

The default 学习答疑 mode armed three skills on every send, so a short question became a quiz plus a worked example. The hero placeholder stayed "描述你想要构建的内容" for every mode. After a reply, the only way to try again was to retype or find 分支. 做网页 / 做 PPT wrote an HTML file the chips could open, but nothing opened it when the turn finished, so a beginner still asked where to look.

## Decision

**Study pins only `explain-clearly`.** `modePins` drops `check-understanding` and `work-an-example` from the auto-armed row. They remain in the mode catalog and in `+`. Other beginner modes still pin up to three domain skills. The [mode skill pins](2026-08-16-mode-skill-pins-and-preset-local-catalog.md) decision still owns catalogs, `vision`, and the `/name` gesture; this note owns the study default.

**Each shipped mode owns a hero placeholder and two empty-session examples.** `ui-agent-preset` publishes those strings through `ctx.conversation.hints` and the pin card. ConversationRoot reads a hint only while the hero bar is live, so a plan or steer placeholder still wins on the docked composer. A custom or unknown preset keeps the generic hero copy and no examples. Clicking an example prepends it to the armed `/name` tokens.

**再生成 resends this Turn's user sentence.** `TurnTailNodeView` reads that text from the Turn-local Location index and whether this Node is the last Chat Node of the latest idle Turn, then passes `promptText` / `regenerable` into `conversation.chat.assistant-actions`. The beginner plugin registers a text control at order 0. Missing prompt text hides it; an older or running Turn shows it disabled with a tooltip. Click calls `conversation.send` on the current session, verbatim, including pin tokens. Fork remains the way to compare two versions.

**做网页 / 做 PPT open the HTML file when the latest Turn goes idle.** `ProducedFiles` picks the first produced path whose basename is `.html` / `.htm` / `.xhtml`, calls the same owner `openFile` the chips use, and shows 已在浏览器打开 {name}. A remote Web client cannot open a Host path; it shows the path instead. History load starts with `wasRunning` false, so a settled row does not open. The [produced-file opener](2026-07-31-web-workspace-file-links.md) still owns Host `openPath` and the rejection of iframe preview.

## Alternatives considered

**Keep three study pins and tell the skills not to quiz.** Rejected: the host still injects three full SKILL.md bodies, and the model still sees "出一道小题" as the job. Dropping the pins is the only way the default send matches "只要答案就停".

**Open `+` as inline whenever the draft is non-empty.** Rejected: `/explain-clearly` is non-empty, so `/plan` disappeared from the command directory. The plus button always opens at leading position with an empty query, and the pick span covers the whole draft so a `/plan` claim can replace pin tokens.

**Put the mode placeholder on the docked composer too.** Rejected: plan and steer copy would lose to a mode sentence that is only meaningful on the empty-session screen.

**Regenerate by forking, then sending.** Rejected: fork is the compare-two-versions gesture. Resend on the current session is the one beginners ask for.

**A module-level set of already-opened paths.** Rejected: it leaks across tests and sessions. A per-instance ref plus the running-to-idle edge is enough to stop Strict Mode double-open and history load.

**Open every HTML file every mode produces.** Rejected: a study explanation that happens to write a page should not steal the window. Only `web-page` and `slides` auto-open.

## Consequences

A blank 学习答疑 session shows one 讲明白 pin, the placeholder 你卡在哪一步？, and two example buttons. `+` still lists 真懂了吗 and 带做一道, and still lists `/plan` because the plus launcher always opens the command directory at leading position over the whole draft even while `/explain-clearly` occupies the composer. Assistant replies that have a Turn-local user sentence show 再生成. Local 做网页 / 做 PPT turns open the HTML file in the default browser when they finish; remote Web shows the path. `ComposerHints` and the assistant-actions owner fields are no-ops unless a beginner plugin is composed.

## Testing

`packages/client/ui-agent-preset` pins study catalog mapping, example click, regenerate send and unavailable, and `conversation.hints.set`. `packages/client/ui-conversation` pins the hint registry, hero placeholder, `turnPromptText`, and that plus opens at leading position with pin tokens in the draft. `packages/client/ui-deliverables` pins the HTML path picker, the running-to-idle edge, history load, and remote copy. `apps/web/tests/snapshots/lifecycle-chrome/hero.expected.md` pins the one-pin study row and the two examples; `agent-preset-selection.e2e.ts` pins companions still in `+`. `skill-invocation-policy.e2e.ts` pins workspace skills stay out of `/explain`; `skill-user-invoke.e2e.ts` claims `/explain-clearly` through the composer.
