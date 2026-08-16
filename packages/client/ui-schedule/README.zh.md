# @deepseek-ai/dsh-client-ui-schedule

[English](README.md) | 中文

新手日历定时任务页，纯浏览器界面插件。浏览器端占据「新建会话」下方的 `sidebar.session.action`，并打开盖住对话列的 overlay；node 端 apply 为空。Schedule 行为本身——管理工具、`/schedule` 命令、`schedule` 投影单元，以及仅限 Session 内的交付——由 [`@deepseek-ai/dsh-schedule`](../../schedule/schedule/README.md) 拥有。

侧栏操作在工作区出现之前就保持可见。此时页面会提示先选择工作区；在 `useProjection('schedule')` 有定义之前，提交不可用。之后，表单询问做什么、每天还是每周，以及浏览器 IANA 时区下的本地 `HH:mm`。默认是每天 09:00。写入经 `command.execute` 变成 `/schedule daily|weekly|delete` 行。列表只显示每天／每周条目，并提供取消。一次性与 `every_seconds` 仍在 `/schedule` 和工具上，不出现在此页。

准入失败和传输故障以英文内联错误呈现（error-surface 策略）。交付仍只作为普通后续轮次出现；本包是管理界面，不是回执。

## 模型体验

间接地，通过该页发出的 `/schedule` 命令行：`@deepseek-ai/dsh-schedule` 拥有面向模型的工具、提醒 framing，以及该行驱动的已记录 `schedule/change` 流。页面本身不增加提示词内容。

#### KV Cache 影响

无。创建或删除提醒会把 Session 事件追加到现有历史之后，不改变请求前缀。

## 已知限制与暂缓事项

- **仅限 Session 内** — 提醒只有在此 Session live 时才能准时运行；请保持 DeepSeek Harness 开着。没有操作系统、邮件或推送通知。
- **每天／每周钟点，不是 Cron** — 此页不接受任意 Cron 表达式、一次性延时，或与创建时刻对齐的 `every_seconds`。
- **没有交付回执** — 到期工作进入普通 transcript（文本记录）；此页不渲染第二种确认。
