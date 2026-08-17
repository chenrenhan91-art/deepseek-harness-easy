# DeepSeek Harness

English | [中文](README.zh.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Let an AI install it (recommended on macOS)

macOS Gatekeeper blocks the unsigned Release `.command` / `.app`. Send this repository to an agent that can run a terminal (Cursor, Claude, and similar) and paste:

```
请按 https://github.com/chenrenhan91-art/deepseek-harness-easy 仓库里的 INSTALL.md（中文看 INSTALL.zh.md）在这台电脑安装 DeepSeek Harness。
克隆仓库、安装依赖、构建，然后执行 pnpm run desktop:install。
不要下 GitHub 的 Source code zip，也不要把 GitHub Release 里未签名的 .command 或 .app 当成安装方式。
```

The agent follows [INSTALL.md](INSTALL.md) ([中文](INSTALL.zh.md)): `git clone`, `pnpm install`, `pnpm run build`, `pnpm run desktop:install`. That writes `~/Desktop/DeepSeek Harness.app` and opens the workbench window. Paste a DeepSeek API key on the first-run page ([create a key](https://platform.deepseek.com/api_keys), [top up](https://platform.deepseek.com/top_up)).

Windows can still unzip `DeepSeek-Harness-Windows.zip` from [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases) and double-click `DeepSeek Harness.exe` (SmartScreen: Run anyway). Do not download the GitHub Source code zip.

## Developer preview

DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI, served at `http://127.0.0.1:3080` by default. On first launch, paste a DeepSeek API key on the full-page guide, choose a workspace, pick a mode card, and send a task. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/chenrenhan91-art/deepseek-harness-easy.git
cd deepseek-harness-easy
pnpm install
pnpm run build
pnpm dsh web
```

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
