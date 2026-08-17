# Install DeepSeek Harness (for people and coding agents)

English | [中文](INSTALL.zh.md)

This is the supported way to get the workbench running on a Mac. Other people clone this git URL; they do not need files from your computer. Unsigned Release zips (`.app`, `.command`) are blocked by Gatekeeper and are not the install path. Windows may still use the [Release exe zip](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases).

## What the user should paste to an agent

Tell the user to send this repository URL plus the following request to Cursor, Claude, or any agent that can run a terminal:

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm run desktop:install。
不要下 GitHub 的 Source code zip，也不要把 GitHub Release 里未签名的 .command 或 .app 当成安装方式。
不要提交或推送本机产生的文件（.env、API Key、网页成品、lib、dist）。
```

## Agent procedure

Do this on the user's machine. Do not skip a failing step.

1. Confirm `git` and Node.js `^22.19 || >=24` (`node -v`). If Node is missing, install it from https://nodejs.org and re-check. Enable pnpm with `corepack enable` then `corepack prepare pnpm@11.7.0 --activate`.
2. Clone a shallow checkout into a writable folder the user can find (Desktop is fine):

```sh
git clone --depth 1 https://github.com/chenrenhan91-art/deepseek-harness-easy.git
cd deepseek-harness-easy
```

3. Install and build. `pnpm run build` can take several minutes.

```sh
pnpm install
pnpm run build
```

4. On macOS, write the Desktop icon and open the workbench window:

```sh
pnpm run desktop:install
```

That command creates `~/Desktop/DeepSeek Harness.app` (Finder still uses that path when the sidebar says 桌面) and opens an Electron window on `http://127.0.0.1:3080`. Leave that window in front of the user. If the command prints that it only supports macOS, run `pnpm dsh web` and open the printed URL in the system browser instead.
5. On the first-run page, the user pastes a DeepSeek API key. Official links: [create a key](https://platform.deepseek.com/api_keys) and [top up](https://platform.deepseek.com/top_up). Do not commit `.env` or the key; they live in `~/.dsh` on that machine.

## Do not do

- Do not download `Source code (zip)` from GitHub and expect a clickable icon.
- Do not treat a GitHub Release unsigned `.command` or `.app` as the install method.
- Do not run `xattr` or disable Gatekeeper unless the user explicitly asks for that unsigned-zip workaround.
- Do not push to `deepseek-ai/deepseek-harness`. This checkout is the beginner fork.
- Do not `git add` or `git push` files produced on this machine after install (`.env`, keys, HTML pages, `lib/`, `dist/`).

The Desktop icon created by `pnpm run desktop:install` is local to this clone. The user may click it later; that is not the same as opening a downloaded Release zip.

## After it is running

The Web UI guide starts once the window is up: [docs/user/guide/index.md](docs/user/guide/index.md). Daily click `DeepSeek Harness` on the Desktop. `pnpm dsh web` still starts the server without Electron ([source run](.agents/notes/implemented/simplification/2026-08-10-source-run-without-managed-installer.md)).
