# Install DeepSeek Harness (for people and coding agents)

English | [中文](INSTALL.zh.md)

This is the supported way to get the workbench running on a Mac. Unsigned Release zips (`.app`, `.command`) are blocked by Gatekeeper and are not the install path. Windows may still use the [Release exe zip](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases).

## What the user should paste to an agent

Tell the user to send this repository URL plus the following request to Cursor, Claude, or any agent that can run a terminal:

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm dsh web。
不要让我双击 .command、.app，也不要下 GitHub 的 Source code zip。
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

4. Start Web from source (not the Release zip):

```sh
pnpm dsh web
```

5. Open `http://127.0.0.1:3080` in the system browser. If the command prints a different URL, open that. If port 3080 is busy, pass `--port 0` or another free port.
6. On the first-run page, the user pastes a DeepSeek API key. Official links: [create a key](https://platform.deepseek.com/api_keys) and [top up](https://platform.deepseek.com/top_up). Do not commit `.env` or the key.

## Do not do

- Do not download `Source code (zip)` from GitHub and expect a clickable icon.
- Do not tell the user to double-click `启动 DeepSeek Harness.command` or a `.app` as the install method.
- Do not run `xattr` or disable Gatekeeper unless the user explicitly asks for that unsigned-zip workaround.
- Do not push to `deepseek-ai/deepseek-harness`. This checkout is the beginner fork.

## After it is running

The Web UI guide starts once the server is up: [docs/user/guide/index.md](docs/user/guide/index.md). Daily source commands stay `pnpm dsh web` from this checkout ([source run](.agents/notes/implemented/simplification/2026-08-10-source-run-without-managed-installer.md)).
