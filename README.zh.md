# DeepSeek Harness

[English](README.md) | 中文

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 从 Release 下载即开（macOS / Windows）

1. 打开仓库的 [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases)，按电脑下载 `DeepSeek-Harness-macOS.zip` 或 `DeepSeek-Harness-Windows.zip`。不要下载源码 ZIP。
2. 解压到**桌面**。macOS 看到「启动 DeepSeek Harness.command」，Windows 看到 `DeepSeek Harness.exe`。不要把压缩包拖进「应用程序」。
3. 双击该文件：后台起本地服务，浏览器打开工作台 `http://127.0.0.1:3080`。
4. 没有 Key：整页说明「先绑定 API」；两个按钮——**去创建 API Key**、**去充值（官方）**。粘贴 Key 后当场验证，通过即可用。

第一次打开可能要过 Gatekeeper 或 SmartScreen（未签名）。macOS 是解压文件夹加 `.command`，不是可安装的 `.app`。压缩包较大，因为内含便携 Node。请解压到桌面。已经安装 Node 的开发者可以继续用下面的 `npx` 或源码路径。

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
