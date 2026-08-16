# Agent Note: Web beginner schedule surface

Status: implemented

English | [中文](2026-08-15-web-beginner-schedule-surface.zh.md)

## Problem

A reminder already has a Session-local protocol, but the shipped Web new-session screen offered no management UI. A beginner had to ask the model or invent a `/schedule` line. That gap invited a second product: a calendar cron, an OS notification, or a durable delivery receipt, each of which reopens a rejected Schedule boundary.

## Decision

The existing `@deepseek-ai/dsh-schedule` package remains the only reminder authority. This change adds a human write path and a management list; it does not add a scheduler, a wake-from-cold path, or a second meaning of delivery ([conversational delivery](../simplification/2026-08-09-conversational-schedule-delivery.md), [durable Session-local reminders](./2026-08-05-durable-web-schedule.md)).

**Shared create and delete.** `/schedule` calls the same transactions as `schedule_create` and `schedule_delete`. Only a live root that received a Schedule runtime accepts the command. Usage and parser errors stay in the command result; durable failures reuse the tool error codes. Daily and weekly verbs are owned by [calendar daily and weekly Schedule](./2026-08-15-calendar-schedule-page.md).

**Management projection, not a receipt.** The optional `schedule` unit folds active records from `schedule/change` and serves `{ items }` without `scheduled` / `overdue`. Wall-clock state stays a UI read. A corrupt event keeps the prior fold. Capability absence is the key's absence, never an empty value.

**Declared seat plus a beginner option.** `ui-sidebar` declares `sidebar.session.action` (list, session-maybe) under New Session. `@deepseek-ai/dsh-client-ui-schedule` occupies that seat with a **Scheduled** control that opens an overlay page over the conversation column. `ui-conversation` does not declare `conversation.hero.schedule` or a schedule dock. Before a workspace session exists the sidebar action stays visible; the page tells the user to choose a workspace, submit stays disabled, and `/schedule` is not sent. Writes go through `command.execute`. The overlay form, daily/weekly records, and list copy are owned by [calendar daily and weekly Schedule](./2026-08-15-calendar-schedule-page.md).

**Shipped Web composition.** The Web patch loads `@deepseek-ai/dsh-time-context`, `@deepseek-ai/dsh-schedule`, and the schedule page plugin. Headless default compositions still omit them. [`examples/web-schedule`](../../../../examples/web-schedule/README.md) restates the two Host rows so `dsh web --patch examples/web-schedule/cordis.yml` remains valid.

## Alternatives considered

**Invent a Cron product on this write path.** Rejected as a general expression language. Narrow daily and weekly local clocks ship as their own durable kinds ([calendar daily and weekly Schedule](./2026-08-15-calendar-schedule-page.md)); they do not restore Cron.

**OS, email, or push notification.** Rejected: Session-local delivery is the product boundary. Cold Sessions do no work.

**An independent delivery receipt.** Already rejected. The page lists active daily and weekly records and cancels them; due work still appears only as an ordinary later turn.

**Show the control before a workspace exists.** Adopted for discovery: the sidebar action is visible on the empty Web page. Writes still need a Session that owns `schedule/change`; submit stays disabled until then.

**A new Host Remote instead of `/schedule`.** Rejected: the command channel already serializes with due work and persistence barriers. A second write API would duplicate that queue.

**Put the form only in Settings or the command palette.** The shipped beginner path is a Settings-like overlay opened from the sidebar under New Session, not a chip beside the first message.

## Verification

Schedule package tests pin `/schedule` parse and create/delete, child-agent denial, the `schedule` unit's fold and corrupt-event hold, and registration when `sessionProjections` is composed. Client tests pin the sidebar overlay, missing-workspace disable, daily and weekly lines, inline failures, and in-flight click ignoring. Conversation tests pin the absence of a hero schedule seat. Keyless assembled Web snapshots cover the sidebar Scheduled control opening the page, create-then-cancel through that form, and `/schedule` in the command menu.

## Consequences

- The sidebar can discover scheduled tasks before a workspace exists; creating one still needs a workspace session.
- Users must keep DeepSeek Harness open; the helper copy states that.
- The beginner page offers daily and weekly local clocks; one-shot and `every_seconds` remain on `/schedule` and the tools ([calendar daily and weekly Schedule](./2026-08-15-calendar-schedule-page.md)).
- Delivery still has no receipt UI. The sidebar declares a management seat; Host and persistence gain no receipt protocol.
- The web-schedule overlay is a restatement, not the only way to load Schedule.
