# @deepseek-ai/dsh-client-ui-schedule

English | [中文](README.zh.md)

Beginner calendar schedule page, a pure browser surface plugin. The browser half occupies `sidebar.session.action` under New Session and opens an overlay over the conversation column; the node half is an empty apply. Schedule behavior itself — the management tools, the `/schedule` command, the `schedule` projection unit, and session-local delivery — is owned by [`@deepseek-ai/dsh-schedule`](../../schedule/schedule/README.md).

The sidebar action stays visible before a workspace exists. The page then asks the user to choose a workspace; submit stays disabled until `useProjection('schedule')` is defined. After that, the form asks what to do, whether to repeat daily or weekly, and a local `HH:mm` in the browser IANA zone. Defaults are daily at 09:00. Writes go through `command.execute` as `/schedule daily|weekly|delete` lines. The list shows only daily and weekly items, with cancel. One-shot and `every_seconds` remain on `/schedule` and the tools, not on this page.

Admission failures and transport faults surface as an inline English error (error-surface policy). Delivery still appears only as an ordinary later turn; this package is a management surface, not a receipt.

## Model Experience

Indirectly, through the `/schedule` command line the page dispatches: `@deepseek-ai/dsh-schedule` owns the model-visible tools, reminder framing, and the logged `schedule/change` stream that line drives. The page itself adds no prompt content.

#### KV Cache effect

None. Creating or deleting a reminder appends Session events after existing history and does not change the request prefix.

## Known Limitations and Deferred Work

- **Session-local only** — a reminder runs on time only while this Session is live; keep DeepSeek Harness open. There is no OS, email, or push notification.
- **Daily and weekly clocks, not Cron** — the page does not accept arbitrary Cron expressions, one-shot delays, or creation-aligned `every_seconds`.
- **No delivery receipt** — due work enters the ordinary transcript; this page does not render a second acknowledgement.
