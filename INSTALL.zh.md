# 安装 DeepSeek Harness（给人和编程助手）

[English](INSTALL.md) | 中文

这是在 Mac 上跑通工作台的支持路径。未签名的 Release 压缩包（`.app`、`.command`）会被 Gatekeeper 拦截，不能当安装方式。Windows 仍可用 [Release 的 exe 压缩包](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases)。

## 用户应该发给助手的一段话

让用户把本仓库地址和下面这段发给 Cursor、Claude，或任何能跑终端的助手：

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm dsh web。
不要让我双击 .command、.app，也不要下 GitHub 的 Source code zip。
```

## 助手操作步骤

在用户这台电脑上做。任一步失败就停，不要跳过。

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

4. 从源码启动 Web（不要用 Release zip）：

```sh
pnpm dsh web
```

5. 用系统浏览器打开 `http://127.0.0.1:3080`。若命令打印了别的地址，打开那个。3080 被占用时加 `--port 0` 或换空闲端口。
6. 首次页让用户粘贴 DeepSeek API Key。官方链接：[创建 Key](https://platform.deepseek.com/api_keys)、[充值](https://platform.deepseek.com/top_up)。不要提交 `.env` 或 Key。

## 不要做

- 不要下载 GitHub 的 `Source code (zip)` 还指望能点图标。
- 不要把双击「启动 DeepSeek Harness.command」或 `.app` 当成安装方法。
- 除非用户明确要求未签名 zip 的变通办法，否则不要跑 `xattr` 或关 Gatekeeper。
- 不要推送到 `deepseek-ai/deepseek-harness`。这份检出是新手分发库。

## 跑起来之后

服务器起来后看 Web 指南：[docs/user/guide/index.md](docs/user/guide/index.md)。日常仍在本检出里执行 `pnpm dsh web`（[源码运行](.agents/notes/implemented/simplification/2026-08-10-source-run-without-managed-installer.md)）。
