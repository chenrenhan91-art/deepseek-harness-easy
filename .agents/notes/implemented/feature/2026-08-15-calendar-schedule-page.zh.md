# Agent Note: 日历每天／每周 Schedule

Status: implemented

[English](2026-08-15-calendar-schedule-page.md) | 中文

## 问题

新手会要求「每天 09:00」，但版本 1 的重复调度只有与创建时刻对齐的 `every_seconds`。若把该请求映射成 86400 秒间隔，触发点会落在创建时的钟点，而不是某个早晨墙钟。恢复 Cron 则会重新打开 [有界固定速率 Schedule](../simplification/2026-08-09-bounded-fixed-rate-schedule.md) 已经移除的求值器、语法和 tzdata 回放范围。

第一版 Web 新手选项还把一次性延时与这些间隔混在新会话芯片行上。那种布局无法教真实的每日钟点，也会与第一条消息争抢位置。

## 决策

Schedule 在 After、At 与 Every 之外增加两种仅限 Session 的持久 kind。它们是本地钟点规则，不是 Cron。

**每天。** `{ time: "HH:mm:ss", timeZone, scheduledAt }`。`time` 是规范化本地钟点；`timeZone` 是规范化的 `UTC` 或 IANA Area/Location。`scheduledAt` 是下一个匹配的 UTC 时点。

**每周。** 同样的钟点与时区，外加非空、已排序且不重复的 ISO 星期列表（周一 = 1 … 周日 = 7）。

创建输入中，每天是 `{ time: "HH:mm" | "HH:mm:ss", time_zone }`，每周再加 `weekdays`。`schedule_create` 仍要求在 `after_seconds`、`at`、`every_seconds`、`daily` 与 `weekly` 中恰好选择一个。`/schedule daily <HH:mm[:ss]> <IANA-zone> <prompt>` 与 `/schedule weekly <1-7[,…]> <HH:mm[:ss]> <IANA-zone> <prompt>` 共用这些事务。After、At、Every 与 delete 仍留给模型和命令面板。

日历搜索复用 Schedule 的本地钟点解析。夏令时缺口使该日期没有对应时点，owner 会走到下一个该钟点仍然存在的匹配日期。重叠仍选择较早瞬间。与一次性 `at` 不同，缺口不会让创建失败。

dispatch 与 Every 一致：一次 `id + acceptedAt` 转换、只追赶最新一次、不枚举错过的日期，并且在没有更晚的四位年份目标时终结。没有一次性提醒到期时，逾期的 Every、每天与每周记录共享一条 `[SCHEDULE REMINDER BATCH]` follow-up。`schedule` 投影携带 `time`、`timeZone` 以及每周的 `weekdays`；墙钟 overdue 仍由 UI 读取。

**新手页。** `@deepseek-ai/dsh-client-ui-schedule` 只占据「新建会话」下方的 `sidebar.session.action`（list，session-maybe）。该控件打开盖住对话列的类设置 overlay；侧栏保持可见。页面默认每天 09:00（浏览器 IANA 时区），提供每周星期芯片，列表只显示每天／每周条目，并写入 `/schedule daily|weekly|delete`。一次性与 `every_seconds` 不出现在此页。工作区会话出现之前操作仍可见，表单提示先选择工作区，提交不可用。交付仍是这个对话里的普通后续轮次；请保持 DeepSeek Harness 开着（[对话式交付](../simplification/2026-08-09-conversational-schedule-delivery.md)，[新手写入路径](./2026-08-15-web-beginner-schedule-surface.md)）。

## 已考虑的替代方案

**恢复 Cron。** 拒绝：通用表达式语言、求值器依赖和 tzdata 回放策略，相对于「每天早上 09:00」仍然过大。每天／每周钟点覆盖该请求，而不引入 Cron 语法。

**把「每天 9 点」教成 `every_seconds: 86400`。** 拒绝：该间隔与创建时刻对齐，会谎称早晨墙钟。

**保留新会话「定时提醒」芯片和 dock 列表。** 拒绝：一次性芯片无法表达每日钟点，表单还会与第一条消息争抢。overlay 才是新手座位；`/schedule after|at|every` 仍留给模型和命令面板。

**操作系统、邮件或推送通知，或跨会话的全局任务库。** 拒绝：仅限 Session 的 `schedule/change` 与 live 进程交付仍是产品边界。

**第二条 Host 写入 Remote。** 拒绝：`/schedule` 已经与到期工作和持久化 barrier 串行。

## 验证

Schedule 包测试固定每天／每周创建、下一轮与最近一轮、夏令时缺口跳过与重叠、只追赶最新一次、命令解析、工具 selector、投影字段，以及包含日历记录的重复批次。客户端测试固定 overlay 打开／关闭、无工作区禁用、每天／每周提交、列表取消和内联失败。无密钥组装 Web 快照覆盖侧栏「Scheduled／定时任务」打开该页，以及经该表单的创建再取消。

## 后果

- 「每天 09:00」是持久本地钟点，不是从创建起每 86400 秒一次。
- Cron 表达式仍然不存在；加入它们仍会构成新的产品边界。
- 一次性与固定速率规则仍在协议和 `/schedule` 中，但新手页不提供它们。
- 用户必须保持 DeepSeek Harness 开着。错过的日期只贡献最新一个到期发生时点。
- 交付仍然没有回执 UI。
