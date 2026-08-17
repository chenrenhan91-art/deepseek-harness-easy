---
name: dsh-user-install
description: 'Use when a user pastes the deepseek-harness-easy GitHub URL, or asks to install, 安装, 打开工作台, or start DeepSeek Harness on their computer. Follow INSTALL.md. On macOS run pnpm run desktop:install so a Desktop icon and Electron window appear. Do not tell them to double-click an unsigned GitHub Release .command or .app.'
---

# Install DeepSeek Harness for the user

Read and follow [INSTALL.md](../../../INSTALL.md) (Chinese users: [INSTALL.zh.md](../../../INSTALL.zh.md)).

1. Ensure `git` and Node `^22.19 || >=24`, then `corepack enable` and `corepack prepare pnpm@11.7.0 --activate`.
2. `git clone --depth 1 https://github.com/chenrenhan91-art/deepseek-harness-easy.git` into a folder the user can find.
3. `pnpm install` then `pnpm run build` (several minutes).
4. On macOS run `pnpm run desktop:install` (writes `~/Desktop/DeepSeek Harness.app` and opens the window). If that command refuses non-macOS, run `pnpm dsh web` and open the printed URL.
5. Leave API key entry on the first-run page. Official key and top-up links are in INSTALL.md.

Do not use the GitHub Source code zip or an unsigned Release `.command` / `.app` as the install method. Do not push to `deepseek-ai/deepseek-harness`. Do not `git add` or `git push` files produced on the user's machine after install (`.env`, API keys, HTML pages, `lib/`, `dist/`).
