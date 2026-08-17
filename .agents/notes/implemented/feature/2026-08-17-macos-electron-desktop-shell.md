# Agent Note: macOS Electron desktop shell

Status: implemented

English | [中文](2026-08-17-macos-electron-desktop-shell.zh.md)

## Problem

Beginners who give this fork's git URL to an agent still end without a Finder icon they can click later. `pnpm dsh web` leaves a terminal and a system browser. A GitHub Release `.app` is unsigned and Gatekeeper-quarantined, so it cannot be the clickable form.

## Decision

**On the user's Mac, after clone and build, `pnpm run desktop:install` writes `~/Desktop/DeepSeek Harness.app` and opens an Electron window that loads this checkout's `pnpm dsh web` at `http://127.0.0.1:3080`.** The `.app` is created on this machine, so it is not internet-quarantined the way a downloaded Release zip is. The launcher bakes absolute paths to the clone, Node, pnpm, and the Electron binary because a Finder launch has a tiny PATH.

```sh
pnpm run desktop:install
```

`@deepseek-ai/dsh-desktop` (`apps/desktop`) owns the shell. It is not a Cordis plugin and does not replace source-run: `pnpm dsh web` still starts the server ([source run without a managed installer](../simplification/2026-08-10-source-run-without-managed-installer.md)). The unsigned Release zip still opens the system browser ([desktop release pack](2026-08-16-desktop-release-pack.md)). Agents follow [INSTALL.md](../../../../INSTALL.md) ([AI-assisted source install](2026-08-16-ai-assisted-source-install.md)).

This shell is unsigned and macOS-only. It does not notarize, does not copy into `/Applications`, and does not ship Windows Electron.

## Alternatives considered

**Keep the system browser after `pnpm dsh web` as the only Mac beginner end state.** Rejected: the user asked for a Desktop icon they can click after an agent installs from the git URL.

**Ship a signed Electron zip from GitHub Releases.** Rejected: this fork has no Apple Developer signing pipeline, and a downloaded unsigned `.app` is the Gatekeeper failure the clone path exists to avoid.

**Tauri or a WKWebView shell without Electron.** Rejected for this pass: Electron was the requested framework and loads the existing Web UI without a second frontend.

**A managed installer that copies into `/Applications`.** Rejected: source-run without a managed installer still holds; the `.app` is a pointer at this checkout.

## Consequences

- Electron's install script is listed in `pnpm-workspace.yaml` `allowBuilds`; CI downloads the Electron binary on every platform.
- Moving or deleting the checkout breaks the Desktop icon until `desktop:install` is run again.
- Windows beginners still use the exe zip or `pnpm dsh web`.
- Closing the Electron window stops a `dsh web` child this shell started; it does not stop a server that was already listening.

## Verification

- `apps/desktop/tests/desktop.spec.ts` pins spawn argv, Info.plist/launcher install into a temp directory, listen polling, and baked-path quoting.
- `scripts/install-docs.spec.ts` requires `desktop:install` in INSTALL.md, both READMEs, and `llms.txt`, and requires the user paste fence to match across those files.
