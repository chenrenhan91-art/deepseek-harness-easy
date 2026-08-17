# Use the Web UI

English | [中文](index.zh.md)

If the server is not running yet, an agent should follow [INSTALL.md](../../../INSTALL.md). Start the Web UI with `pnpm dsh web` or the Desktop icon; the command prints its URL. This guide begins after that server is running. The `dsh` process uses its invoking directory as the default filesystem location, but a fresh Web UI has no selected workspace until you add one.

## Configure a model

On first launch, when no provider is usable, a full-page guide asks for a DeepSeek API key, links to the official create-key and top-up pages, checks the key, and stores it. A later 402 / quota failure in the workbench repeats the official top-up link. Later you can open **Settings → Models** to add or change providers.

The [model configuration guide](./providers.md) covers other providers and custom OpenAI-compatible endpoints.

## Choose a workspace and a mode

Click **选择工作区**, add the project directory where you started `dsh`, and select it. The session composer remains unavailable until a workspace is selected. On the new-session screen, pick a mode card (the default is **学习答疑**); that choice composes the next blank session.

## Set a scheduled task

**Scheduled** sits under New Session in the sidebar. Open it, write what to do, choose daily or weekly, pick a local time, and start it after a workspace is selected. When the time comes, this conversation does that work; keep DeepSeek Harness open. One-shot reminders still go through `/schedule` or the model.

## Run a task

Start a session and send:

> Summarize this repository and identify its main packages.

The agent can read and edit workspace files, run commands, and maintain a plan. New Web sessions start in **完全放开** (full access); switching into that preset from a safer one still asks you to confirm.

## Continue

- [Configure models](./providers.md)
- [Use the Python SDK](./python-sdk.md)
- [Use other CLI modes](../../../apps/cli/README.md)
- [Develop a plugin](../develop/basic/)
