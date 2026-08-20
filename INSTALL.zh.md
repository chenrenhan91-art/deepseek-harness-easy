# 安装 DeepSeek Harness（给人和编程助手）

[English](INSTALL.md) | 中文

这是在 Mac 上跑通工作台的支持路径。别人凭这个 git 地址自己克隆，不需要你本机的文件。只发仓库地址就够：助手哪怕只收到 `https://github.com/chenrenhan91-art/deepseek-harness-easy`，或 GitHub Pages 站点 `https://chenrenhan91-art.github.io/deepseek-harness-easy/`，也按本文件做到完。第 2 步克隆 git 地址，不要克隆 github.io 站点。未签名的 Release 压缩包（`.app`、`.command`）会被 Gatekeeper 拦截，不能当安装方式。Windows 仍可用 [Release 的 exe 压缩包](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases)。

## 用户应该发给助手的一段话

只发仓库地址就是完整的安装请求。下面这段是更稳的提示词，不是必须。

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm run desktop:install。
装完必须打开网页工作台；不要克隆完就停。desktop:install 会自动打开窗口。
不要下 GitHub 的 Source code zip，也不要把 GitHub Release 里未签名的 .command 或 .app 当成安装方式。
不要提交或推送本机产生的文件（.env、API Key、网页成品、lib、dist）。
```

## 助手操作步骤

在用户这台电脑上做。任一步失败就停，不要跳过。不要克隆完或构建完就结束。网页工作台出现在屏幕上之前，安装没有做完。

1. 确认已有 `git` 和 Node.js `^22.19 || >=24`（`node -v`）。没有 Node 就从 https://nodejs.org 安装后再查。用 `corepack enable` 然后 `corepack prepare pnpm@11.7.0 --activate` 启用 pnpm。
2. 浅克隆到用户找得到的可写目录（桌面即可）：

```sh
git clone --depth 1 https://github.com/chenrenhan91-art/deepseek-harness-easy.git
cd deepseek-harness-easy
```

3. 安装并构建。`pnpm run build` 可能要几分钟。

```sh
pnpm install
pnpm run build
```

4. 在 macOS 上写入桌面图标并打开工作台窗口：

```sh
pnpm run desktop:install
```

该命令会创建 `~/Desktop/DeepSeek Harness.app`（访达侧栏写「桌面」时路径仍是这个）并打开指向 `http://127.0.0.1:3080` 的 Electron 窗口（网页工作台）。把窗口留在用户面前。不要把写出 `.app` 当成结束。若命令打印只支持 macOS，就在后台启动 `pnpm dsh web`，等到 stdout 出现 `dsh web: http://`，再用系统命令打开该地址（Linux 用 `xdg-open`，Windows 用 `Start-Process`）。不要让用户自己抄地址。
5. 首次页让用户粘贴 DeepSeek API Key。官方链接：[创建 Key](https://platform.deepseek.com/api_keys)、[充值](https://platform.deepseek.com/top_up)。不要提交 `.env` 或 Key；它们在这台电脑的 `~/.dsh`。

## 不要做

- 不要下载 GitHub 的 `Source code (zip)` 还指望能点图标。
- 不要把 GitHub Release 里未签名的 `.command` 或 `.app` 当成安装方法。
- 除非用户明确要求未签名 zip 的变通办法，否则不要跑 `xattr` 或关 Gatekeeper。
- 不要推送到 `deepseek-ai/deepseek-harness`。这份检出是新手分发库。
- 不要把安装后本机产生的文件（`.env`、密钥、网页、`lib/`、`dist/`）`git add` 或 `git push`。

`pnpm run desktop:install` 生成的桌面图标只指向这份克隆。用户以后可以点它；那和打开从网上下来的 Release zip 不是一回事。

## 跑起来之后

窗口起来后看 Web 指南：[docs/user/guide/index.md](docs/user/guide/index.md)。日常点桌面上的 `DeepSeek Harness`。`pnpm dsh web` 仍可在没有 Electron 的情况下启动服务器（[源码运行](.agents/notes/implemented/simplification/2026-08-10-source-run-without-managed-installer.md)）。
