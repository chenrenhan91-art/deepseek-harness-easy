# Agent Note: 资讯收集模式替换学编程

Status: implemented

[English](2026-08-17-briefing-mode-replaces-learn-code.md) | 中文

## 问题

第八张新手卡片用「改一个能跑起来的小项目」教编程。要整理 AI、金融、科技公开与开源信源的操作者，只能对抗编程教练人设，或离开八卡片名册。

## 决策

**第八张卡片是资讯收集（`briefing`）。** [`apps/cli/config/agent-presets/briefing/`](../../../../apps/cli/config/agent-presets/briefing/) 占据 `order: 8`，替换 `learn-code`。名册仍是八个模式；部署默认仍是 `study`。卡片文案是 `资讯收集` / `整理 AI、金融、科技的公开信源，写成短简报`，图标 `search`。agent 平面不变：人设加三份中文 skill，外加共享 `vision`。

**先在对话里出简报。** 人设与 `draft-a-brief` 在对话里写分组短简报。只有用户要求留存时才写工作区 `.md`。每条是标题、为什么重要、原始 URL；有条目的组才出现 AI / 金融 / 科技标题。没有「和上次比有何变化」，也没有「建议接下来做什么」。

**内置公开信源，按需执行。** `source-roster` 列出公开的 GitHub Releases、官方博客、arXiv 近期刊表，以及官方公开数据页（FRED、SEC EDGAR）。额外来源必须同样公开、官方或开源，且 `web_fetch` 打得开。`keep-the-source` 丢掉原文打不开的条目。本模式不设每日或每周定时；那是电脑自动化的工作。

**`learn-code` 与其他已删除随附 id 一样回退。** `RETIRED_SHIPPED_PRESET_IDS` 含 `learn-code`，因此记在该 id 下的旧会话或 settings 默认会打开未指名的部署默认，而不是失败，也不会映射到 `briefing`（[已退役 preset 的 resume](../bug-fix/2026-08-16-retired-preset-resume-remaps-to-default.md)）。

八模式名册仍由[新手 Web 工作台](./2026-08-15-beginner-web-workbench.md)拥有。标签名由[模式 skill 标签](./2026-08-16-mode-skill-pins-and-preset-local-catalog.md)拥有。

## 考虑过的替代方案

**保留学编程，把资讯收集加成第九张卡片。** 否决：产品是八卡片新手网格；第九张会改变首屏密度，却不退役用不上的教学模式。

**目录 id 仍用 `learn-code`，只改文案和 skill。** 否决：残留的编程教练会话会在无声中变成简报会话，id 也会继续暗示错误的工作。

**把 `learn-code` 映射到 `briefing`。** 否决：已开始的学编程记录不是简报历史。已删除随附 id 已经共用未指名默认这一条规则。

**为每日或每周简报教定时任务。** 否决：本模式是用户开口才做一次。循环抓取属于电脑自动化。

**更长的简报（相对上次的变化、后续建议、总是写文件）。** 否决：要的交付物是对话里的短简报，文件只在要求时写。

## 后果

- 模式网格最后一张卡片是资讯收集。仍写着 `learn-code` 的会话会打开 `study`。
- 金融覆盖比 AI 薄，因为公开开源产品渠道更少；没有出处的行情建议不在范围内。
- `PRIMARY_PINS` 让 `source-roster` 排在 briefing 标签行首位，同伴按字母序后，芯片为 公开信源 / 出短简报 / 核对出处。

## 验证

`apps/cli/tests/web-agent-presets.e2e.ts` 钉住以 `briefing` 结尾的八 id 名册，以及 `source-roster` / `draft-a-brief` / `keep-the-source` / `vision` 目录。`apps/web/tests/agent-preset-selection.e2e.ts` 与 lifecycle-chrome 黄金文件钉住资讯收集卡片文案。`packages/preset/agent-presets/tests/settings.spec.ts` 与 `packages/client/runtime/tests/workspaces-service.client.spec.ts` 钉住 `learn-code` 作为已退役随附 id。
