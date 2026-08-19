# Agent Note: Localized slash-menu captions and the shipped vision skill

Status: implemented

[English](2026-08-15-localized-slash-menu-and-vision-skill.md) | 中文

## Problem

Web 斜杠菜单在界面语言为中文时，仍显示 Host 命令目录里的英文说明，因此只有客户端贡献的 `/model` 一行是中文。编辑器的 `+` 启动器也只打开 command source，随附 skill 无法出现在该选择栏中。

## Decision

**由 locale 拥有的 Host 说明。** `@deepseek-ai/dsh-client-ui-commands` 把 `command` 词典中的 `description.<name>` 覆盖到它所认识的 Host 目录行上。英文文案与 Host 字符串一致，因此英文 locale 保持原有菜单。未知 Host 名称仍使用目录字符串。客户端贡献（如 `/model`）仍拥有自己的 `command.description`。

**启动器列出该触发符下的全部 source。** `toggleSource` 仍记录是哪个 chrome 控件打开了菜单，但会为该 trigger 上已注册的每一个 source 建组并拉取候选。空的 ready 组保持隐藏。键入 `/` 与按下 `+` 因此共用同一份命令加 skill 名册；`@` 的 subagent source 仍留在自己的 trigger 上。

**随附 `vision` skill。** [`apps/cli/config/skills/vision/`](../../../../apps/cli/config/skills/vision/) 是每个随附新手模式（`web-page`、`writing`、`sheet`、`files`、`study`、`slides`、`autopilot`、`briefing`）的自定义 skill 根，经 `../../skills/` 与各模式自己的 `skills/` 一并挂载。该 skill 可供用户调用；菜单 pick 会插入 `/vision `，由 Host 的 pre-step 注入正文。名册由[新手 Web 工作台](./2026-08-15-beginner-web-workbench.md)拥有。

## Alternatives considered

**把 Host `commands.register` 的 description 改成中文。** 否决：TUI、ACP 和英文 Web locale 共用该目录。

**把 `/vision` 注册为客户端命令贡献。** 否决：同名贡献会在 skill 手势之前认领 `/vision`，Host 便不会注入正文。

**保持 `+` 启动器只含命令。** 否决：用户从 chrome 打开的选择栏将永远看不到随附 skill。

## Verification

命令 UI 测试钉住已登记 Host 名称的中文覆盖，以及未知名称的原样透传。输入触发测试钉住启动器同时拉取 command 与 skill 组。无密钥 Web 黄金文件覆盖中文斜杠菜单，并在 preset 挂载 `vision` 时包含 Skills 组。

## Consequences

- 中文 Web 显示本地化的 Host 命令说明；英文 Web 与 Host 目录一致。
- `+` 菜单可以列出 skill。新手模式设置 `includeDefaultRoots: false`，因此该列表是本模式自己的 skill 加上 `vision` 和 `fit`，而不是 `~/.agents/skills` 或工作区（[模式 skill 标签](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md)）。
- 更改 Host 命令的英文目录字符串时，必须同步 `description.*` 的英文词典条目，否则英文菜单会分叉。
