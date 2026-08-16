# DeepSeek Harness

[English](README.md) | 中文

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 让 AI 帮你安装（macOS 推荐）

macOS 的 Gatekeeper 会拦截未签名的 Release `.command` / `.app`。把本仓库发给能跑终端的助手（Cursor、Claude 等），并粘贴：

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm dsh web。
不要让我双击 .command、.app，也不要下 GitHub 的 Source code zip。
```

助手按 [INSTALL.md](INSTALL.md)（[中文](INSTALL.zh.md)）执行：`git clone`、`pnpm install`、`pnpm run build`、`pnpm dsh web`，然后打开 `http://127.0.0.1:3080`。首次页粘贴 DeepSeek API Key（[创建 Key](https://platform.deepseek.com/api_keys)，[充值](https://platform.deepseek.com/top_up)）。

Windows 仍可从 [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases) 解压 `DeepSeek-Harness-Windows.zip`，双击 `DeepSeek Harness.exe`（SmartScreen 选「仍要运行」）。不要下载 GitHub 的 Source code zip。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。首次启动时在整页引导中粘贴 DeepSeek API 密钥，选择工作区，点一张模式卡片，然后发送任务。详见 [Web UI 指南](docs/user/guide/index.md)。

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/chenrenhan91-art/deepseek-harness-easy.git
cd deepseek-harness-easy
pnpm install
pnpm run build
pnpm dsh web
```

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
