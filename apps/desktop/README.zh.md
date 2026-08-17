# `@deepseek-ai/dsh-desktop`

[English](README.md) | 中文

macOS 上包着 `pnpm dsh web` 的 Electron 壳。源码构建完成后，`pnpm run desktop:install` 会按当前检出在 `~/Desktop/DeepSeek Harness.app` 写入图标，并打开指向 `http://127.0.0.1:3080` 的原生窗口。新手步骤见 [INSTALL.md](../../INSTALL.md)。

## 安装

在仓库根目录，先完成 `pnpm install` 和 `pnpm run build`：

```sh
pnpm run desktop:install
```

安装器只支持 macOS。它会把本克隆、Node、pnpm 和 Electron 的绝对路径写进启动脚本。移动克隆后需要再跑一次该命令。这个 `.app` 未签名，应当在用户这台电脑上生成，而不是从网上下载。

## 运行

`pnpm run desktop` 会启动 Electron，但不重写桌面图标。关掉窗口会结束由本壳拉起的 `dsh web` 子进程；已经在听的服务器不会被停掉。

## 限制

本应用不是 Cordis 插件。它不签名、不公证、不安到 `/Applications`，也不提供 Windows 版 Electron。Release 压缩包里的启动器仍然打开系统浏览器。
