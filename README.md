# DeepSeek Harness Easy

English | [中文](README.zh.md)

This repository is a beginner AI workbench. Other people install it by sending this git URL to an agent that can run a terminal — the URL alone is enough. The agent follows [INSTALL.md](INSTALL.md) and opens the Web workbench. Paste a DeepSeek API key on first launch.

## Let an AI install it (recommended on macOS)

macOS Gatekeeper blocks the unsigned Release `.command` / `.app`. Send this repository URL to an agent that can run a terminal (Cursor, Claude, and similar). You do not have to paste anything else. A stronger prompt, if you want one:

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm run desktop:install。
装完必须打开网页工作台；不要克隆完就停。desktop:install 会自动打开窗口。
不要下 GitHub 的 Source code zip，也不要把 GitHub Release 里未签名的 .command 或 .app 当成安装方式。
不要提交或推送本机产生的文件（.env、API Key、网页成品、lib、dist）。
```

The agent follows [INSTALL.md](INSTALL.md) ([中文](INSTALL.zh.md)): `git clone`, `pnpm install`, `pnpm run build`, `pnpm run desktop:install`. That writes `~/Desktop/DeepSeek Harness.app` and opens the Web workbench window (`http://127.0.0.1:3080`). Do not treat clone or build as the end. Paste a DeepSeek API key on the first-run page ([create a key](https://platform.deepseek.com/api_keys), [top up](https://platform.deepseek.com/top_up)). Keys and settings live in `~/.dsh` on that machine.

Windows can still unzip `DeepSeek-Harness-Windows.zip` from [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases) and double-click `DeepSeek Harness.exe` (SmartScreen: Run anyway). Do not download the GitHub Source code zip.

## After it is running

Daily click `DeepSeek Harness` on the Desktop. The [Web UI guide](docs/user/guide/index.md) starts once the window is up. Pick a mode card (the default is **学习答疑**). Do not `git add` pages, `.env`, `lib/`, or `dist/` the workbench writes in this clone.

## Community and support

- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
