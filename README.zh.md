# DeepSeek Harness Easy

[English](README.md) | 中文

本仓库是给 AI 小白用的工作台。别人凭这个 git 地址自己克隆安装，你不用上传本机文件。在 macOS 上把地址发给能跑终端的助手，它按 [INSTALL.md](INSTALL.md) 写入桌面图标。首次启动时粘贴 DeepSeek API Key。

## 让 AI 帮你安装（macOS 推荐）

macOS 的 Gatekeeper 会拦截未签名的 Release `.command` / `.app`。把本仓库发给能跑终端的助手（Cursor、Claude 等），并粘贴：

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm run desktop:install。
不要下 GitHub 的 Source code zip，也不要把 GitHub Release 里未签名的 .command 或 .app 当成安装方式。
不要提交或推送本机产生的文件（.env、API Key、网页成品、lib、dist）。
```

助手按 [INSTALL.md](INSTALL.md)（[中文](INSTALL.zh.md)）执行：`git clone`、`pnpm install`、`pnpm run build`、`pnpm run desktop:install`。这会写入 `~/Desktop/DeepSeek Harness.app` 并打开工作台窗口。首次页粘贴 DeepSeek API Key（[创建 Key](https://platform.deepseek.com/api_keys)，[充值](https://platform.deepseek.com/top_up)）。密钥和设置在这台电脑的 `~/.dsh`。

Windows 仍可从 [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases) 解压 `DeepSeek-Harness-Windows.zip`，双击 `DeepSeek Harness.exe`（SmartScreen 选「仍要运行」）。不要下载 GitHub 的 Source code zip。

## 跑起来之后

日常点桌面上的 `DeepSeek Harness`。窗口起来后看 [Web UI 指南](docs/user/guide/index.md)。选一张模式卡片（默认是**学习答疑**）。不要 `git add` 工作台在这份克隆里写下的网页、`.env`、`lib/` 或 `dist/`。

## 社区与支持

- 欢迎通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="assets/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="assets/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

请先阅读[开发指南](docs/development.md)与[架构文档](docs/architecture.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
