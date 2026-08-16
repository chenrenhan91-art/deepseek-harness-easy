# DeepSeek Harness

English | [中文](README.zh.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Open from a Release (macOS / Windows)

1. Open the repository [Releases](https://github.com/chenrenhan91-art/deepseek-harness-easy/releases). Download `DeepSeek-Harness-macOS.zip` or `DeepSeek-Harness-Windows.zip` for your computer. Do not download the source ZIP.
2. Unzip onto the **Desktop**. You will see `启动 DeepSeek Harness.command` (macOS) or `DeepSeek Harness.exe` (Windows). Do not drag the zip into Applications.
3. Double-click that file. A local server starts and the browser opens the workbench at `http://127.0.0.1:3080`.
4. If you have no API key, the full-page guide asks you to bind one first. Two buttons — **Create an API key** and **Top up (official)** — open the official DeepSeek console. Paste the key; it is checked immediately.

The first open may need a Gatekeeper or SmartScreen confirmation because the pack is unsigned. macOS ships a zip folder and a `.command` file, not an installable `.app`. The zip is large because it includes portable Node. Unzip onto the Desktop. Developers who already have Node can keep using `npx` or a source checkout below.

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
