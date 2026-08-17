# Agent Note: AI-assisted source install

Status: implemented

English | [中文](2026-08-16-ai-assisted-source-install.zh.md)

## Problem

An unsigned file downloaded from GitHub Releases carries macOS quarantine. Gatekeeper then shows “Apple cannot verify…” with Done and Move to Trash and often no Open button. A `.app` and a `.command` both fail that check. Beginners cannot complete “unzip and double-click” on a current Mac without an Apple Developer signature.

## Decision

**macOS beginners install by giving this repository URL to a coding agent.** The agent follows root [INSTALL.md](../../../../INSTALL.md) (Chinese [INSTALL.zh.md](../../../../INSTALL.zh.md)): shallow `git clone`, `corepack` pnpm 11.7.0, `pnpm install`, `pnpm run build`, then `pnpm run desktop:install`. That writes `~/Desktop/DeepSeek Harness.app` and opens Electron on `http://127.0.0.1:3080` ([macos electron desktop shell](2026-08-17-macos-electron-desktop-shell.md)). Git-created files are not quarantined the way a browser-downloaded zip is. The API key stays on the first-run page and the official console links. Keys and settings live in `~/.dsh`. Root `.gitignore` keeps local workbench output (`/*.html`, `/dist/`, `/.dsh/`) out of git, so one person's session files are not what the next clone receives.

Machine-readable entry points are `llms.txt`, `.github/copilot-instructions.md`, and the `dsh-user-install` skill. The root README paste block is the user-facing prompt. This does not add a managed installer ([source run without a managed installer](../simplification/2026-08-10-source-run-without-managed-installer.md)). The Windows exe zip remains optional ([desktop release pack](2026-08-16-desktop-release-pack.md)).

## Alternatives considered

**Keep teaching Control-click Open or `xattr -cr`.** Rejected as the primary path: the current dialog often has no Open control, and `xattr` is a security bypass beginners should not be taught first.

**Sign and notarize a `.app`.** Rejected for this pass: it needs an Apple Developer Program membership and a notarization pipeline this fork does not own.

**Only write `npx @deepseek-ai/dsh web`.** Rejected as the written beginner procedure: it still needs Node, and this fork’s workbench lives in the git tree (`pnpm run desktop:install` after build). `npx` would install upstream, not this checkout.

## Consequences

- A clone of this git URL is the distribution. Files produced on one machine after install stay out of git.
- A user without an agent that can run a terminal must install Node and run INSTALL.md themselves, or use Windows.
- Full `pnpm run build` on first clone takes several minutes and needs network.
- Unsigned macOS Release zips may remain in GitHub Releases; they are not the documented Mac install path.
