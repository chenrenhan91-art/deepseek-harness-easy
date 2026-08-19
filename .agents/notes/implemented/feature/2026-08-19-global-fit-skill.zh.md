# Agent Note: 全局适配度 skill

Status: implemented

[English](2026-08-19-global-fit-skill.md) | 中文

## 问题

随附新手模式已经会教模型怎么写网页、简报或讲解，但没有一份共用的检查：「这是不是用户要的那份最小成品，以及我们是否真的看过结果？」公开的编程 skill 里有 YAGNI 梯子，研究用的 verifier 会按标准给轨迹打分，看起来能补这个缺口。原样接入这些项目，会把 Python logprob 锦标赛或英文「资深程序员」人设带进中文新手工作台；而工作台已经在过量注入 skill 正文。

## 决策

**共享 `fit` skill 与 `vision` 并列，放在 [`apps/cli/config/skills/fit/`](../../../../apps/cli/config/skills/fit/SKILL.md)。** 每个新手模式已经挂载 `../../skills/`，因此八个模式的 `+` 和模型可见目录里都会出现 `fit`。`modePins` 丢掉 `SHARED_SKILL_IDS` 里的每一个 id（`vision`、`fit`）；它从不自动武装。正文是原创中文。它要求模型停在够用的最小成品，再拿当前文件和命令输出对照用户原话，然后才说做完。口头短答跳过它。

保留的公开想法是「停在第一级够用的做法」（要不要做 / 复用 / 系统自带 / 一个文件 / 最后才写新的）以及「只信看见的输出，不信口头说做好了」。该 skill 禁止第二套模型、验证库和多候选投票。

## 考虑过的替代方案

**安装 [llm-as-a-verifier](https://github.com/llm-as-a-verifier/llm-as-a-verifier) 或 TurboAgent 作为运行时。** 否决：需要 logprobs、额外模型轮次和轨迹文件。新手回合会加倍延迟和费用，也不匹配 DeepSeek 的首次页。

**把 [ponytail](https://github.com/DietrichGebert/ponytail) 的 `SKILL.md` 复制进仓库。** 否决：第三方版权、英文且只服务写代码、以及本宿主没有的 lite/full/ultra 命令。随附新手 skill 只在原创中文里保留公开方向，与 `look-distinct` 相同。

**每次发送都自动钉上 `fit`。** 否决：与不钉 `vision` 的理由相同。学习答疑里一句短问再注入它，会重现过教。

**把三句核对写进人设，作为唯一入口。** 否决作为唯一归属：人设已经在重复领域 skill。目录 skill 在任务是成品时可以调用，不是成品时不必出现。

## 后果

- 做网页、幻灯、表格、简报或批量整理时，可以从 `+` 或 skill 工具加载 `/fit`；口头短答不应加载。
- 工作台不运行 `pip install llm-verifier`，也不把 ponytail 的文件拷进仓库。
- 再往 `apps/cli/config/skills/` 加共享 skill 时，必须把它的 id 写入 `SHARED_SKILL_IDS`，否则标签行会占掉一个领域名额。

## 测试

`packages/client/ui-agent-preset` 的单元测试会从 `modePins` 里丢掉两个共享 id。`apps/cli/tests/web-agent-presets.e2e.ts` 钉住 `study`、`web-page`、`briefing` 上 `fit` 与 `vision` 并列，以及 `apps/cli/config/skills/fit/SKILL.md` 存在。Web 斜杠菜单黄金文件和 `agent-preset-selection` 包含 `fit` 行。
