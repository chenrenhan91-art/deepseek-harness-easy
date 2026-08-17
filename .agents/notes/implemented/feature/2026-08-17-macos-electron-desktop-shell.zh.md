# Agent Note: macOS Electron 桌面壳

Status: implemented

[English](2026-08-17-macos-electron-desktop-shell.md) | 中文

## 问题

把本 fork 的 git 地址发给助手之后，新手仍然没有以后能点的访达图标。`pnpm dsh web` 留下的是终端和系统浏览器。GitHub Release 里的 `.app` 未签名且带隔离属性，不能当成可点形态。

## 决策

**在用户这台 Mac 上，克隆并构建之后，`pnpm run desktop:install` 写入 `~/Desktop/DeepSeek Harness.app`，并打开 Electron 窗口，加载本检出的 `pnpm dsh web`（`http://127.0.0.1:3080`）。** `.app` 在本机生成，不会像下载来的 Release zip 那样被加上互联网隔离。启动脚本会写入克隆、Node、pnpm 和 Electron 的绝对路径，因为访达启动时 PATH 很短。HTTP 端口在宿主 Loader 树结算前就会绑定，`client-modules` 随宿主行出现逐步注入 `window.__DSH_BOOT__`，因此在第一次 TCP 接受时打开页面会启动不完整的客户端图，并卡在等待 `typert` / `connection` / `remote` / `slots`。窗口因此只在 `GET /` 返回 200、且引导图含这些提供方根节点之后才加载。`dsh-web-app` 在同一次 Loader 结算之后才挂载 `frontend-static`，所以 Chrome 过早访问该端口会得到 404，而不是一份会撒谎的 SPA。

```sh
pnpm run desktop:install
```

`@deepseek-ai/dsh-desktop`（`apps/desktop`）拥有这个壳。它不是 Cordis 插件，也不取代源码运行：`pnpm dsh web` 仍启动服务器（[无需托管安装器的源码运行](../simplification/2026-08-10-source-run-without-managed-installer.md)）。未签名 Release zip 仍打开系统浏览器（[桌面 Release 产品包](2026-08-16-desktop-release-pack.md)）。助手按 [INSTALL.md](../../../../INSTALL.md)（[AI 协助的源码安装](2026-08-16-ai-assisted-source-install.md)）。

这个壳未签名，且只支持 macOS。不公证、不复制到 `/Applications`、不提供 Windows Electron。

## 考虑过的替代方案

**继续把 `pnpm dsh web` 之后的系统浏览器当成 Mac 新手的唯一结束态。** 否决：用户要求助手按 git 地址装完后，桌面上有可点的图标。

**从 GitHub Releases 发已签名的 Electron zip。** 否决：本 fork 没有 Apple 开发者签名流水线，而下载来的未签名 `.app` 正是克隆路径要避开的 Gatekeeper 失败。

**不用 Electron，改用 Tauri 或 WKWebView。** 本期否决：用户指定 Electron，而且它可以加载现有 Web UI，不必再做一套前端。

**做成会拷进 `/Applications` 的托管安装器。** 否决：不做托管安装器的源码运行仍然成立；这个 `.app` 只是指向当前检出。

**端口一旦有任意 HTTP 响应就 `loadURL`。** 否决：那正是这次失败。工作台 URL 行已经在等 Loader 结算；壳必须等组合完成的引导图，而不是 bind。

**看到引导失败卡片就重载 Electron 窗口。** 否决作为主修复：Chrome 仍会加载不完整页面，而且重载仍会与最后一次图刷新竞态。

## 后果

- Electron 的安装脚本写在 `pnpm-workspace.yaml` 的 `allowBuilds` 里；CI 会在每个平台下载 Electron 二进制。
- 移动或删除检出后，桌面图标会失效，直到再跑一次 `desktop:install`。
- Windows 新手仍用 exe 压缩包或 `pnpm dsh web`。
- 关掉 Electron 窗口会结束由本壳拉起的 `dsh web` 子进程；已经在听的服务器不会被停掉。

## 验证

- `apps/desktop/tests/desktop.spec.ts` 钉住 spawn argv、把 Info.plist/启动脚本装进临时目录、端口探测、引导图就绪，以及写入路径的引号。
- `scripts/install-docs.spec.ts` 要求 INSTALL.md、两份 README 和 `llms.txt` 含 `desktop:install`，并要求用户粘贴块在这些文件里字节一致。
