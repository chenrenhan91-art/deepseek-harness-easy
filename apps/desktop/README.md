# `@deepseek-ai/dsh-desktop`

English | [中文](README.zh.md)

macOS Electron shell around `pnpm dsh web`. After a source build, `pnpm run desktop:install` writes `~/Desktop/DeepSeek Harness.app` for this checkout and opens a native window on `http://127.0.0.1:3080`. The beginner procedure is [INSTALL.md](../../INSTALL.md).

## Install

From the repository root, after `pnpm install` and `pnpm run build`:

```sh
pnpm run desktop:install
```

The installer is macOS-only. It bakes absolute paths to this clone, Node, pnpm, and Electron. Moving the clone requires running the command again. The `.app` is unsigned and is meant to be created on the user's machine, not downloaded.

## Run

The window loads only after `GET /` returns 200 HTML whose `window.__DSH_BOOT__` graph includes the client provider roots; a port that merely accepts connections is not enough. `pnpm run desktop` starts Electron without rewriting the Desktop icon. Closing the window stops an owned `dsh web` child; it does not stop a server that was already listening.

## Limits

This app is not a Cordis plugin. It does not sign or notarize, does not install into `/Applications`, and does not ship a Windows Electron build. The Release zip launcher still opens the system browser.
