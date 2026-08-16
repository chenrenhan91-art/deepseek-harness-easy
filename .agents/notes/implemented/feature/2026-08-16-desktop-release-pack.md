# Agent Note: Desktop Release pack

Status: implemented

English | [中文](2026-08-16-desktop-release-pack.zh.md)

## Problem

The GitHub source ZIP cannot produce a clickable desktop icon. It has no `node_modules`, no portable Node, no built `lib/` or Web `dist`, and the repository does not ship a `.app`. A beginner without pnpm cannot start Web from that archive. A machine-local LaunchAgent that points at a developer checkout and `tsx` is not a product.

## Decision

**Reject the source ZIP as a beginner download.** Beginners take GitHub Releases assets `DeepSeek-Harness-macOS.zip` and `DeepSeek-Harness-Windows.zip`, unzip onto the Desktop, and click the DeepSeek Harness icon. That path is documented at the top of the root README.

**Keep source-run and the product pack apart.** Source checkouts still start Web with `pnpm dsh web` ([source run without a managed installer](../simplification/2026-08-10-source-run-without-managed-installer.md)). The pack is a built Web slice plus official portable Node plus a launcher under `packaging/desktop/`. `scripts/pack-desktop.ts` assembles the zips; `.github/workflows/desktop-release.yml` uploads them on a `dsh-v*` tag. The pack does not commit `.app` binaries, portable Node, or `node_modules`, and it does not change daily source launch.

**The launcher opens the system browser.** `dsh web` only prints the URL. The pack launcher starts bundled `node …/lib/bin.js web` when `127.0.0.1:3080` is not listening, then `open` / `start` that URL. It does not embed Electron or Tauri, and it does not productize a LaunchAgent or a `/Users/…` path.

**Key and top-up stay on the official console.** `ApiKeyOnboarding` links to `https://platform.deepseek.com/api_keys` and `https://platform.deepseek.com/top_up`. A later `QUOTA` / 402 workbench failure repeats the top-up link. Credentials stay in `$DSH_HOME`; they are not in git and not in the zip.

This release does not sign or notarize, does not auto-update, does not ship Linux, and does not install into `/Applications`. Unsigned first-open (Gatekeeper right-click Open; SmartScreen Run anyway) is documented in the zip and the README.

## Alternatives considered

**Ship a usable tree in the GitHub source ZIP.** Rejected: the source ZIP is the git tree. Filling it would commit `node_modules` and portable Node, or require an installer the source-run decision already refused.

**Electron or Tauri window around the same Web UI.** Rejected: the product is “open local Web in the system browser.” A second shell would add a signed-app toolchain without changing the bind or the onboarding page.

**Productize the developer LaunchAgent / Hermes `tsx` command.** Rejected: those paths are machine-local and source-only. The pack must run built `lib/bin.js` from the unzipped root.

**Teach beginners `pnpm install` from a clone.** Rejected for this audience: the requested flow is download → unzip → click. `npx` and `pnpm dsh web` remain the developer paths below the Release section.

## Verification

`packages/client/ui-settings-models/tests/onboarding-page.client.spec.tsx` pins both official links. `apps/web/tests/snapshots/onboarding-deepseek-config/missing.expected.md` records the Chinese first-run page. `packages/client/ui-conversation` tests pin a `QUOTA` turn-error link and toast. `scripts/pack-desktop.spec.ts` pins zip names, official Node dist URLs, built-bin smoke argv, and launcher templates that contain no `/Users/` checkout path.

## Consequences

- A beginner who downloads Source code (zip) still cannot click an icon; the README must keep saying so.
- Unsigned macOS/Windows first-open needs a documented extra click until signing exists.
- Pack size is hundreds of megabytes because portable Node and production dependencies travel with the zip.
- Source-run ownership, upgrade, and installer policy stay on the no-installer note; this note owns only the Release product pack and the official key/top-up links.
