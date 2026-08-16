# Agent Note: Web beginner schedule surface

Status: implemented

[English](2026-08-15-web-beginner-schedule-surface.md) | 中文

## 问题

提醒已经有一套仅限 Session 的协议，但随附 Web 的新会话页没有管理界面。新手只能向模型提问，或自己拼出 `/schedule` 行。这个缺口会诱使做出第二套产品：日历 cron、操作系统通知，或持久交付回执；每一项都会重新打开一条已被拒绝的 Schedule 边界。

## 决策

现有的 `@deepseek-ai/dsh-schedule` 仍是唯一的提醒权威。这次改动增加一条人类写入路径和一份管理列表；它不增加调度器、从 cold 唤醒的路径，也不给交付增加第二种含义（[对话式交付](../simplification/2026-08-09-conversational-schedule-delivery.md)，[持久、仅限 Session 内的提醒](./2026-08-05-durable-web-schedule.md)）。

**共用 create 与 delete。** `/schedule` 调用与 `schedule_create`、`schedule_delete` 相同的事务。只有已获得 Schedule runtime 的 live 根 Agent 接受该命令。用法与解析错误留在命令结果里；持久失败复用工具错误码。每天／每周动词由[日历每天／每周 Schedule](./2026-08-15-calendar-schedule-page.md) 拥有。

**管理投影，不是回执。** 可选的 `schedule` 单元从 `schedule/change` 折叠活动记录，并提供 `{ items }`，不含 `scheduled` / `overdue`。墙钟状态仍由 UI 读取。损坏的事件会保留先前的 fold。能力缺失表现为键不存在，而不是空值。

**声明的座位加上新手选项。** `ui-sidebar` 声明「新建会话」下方的 `sidebar.session.action`（list，session-maybe）。`@deepseek-ai/dsh-client-ui-schedule` 占据该座位：一个 **定时任务** 控件，打开盖住对话列的 overlay 页。`ui-conversation` 不声明 `conversation.hero.schedule`，也不声明 schedule dock。工作区会话出现之前侧栏操作保持可见；页面提示先选择工作区，「开始」不可用，也不会发送 `/schedule`。写入经 `command.execute`。overlay 表单、每天／每周记录与列表文案由[日历每天／每周 Schedule](./2026-08-15-calendar-schedule-page.md) 拥有。

**随附的 Web 组合。** Web patch 加载 `@deepseek-ai/dsh-time-context`、`@deepseek-ai/dsh-schedule` 和定时任务页插件。无头默认组合仍然省略它们。[`examples/web-schedule`](../../../../examples/web-schedule/README.md) 重述这两条 Host 行，使 `dsh web --patch examples/web-schedule/cordis.yml` 仍然有效。

## 已考虑的替代方案

**在此写入路径上发明 Cron 产品。** 作为通用表达式语言而拒绝。窄的每天／每周本地钟点作为独立持久 kind 交付（[日历每天／每周 Schedule](./2026-08-15-calendar-schedule-page.md)）；它们不恢复 Cron。

**操作系统、邮件或推送通知。** 拒绝：仅限 Session 内交付就是产品边界。cold Session 不执行任何工作。

**独立的交付回执。** 已经拒绝。页面列出活动的每天／每周记录并取消它们；到期工作仍只作为普通后续轮次出现。

**在工作区存在之前就显示控件。** 为了让用户先发现入口而采纳：空的 Web 页就会显示侧栏操作。写入仍需要拥有 `schedule/change` 的 Session；在此之前提交保持不可用。

**用新的 Host Remote 代替 `/schedule`。** 拒绝：命令通道已经与到期工作和持久化 barrier 串行。第二条写入 API 会复制该队列。

**只把表单放在设置或命令面板里。** 随附的新手路径是从侧栏「新建会话」下方打开的类设置 overlay，而不是紧挨第一条消息的芯片。

## 验证

Schedule 包测试固定 `/schedule` 的解析与 create/delete、对 child Agent 的拒绝、`schedule` 单元的 fold 与损坏事件保持，以及组合 `sessionProjections` 时的注册。客户端测试固定侧栏 overlay、无工作区禁用、每天／每周命令行、内联失败，以及进行中的点击忽略。对话测试固定不存在 hero schedule 座位。无密钥组装 Web 快照覆盖侧栏「Scheduled／定时任务」打开该页、经该表单的创建再取消，以及命令菜单中的 `/schedule`。

## 后果

- 侧栏可以在工作区存在之前发现定时任务入口；真正创建仍需要工作区会话。
- 用户必须保持 DeepSeek Harness 开着；帮助文案会说明这一点。
- 新手页提供每天／每周本地钟点；一次性与 `every_seconds` 仍在 `/schedule` 和工具上（[日历每天／每周 Schedule](./2026-08-15-calendar-schedule-page.md)）。
- 交付仍然没有回执 UI。侧栏声明一个管理座位；Host 与持久化不增加回执协议。
- web-schedule overlay 是重述，而不是加载 Schedule 的唯一方式。
