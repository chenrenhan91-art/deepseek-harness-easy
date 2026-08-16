# Agent Note: 桌面 Release 产品包

Status: implemented

[English](2026-08-16-desktop-release-pack.md) | 中文

## 问题

GitHub 源码 ZIP 不会产生可点的桌面图标。它没有 `node_modules`、没有便携 Node、没有打好的 `lib/` 或 Web `dist`，仓库也不提交 `.app`。没有 pnpm 的新手无法从这份压缩包启动 Web。指向开发者检出和 `tsx` 的本机 LaunchAgent 也不是产品。

## 决策

**否决把源码 ZIP 当作新手下载。** macOS 上支持的新手路径是助手按 [INSTALL.md](../../../../INSTALL.md) 克隆本 fork 并执行 `pnpm dsh web`（[AI 协助安装](2026-08-16-ai-assisted-source-install.md)）。Windows 仍可解压 `DeepSeek-Harness-Windows.zip` 并双击 `DeepSeek Harness.exe`。这个分法写在仓库根 README 最上方。

**源码启动和产品包分家。** 源码检出仍用 `pnpm dsh web` 启动 Web（[无需托管安装器的源码运行](../simplification/2026-08-10-source-run-without-managed-installer.md)）。产品包是已构建的 Web 切片 + 官方便携 Node + `packaging/desktop/` 下的启动器。`scripts/pack-desktop.ts` 打 zip；`.github/workflows/desktop-release.yml` 在 `dsh-v*` tag 上传。包不把 `.app` 二进制、便携 Node 或 `node_modules` 提交进 git，也不改日常源码启动。

**启动器只打开系统浏览器。** `dsh web` 只打印 URL。启动器在 `127.0.0.1:3080` 未在听时拉起捆绑的 `node …/lib/bin.js web`，然后 `open` / `start` 打开该地址。Gatekeeper 仍会隔离未签名、从网上下来的 `.command`；那不是 macOS 新手路径。不做 Electron/Tauri 窗口，也不把 LaunchAgent 或 `/Users/…` 路径产品化。

**Key 和充值只链官方站。** `ApiKeyOnboarding` 链到 `https://platform.deepseek.com/api_keys` 与 `https://platform.deepseek.com/top_up`。之后工作台出现 `QUOTA` / 402 会再给一次充值链接。凭据留在 `$DSH_HOME`；不进 git，不进压缩包。

本期不签名、不公证、不自动更新、不发布 Linux、不安到 `/Applications`。Windows 的 SmartScreen「仍要运行」仍写在 exe 包上；macOS 新手用 INSTALL.md，不用未签名 `.command`。

## 考虑过的替代方案

**让 GitHub 源码 ZIP 解压即可用。** 否决：源码 ZIP 就是 git 树。要填满它就得提交 `node_modules` 和便携 Node，或再做一条源码运行决策已经拒绝的安装器。

**用 Electron 或 Tauri 再包一层窗口。** 否决：产品是「用系统浏览器打开本机 Web」。第二层壳只增加签名应用工具链，不改变监听地址和引导页。

**把开发者 LaunchAgent / Hermes `tsx` 命令产品化。** 否决：那些路径绑定本机和源码。产品包必须从解压根目录跑打好的 `lib/bin.js`。

**把未签名的访达启动当成 macOS 新手路径。** 否决：Gatekeeper 会隔离下载来的 `.command`，对话框常常没有「打开」。面向该受众的克隆并执行 `pnpm dsh web` 写在 [AI 协助安装](2026-08-16-ai-assisted-source-install.md)。

## 验证

`packages/client/ui-settings-models/tests/onboarding-page.client.spec.tsx` 钉住两条官方链。`apps/web/tests/snapshots/onboarding-deepseek-config/missing.expected.md` 记录中文首次页。`packages/client/ui-conversation` 测试钉住 `QUOTA` 的本轮失败链接和 toast。`scripts/pack-desktop.spec.ts` 钉住 zip 名、官方 Node 下载地址、构建产物冒烟 argv、Windows 交叉编译环境、`pnpm run` 多出来的 `--`，以及不含 `/Users/` 检出路径的启动器模板。打包脚本会补回 legacy `pnpm deploy` 漏掉的 vendored `@deepseek-ai/*`，并用 `GOOS=windows` 编 Windows 启动器。

## 后果

- 仍去下 Source code (zip) 的新手点不出图标；README 必须继续写明。
- 未签名的 macOS 访达启动不是新手路径；Windows 仍要过 SmartScreen「仍要运行」。
- 包体积到数百 MB，因为便携 Node 和生产依赖随包走。
- 源码运行的归属、升级和安装器政策仍归「不做安装器」那条笔记；本笔记只拥有 Release 产品包和官方 Key/充值链。
