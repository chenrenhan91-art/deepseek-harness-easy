# Agent Note: 模式 skill 标签与 preset 本地目录

Status: implemented

[English](2026-08-16-mode-skill-pins-and-preset-local-catalog.md) | 中文

## 问题

编辑器 `+` 菜单会列出会话能看到的每一个可供用户调用的 skill。新手模式以默认的 `includeDefaultRoots: true` 挂载 `skill-filesystem`，因此 `~/.agents/skills` 和工作区会跟那一个随附领域 skill 排在一起。点击模式卡片只换人设，并不会把该模式的做法写进下一句，选了「做网页」的新手仍得自己去发现 `/build-a-page`。

## 决策

**Preset 本地目录。** 每个随附新手模式都在自己的 `skill-filesystem` 行上设置 `includeDefaultRoots: false`，并保留两个 `customSkillDirs`：该模式自己的 `skills/`，以及共享的 `../../skills/` 视觉根。因此 `+` 列出的是该模式的领域 skill 加上 `vision`，而不是操作者个人的 Cursor 或 Cloudflare skill。

**每个模式三份原创 skill。** 每个模式随附原来的领域 skill，再加上两份为本产品写的中文同伴。同伴只吸收公开 skill 的方向（做网页的 `look-distinct` 参考 Anthropic 的 `frontend-design`），不复制那些文件。`vision` 留在目录和 `+` 里，但从不自动钉上。

**编辑器标签武装当前模式。** `@deepseek-ai/dsh-client-ui-agent-preset` 以 `SkillPins` 占据 `conversation.input.dock` 的 order 25。目录加载以及 `agent-preset/selected` 时，它钉上至多三个非 `vision` 的 skill，并把它们的 `/name` 写进草稿。宿主 `dsh-tool-skill` 的 pre-step 本来就会注入每一个这样的 token。芯片文案取目录 description 里第一个 `：` 之前的文字，因此「学习答疑」显示「讲明白 / 真懂了吗 / 带做一道」。点掉一枚芯片会去掉对应 token；再点一次加回去。换模式会替换上一模式的 token，并留下无关 token（`/vision`）和用户正文。

| 模式 | 标签 |
|---|---|
| `web-page` | `build-a-page`、`look-distinct`、`check-on-phone` |
| `writing` | `draft-and-revise`、`write-plain`、`keep-the-facts` |
| `sheet` | `clean-a-sheet`、`read-the-numbers`、`make-a-chart` |
| `files` | `tidy-files`、`name-clearly`、`find-twins` |
| `study` | `explain-clearly`、`check-understanding`、`work-an-example` |
| `slides` | `make-a-deck`、`one-point`、`speak-the-deck` |
| `autopilot` | `set-up-a-routine`、`check-it-ran`、`safe-batch` |
| `learn-code` | `first-project`、`debug-out-loud`、`run-and-show` |

## 考虑过的替代方案

**保留默认根，只在浏览器里过滤 `+` 菜单。** 否决：目录仍会把个人 skill 注入面向模型的 `skill` 工具，过滤器只会藏起会话其实还拥有的能力。

**把 `vision` 和模式 skill 一起钉上。** 否决：看图在每个模式里都是可选项；纯文本轮次自动注入会浪费上下文。

**新增一个发送钩子，把草稿里看不见的名字偷偷补上。** 否决：宿主已经把用户消息里的 `/name` 当作调用手势，现有的 text-ref 装饰也会标出这些 token。再开一条线会让 TUI、ACP 和 Web 分叉。

**把 Anthropic `frontend-design` 或其他 GitHub skill 文件复制进仓库。** 否决：那些文件受第三方版权保护。随附 skill 是原创中文说明，只保留公开想法（写 CSS 之前先定风格；讲完要检验是否真懂）。

## 后果

- 开发者机器上的 `~/.agents/skills` 不再污染新手 Web 的 `+` 菜单或模型目录。
- 工作区 `.agents/skills` 下的文件对随附模式不可见，除非有人把 `includeDefaultRoots` 重新打开。
- 空白编辑器一旦落下 pin token，发送按钮就会亮起；此时发送只会带上这些 skill，没有其他用户正文。
- 给一个模式再加第四个领域 skill 时，除非它在主 skill 排序后仍进前三，否则不会被钉上。

## 验证

`packages/client/ui-agent-preset` 的单元测试钉住草稿替换/删除、目录到标签的映射（去掉 vision、上限 3）、dock 注册，以及标签开关。`apps/cli/tests/web-agent-presets.e2e.ts` 钉住 `study` 与 `web-page` 上「三个领域 skill 加 vision」的目录。`apps/web/tests/agent-preset-selection.e2e.ts` 钉住写作与学习答疑的标签行、对应的斜杠目录，以及已播种的工作区 skill 不会出现。
