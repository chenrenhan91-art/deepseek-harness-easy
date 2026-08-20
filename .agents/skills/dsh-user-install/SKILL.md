---
name: dsh-user-install
description: 'Use when a user pastes the deepseek-harness-easy GitHub URL or GitHub Pages site, or asks to install, 安装, 打开工作台, or start DeepSeek Harness on their computer. The git URL alone is enough. Follow INSTALL.md through pnpm run desktop:install until the Web workbench window is open. Do not stop after clone. Do not tell them to double-click an unsigned GitHub Release .command or .app.'
---

# Install DeepSeek Harness for the user

Read and follow [INSTALL.md](../../../INSTALL.md) (Chinese users: [INSTALL.zh.md](../../../INSTALL.zh.md)). The git URL `https://github.com/chenrenhan91-art/deepseek-harness-easy` is a complete install request. If the user sent `https://chenrenhan91-art.github.io/deepseek-harness-easy/`, clone the git URL, not the github.io site.

1. Ensure `git` and Node `^22.19 || >=24`, then `corepack enable` and `corepack prepare pnpm@11.7.0 --activate`.
2. `git clone --depth 1 https://github.com/chenrenhan91-art/deepseek-harness-easy.git` into a folder the user can find.
3. `pnpm install` then `pnpm run build` (several minutes).
4. On macOS run `pnpm run desktop:install` (writes `~/Desktop/DeepSeek Harness.app` and opens the Web workbench window). Do not treat writing the `.app` as the end. If that command refuses non-macOS, start `pnpm dsh web` in the background, wait for `dsh web: http://` in stdout, and open that URL with the OS (`xdg-open` or `Start-Process`). Do not ask the user to copy the URL.
5. Leave API key entry on the first-run page. Official key and top-up links are in INSTALL.md.

Do not use the GitHub Source code zip or an unsigned Release `.command` / `.app` as the install method. Do not push to `deepseek-ai/deepseek-harness`. Do not `git add` or `git push` files produced on the user's machine after install (`.env`, API keys, HTML pages, `lib/`, `dist/`).
