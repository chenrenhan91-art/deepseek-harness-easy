# Agent Note: 空会话模式提示、再生成，以及 HTML 自动打开

Status: implemented

[English](2026-08-19-workbench-empty-session-and-turn-actions.md) | 中文

> 范围：新手 Web 工作台第一批交互。学习答疑的默认钉法、按模式的 hero 文案、助手行「再生成」，以及做网页 / 做 PPT 在回合结束后打开 HTML。不在范围：应用内 iframe 预览、默认钉上 `vision`、改已发送的用户句。origin 会话包的改动是无 beginner 插件时为空操作的 hint / assistant-action 字段，以及加号菜单始终以 leading 打开。

## 问题

默认的「学习答疑」每次发送都武装三条 skill，随口一问会变成小测验加带做题。Hero placeholder 对所有模式都是「描述你想要构建的内容」。回复之后，再试一次只能重打或去找「分支」。做网页 / 做 PPT 写出了芯片能打开的 HTML，但回合结束时没有人打开它，新手仍会问成品在哪。

## 决策

**学习答疑只钉 `explain-clearly`。** `modePins` 不再把 `check-understanding` 和 `work-an-example` 自动武装进草稿。它们仍在该模式目录和 `+` 里。其他新手模式仍最多钉三条领域 skill。[模式 skill 标签](2026-08-16-mode-skill-pins-and-preset-local-catalog.md) 仍拥有目录、`vision` 和 `/name` 手势；本笔记拥有学习答疑的默认钉法。

**每个随附模式拥有一句 hero placeholder 和两条空会话示例。** `ui-agent-preset` 经 `ctx.conversation.hints` 和标签卡发布这些文案。ConversationRoot 只在 hero 栏活着时读取 hint，因此停靠编辑器上的 plan / steer placeholder 仍然优先。自定义或未知 preset 保持通用 hero 文案，也没有示例。点击示例会把它接在已武装的 `/name` 后面。

**「再生成」复用本轮用户句再跑一轮。** `TurnTailNodeView` 从该轮的 Location 索引读取用户句，以及本 Node 是否为最新空闲轮次的最后一个 Chat Node，再把 `promptText` / `regenerable` 传进 `conversation.chat.assistant-actions`。新手插件以 order 0 注册一个文字控件。没有用户句则隐藏；更早或仍在运行的轮次显示为不可用并带 tooltip。点击对当前会话调用 `conversation.send`，原文照发，包括 pin token。对照两个版本仍然用分支。

**做网页 / 做 PPT 在最新轮次空闲时打开 HTML。** `ProducedFiles` 取第一条 basename 为 `.html` / `.htm` / `.xhtml` 的产出路径，走芯片已经在用的 `openFile`，并显示「已在浏览器打开 {name}」。远程 Web 打不开 Host 路径，改为显示路径。历史加载时 `wasRunning` 从 false 起，已结束的行不会打开。[产出文件打开器](2026-07-31-web-workspace-file-links.md) 仍拥有 Host `openPath` 以及否决 iframe 预览的决定。

## 考虑过的替代方案

**保留三条学习答疑 pin，只在 skill 里写「不要上课」。** 否决：宿主仍会注入三份 SKILL.md 全文，模型仍把「出一道小题」当成任务。拿掉 pin 才让默认发送符合「只要答案就停」。

**草稿非空时把 `+` 当成 inline。** 否决：`/explain-clearly` 不算空，`/plan` 会从命令目录里消失。加号按钮始终以 leading 和空 query 打开，pick span 覆盖整份草稿，这样选 `/plan` 才能换掉 pin token。

**把模式 placeholder 也用在停靠编辑器上。** 否决：plan / steer 文案会输给一句只在空会话屏有意义的模式句子。

**先 fork 再发送来实现再生成。** 否决：fork 是对照两版的手势。在当前会话上重发才是新手要找的。

**用模块级集合记下已打开的路径。** 否决：会泄漏进测试和其他会话。实例级 ref 加上 running 到空闲的边沿，就够挡住 Strict Mode 双开和历史加载。

**任何模式写出的 HTML 都自动打开。** 否决：学习答疑偶尔写的一页不该抢走窗口。只有 `web-page` 和 `slides` 自动打开。

## 后果

空白的学习答疑会话只显示一枚「讲明白」、placeholder「你卡在哪一步？」和两条示例。`+` 仍列出「真懂了吗」和「带做一道」，也仍列出 `/plan`：加号菜单始终以 leading 打开完整命令目录，pick span 覆盖整份草稿，草稿里的 `/explain-clearly` 不会把它藏起来。有本轮用户句的助手回复显示「再生成」。本机做网页 / 做 PPT 在回合结束时用默认浏览器打开 HTML；远程 Web 显示路径。`ComposerHints` 和 assistant-actions 的属主字段在未组合 beginner 插件时是空操作。

## 验证

`packages/client/ui-agent-preset` 钉住学习答疑目录映射、示例点击、再生成发送与不可用，以及 `conversation.hints.set`。`packages/client/ui-conversation` 钉住 hint 注册表、hero placeholder、`turnPromptText`，以及草稿里已有 pin token 时加号仍以 leading 打开。`packages/client/ui-deliverables` 钉住 HTML 路径挑选、running 到空闲的边沿、历史加载和远程文案。`apps/web/tests/snapshots/lifecycle-chrome/hero.expected.md` 钉住学习答疑单 pin 和两条示例；`agent-preset-selection.e2e.ts` 钉住同伴 skill 仍在 `+` 里。`skill-invocation-policy.e2e.ts` 钉住工作区 skill 不出现在 `/explain`；`skill-user-invoke.e2e.ts` 通过编辑器认领 `/explain-clearly`。
