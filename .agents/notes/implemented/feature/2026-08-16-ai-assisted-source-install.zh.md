# Agent Note: AI 协助的源码安装

Status: implemented

[English](2026-08-16-ai-assisted-source-install.md) | 中文

## 问题

从 GitHub Releases 下载的未签名文件会带上 macOS 隔离属性。Gatekeeper 接着弹出「Apple 无法验证…」，按钮常常只有「完成」和「移到废纸篓」，没有「打开」。`.app` 和 `.command` 都会卡在这一步。没有 Apple 开发者签名，新手在当前 macOS 上完不成「解压再双击」。

## 决策

**macOS 新手把本仓库地址发给能跑终端的编程助手来安装。** 助手按仓库根目录 [INSTALL.md](../../../../INSTALL.md)（中文 [INSTALL.zh.md](../../../../INSTALL.zh.md)）做：浅克隆、`corepack` 启用 pnpm 11.7.0、`pnpm install`、`pnpm run build`、`pnpm dsh web`，再用系统浏览器打开 `http://127.0.0.1:3080`。git 检出的文件不会像浏览器下载的 zip 那样被隔离。API Key 仍在首次页填写，官方控制台链接不变。

给模型读的入口是 `llms.txt`、`.github/copilot-instructions.md` 和 `dsh-user-install` skill。根 README 的粘贴块是给用户的提示词。这不增加托管安装器（[无需托管安装器的源码运行](../simplification/2026-08-10-source-run-without-managed-installer.md)）。Windows 的 exe 压缩包仍可选（[桌面 Release 产品包](2026-08-16-desktop-release-pack.md)）。

## 考虑过的替代方案

**继续教按住 Control 打开或 `xattr -cr`。** 否决作为主路径：当前对话框常常没有「打开」，而且不该先教新手关掉隔离。

**给 `.app` 签名并公证。** 本期否决：需要 Apple Developer Program 和本 fork 没有的公证流水线。

**只写 `npx @deepseek-ai/dsh web`。** 否决作为写下的新手步骤：仍要先有 Node，而且本 fork 的工作台在 git 树里（构建后 `pnpm dsh web`）。`npx` 留在 README 的开发者节。

## 后果

- 没有能跑终端的助手时，用户必须自己装 Node 并按 INSTALL.md 做，或改用 Windows。
- 第一次克隆跑完整 `pnpm run build` 要几分钟，且需要网络。
- 未签名的 macOS Release zip 可以仍留在 GitHub Releases；它不是文档里的 Mac 安装路径。
