# Agent Note: Calendar daily and weekly Schedule

Status: implemented

English | [中文](2026-08-15-calendar-schedule-page.zh.md)

## Problem

Beginners ask for “every day at 09:00,” but version-1 recurrence was only creation-aligned `every_seconds`. Mapping that request onto a 86400-second interval would fire at the creation clock, not at a morning wall time. Restoring Cron would reopen the evaluator, grammar, and tzdata replay surface already removed in [bounded fixed-rate Schedule](../simplification/2026-08-09-bounded-fixed-rate-schedule.md).

The first beginner Web option also mixed one-shot delays with those intervals on the new-session chip row. That layout could not teach a real daily clock, and it competed with the first message.

## Decision

Schedule adds two Session-local durable kinds beside After, At, and Every. They are local-clock rules, not Cron.

**Daily.** `{ time: "HH:mm:ss", timeZone, scheduledAt }`. `time` is a canonical local clock; `timeZone` is canonical `UTC` or IANA Area/Location. `scheduledAt` is the next matching UTC instant.

**Weekly.** The same clock and zone, plus a non-empty sorted unique ISO weekday list (Monday = 1 through Sunday = 7).

Create input is `{ time: "HH:mm" | "HH:mm:ss", time_zone }` for daily, plus `weekdays` for weekly. `schedule_create` still requires exactly one selector among `after_seconds`, `at`, `every_seconds`, `daily`, and `weekly`. `/schedule daily <HH:mm[:ss]> <IANA-zone> <prompt>` and `/schedule weekly <1-7[,…]> <HH:mm[:ss]> <IANA-zone> <prompt>` share those transactions. After, At, Every, and delete remain for the model and the command palette.

Calendar search reuses Schedule's local-clock resolution. A daylight-saving gap has no instant for that clock on that date, so the owner walks to the next matching date where the clock exists. An overlap still chooses the earlier instant. Unlike one-shot `at`, a gap does not reject create.

Dispatch matches Every: one `id + acceptedAt` transition, latest-only catch-up, no enumeration of missed days, and termination when no later four-digit-year target exists. When no one-shot is due, overdue Every, daily, and weekly records share one `[SCHEDULE REMINDER BATCH]` follow-up. The `schedule` projection carries `time`, `timeZone`, and weekly `weekdays`; wall-clock overdue remains a UI read.

**Beginner page.** `@deepseek-ai/dsh-client-ui-schedule` occupies only `sidebar.session.action` (list, session-maybe) under New Session. The control opens a Settings-like overlay over the conversation column; the sidebar stays visible. The page defaults to daily at 09:00 in the browser IANA zone, offers weekly weekday chips, lists only daily and weekly items, and writes `/schedule daily|weekly|delete`. One-shot and `every_seconds` stay off this page. Before a workspace session exists the action is visible, the form tells the user to choose a workspace, and submit is disabled. Delivery remains an ordinary later turn in this conversation; keep DeepSeek Harness open ([conversational delivery](../simplification/2026-08-09-conversational-schedule-delivery.md), [beginner write path](./2026-08-15-web-beginner-schedule-surface.md)).

## Alternatives considered

**Restore Cron.** Rejected: a general expression language, evaluator dependency, and tzdata replay policy are still disproportionate to “09:00 each morning.” Daily and weekly clocks cover that request without a Cron grammar.

**Teach “every day at 9” as `every_seconds: 86400`.** Rejected: that interval is creation-aligned and would lie about a wall-clock morning.

**Keep the new-session Reminder chip and dock list.** Rejected: one-shot chips cannot express a daily clock, and the form competed with the first message. The overlay is the beginner seat; `/schedule after|at|every` remains for models and the command palette.

**OS, email, or push notification, or a cross-session global task store.** Rejected: Session-local `schedule/change` and live-process delivery remain the product boundary.

**A second Host write Remote.** Rejected: `/schedule` already serializes with due work and persistence barriers.

## Verification

Schedule package tests pin daily and weekly create, next and latest occurrence, DST gap skip and overlap, latest-only catch-up, command parse, tool selectors, projection fields, and a recurring batch that includes a calendar record. Client tests pin overlay open and close, missing-workspace disable, daily and weekly submit, list cancel, and inline failures. Keyless assembled Web snapshots cover the sidebar Scheduled control opening the page and create-then-cancel through that form.

## Consequences

- “Every day at 09:00” is a durable local clock, not 86400 seconds from creation.
- Cron expressions remain absent; adding them would still be a new product boundary.
- One-shot and fixed-rate rules remain in the protocol and `/schedule`, but the beginner page does not offer them.
- Users must keep DeepSeek Harness open. Missed days contribute only the latest due occurrence.
- Delivery still has no receipt UI.
