# Agent Note: 新手 Web 工作台

Status: implemented

[English](2026-08-15-beginner-web-workbench.md) | 中文

## 问题

随附的 Web UI 是一套编码 agent 控制台：专业向 chrome（目标、后台任务、子智能体、轨迹、插件配置）、英文优先文案、四个互相重叠的 preset（`standard` / `code` / `minimal` / `cordis`），以及第一次对话前必须绕进设置页。从未用过 agent 的人看不到模式卡片、无法证明 API 密钥可用，默认权限仍会在普通工作区写入前询问。

## 决策

**一份新手 Web 组合。** [`packages/bundle/web-app/cordis.patch.yml`](../../../../packages/bundle/web-app/cordis.patch.yml) 就是 Web 产品：它禁用目标、后台任务、子智能体、Ralph、workflow 与插件配置工具的宿主行，并且不加载这些行所驱动的专业向客户端包。Chat 是唯一的会话视图；只组合 Chat 时隐藏视图标签页。

**八个模式替换原先四个随附 preset。** `apps/cli/config/agent-presets/` 持有 `web-page`、`writing`、`sheet`、`files`、`study`、`slides`、`autopilot` 与 `learn-code`。每个目录有中文 `preset.yml` 元数据、同一套 agent 平面工具清单（文件系统、shell、skill、计划、todo、web、日程、提问、读图）、一份人设，以及三份原创中文领域 skill。`study` 是部署默认，因为它回答问题而不产出文件。八个模式都通过 `../../skills/` 额外挂载共享视觉 skill [`apps/cli/config/skills/vision/`](../../../../apps/cli/config/skills/vision/)，再挂载各自的 `skills/`，并设置 `includeDefaultRoots: false`，因此 `+` 不会列出 `~/.agents/skills` 或工作区 skill。名册中不再有 `standard`、`code`、`minimal` 与 `cordis`。JSON-RPC 的 [`minimal.cordis.yml`](../../../../examples/jsonrpc-agent/minimal.cordis.yml) 仍是该启动路径上的双工具 RL 组合（[minimal-preset 组合](../bug-fix/2026-08-10-minimal-preset-owns-rl-composition.md)，[裸双工具运行时](./2026-08-11-minimal-profiles-bare-two-tool-runtime.md)）。点选模式会把它的领域 skill 武装成编辑器标签（[模式 skill 标签](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md)）。

**新会话页上的模式卡片。** `@deepseek-ai/dsh-client-ui-agent-preset` 占据 `conversation.hero.modes`，以单选卡片组呈现。选择会暂存，直到出现空白会话。已开始的会话会被拒绝（`agent-preset-locked`）。展示文案按各 `preset.yml` 原文显示。

**整页 API 密钥引导。** 版本化欢迎通知（`OnboardingModal`）之后，当没有任何可用提供方时，`ui-settings-models` 用 `ApiKeyOnboarding` 铺满视口。页面链到官方创建 Key 页和充值页，在 `credentials.set` 之前用 `llm.discoverModels` 探测该密钥，并说明密钥可用后助手会按会话权限预设行动。之后工作台出现 `QUOTA` / 402 时会再次给出官方充值链接。跳过只结束当前协调器轮次。欢迎通知仍使用共享模态框（[共享模态框引导](./2026-08-13-shared-modal-product-onboarding.md)）；本笔记拥有密钥页。桌面 Release 产品包是另一条分发路径（[桌面 Release 包](./2026-08-16-desktop-release-pack.md)）。

**中文优先的 Web。** locale 插件的 `Config` 是 `LocaleSettingsSchema`；Web 补丁把 `preference: zh` 作为 settings base。可见字符串由词典拥有，而不是客户端回退。插件激活前的启动页硬编码 `正在加载插件…` / `加载插件失败`，因为 locale 插件尚未激活。权限选择器原样渲染宿主 `name`（[Full access 确认](./2026-07-31-gui-full-access-confirmation.md)）：Web 补丁写入「只读」／「工作区可写」／「完全放开」，因此即使界面语言是英文，这些标签也仍出现。确认文案仍由 locale 拥有（`确认启用完全放开？` / `Enable Full access?`）。

**Web 会话默认完全放开。** Web 的 permission 行（在 `insert:` 之外，因此覆盖 base 行的整份 config）设置 `defaultPreset: danger-full-access`。全新会话会钉住该预设；进程上的 `sandbox-policy.defaultMode` 与 `approval.config.policy` 在会话钉住生效前仍是 base 的 `workspace-write` / `ask`（[workspace-write 默认值](./2026-07-31-workspace-write-surface-default.md)）。从更安全的预设切到 `danger-full-access` 仍需要确认对话框。

## 考虑过的替代方案

**用「高级」开关保留专业向 chrome。** 否决：开关是第二套产品，新手仍要去发现；被裁掉的包也没有新手职责。

**把 Host 命令与权限目录改写成中文来本地化。** 否决：TUI、ACP 和英文 Web locale 共用那些目录。客户端词典覆盖已知 Host 命令说明；权限名称是宿主配置，因为 Web 组装才是交付中文标签的产品。

**等第一次模型调用失败后再探测密钥。** 否决：拼写错误会看起来像模型或网络失败。用这把密钥调用 `llm.discoverModels`，正是模型页已经在用的那份列表。

**Web 与 base 一样默认 `workspace-write`。** 对本产品否决：刚贴完密钥并选了模式的新手，不该在第一次写文件时被打断。离开更安全预设时，确认对话框仍是那道门。

**给每个模式不同的工具集。** 否决：模式就是人设加 skill。分叉的目录会让「切换模式」变成标题标签解释不了的能力变化。

## 验证

`apps/cli/tests/web-agent-presets.e2e.ts` 启动随附 Web 补丁，钉住八模式名册、默认 `study`、共享 vision 挂载，以及各模式相同的工具名。`apps/web/tests/shipped-composition.e2e.ts` 钉住新手目录（外加随附的 `glob` / `grep`）、`permissionPresets.defaultPreset === 'danger-full-access'`，以及进程 `sandboxPolicy.defaultMode === 'workspace-write'`。客户端测试钉住宿主名称权限标签、「完全放开」确认文案、模式网格、API 密钥探测，以及官方创建 Key / 充值链接。无密钥组装态 Web 快照覆盖引导、模式网格、访问 chip 与中文 chrome；用 `pnpm run test:web:refresh` 重录。

## 后果

- Web 是中文新手工作台。专业向界面（目标、后台任务、子智能体、轨迹、插件配置、Ralph、workflow）不在组合里。重新引入其中一项是新的产品决策，不是漏掉的一行。
- 占用随附 id 的用户自有 preset 仍输给更靠前的系统根（家目录里的 `study` 会被随附 `study` 遮蔽）。
- 英文界面语言不会把权限 chip 译成英文：名称写在 Web 的 permission 行上。
- JSON-RPC 的 minimal 示例是剩下的双工具 RL 组合；Web 不再随附 `minimal`。
- 会话或 settings 默认值若仍写着已删除的随附 id（`standard` / `code` / `minimal` / `cordis`），会经未指名的默认回退，而不是拒绝打开（[已退役 preset 的 resume](../bug-fix/2026-08-16-retired-preset-resume-remaps-to-default.md)）。
- Windows：每个新手模式都用插值后的 `disabled` 门控 `tool-bash` / `tool-pwsh`，与原先通用 preset 相同（[Loader `disabled` 插值](../architecture/2026-08-11-loader-entry-disabled-interpolation.md)）。
