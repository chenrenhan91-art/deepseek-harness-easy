# 仅限 Session 内的 Schedule

[English](schedule.md) | 中文

Schedule 拥有持久提醒；这些提醒会作为普通的后续对话轮次返回原 live Session。[持久 Schedule Agent Note](../../.agents/notes/implemented/feature/2026-08-05-durable-web-schedule.md) 负责持久化与生命周期决策，[对话式交付](../../.agents/notes/implemented/simplification/2026-08-09-conversational-schedule-delivery.md) 负责无回执边界，[Web 新手 Schedule 界面](../../.agents/notes/implemented/feature/2026-08-15-web-beginner-schedule-surface.md) 负责侧栏写入路径，[日历每天／每周 Schedule](../../.agents/notes/implemented/feature/2026-08-15-calendar-schedule-page.md) 负责本地钟点重复调度，[显式时区边界](../../.agents/notes/implemented/simplification/2026-08-09-explicit-schedule-time-zone.md) 负责浏览器本地解释，[有界固定速率 Schedule](../../.agents/notes/implemented/simplification/2026-08-09-bounded-fixed-rate-schedule.md) 负责 `every_seconds`。本页记录 [`packages/schedule/schedule/src/types.ts`](../../packages/schedule/schedule/src/types.ts) 中的持久数据形状和面向模型的数据形状；[包 README](../../packages/schedule/schedule/README.md) 负责组合、工具行为与确切的提醒 framing。

## 持久记录

`ScheduleId` 是[品牌化 id](core.md#branded-ids)，在单个 Session 内唯一且绝不复用。版本 1 支持正的安全整数 `after_seconds` 延时、显式的绝对 `at` 目标、至少五分钟的安全整数 `every_seconds` 间隔，或本地钟点 `daily`／`weekly` 规则。创建操作会将每个初始目标规范化为使用四位年份的 RFC 3339 UTC `scheduledAt`；`after` 记录会保留提交的延时，`at` 记录只存储结果时点，`every` 记录则保留固定间隔和下一个目标，日历记录保留本地钟点、时区与每周星期。

```ts type-equiv
/** Durable one-shot reminder created from a positive delay. */
interface AfterScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a delayed one-shot reminder. */
  readonly kind: 'after'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Positive safe-integer delay accepted at creation. */
  readonly afterSeconds: number
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable one-shot reminder created from an absolute instant. */
interface AtScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for an absolute one-shot reminder. */
  readonly kind: 'at'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable fixed-rate reminder whose next target remains creation-anchor-aligned. */
interface EveryScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a fixed-rate recurring reminder. */
  readonly kind: 'every'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Fixed safe-integer interval, never below five minutes. */
  readonly everySeconds: number
  /** Earliest anchor-aligned occurrence not yet dispatched. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable daily reminder at a local clock time in an explicit IANA zone. */
interface DailyScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a daily local-clock reminder. */
  readonly kind: 'daily'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Local wall-clock time `HH:mm:ss`. */
  readonly time: string
  /** Canonical UTC or IANA Area/Location zone. */
  readonly timeZone: string
  /** Next local-clock occurrence not yet dispatched, as UTC. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** Durable weekly reminder at a local clock time on selected ISO weekdays. */
interface WeeklyScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a weekly local-clock reminder. */
  readonly kind: 'weekly'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Local wall-clock time `HH:mm:ss`. */
  readonly time: string
  /** Canonical UTC or IANA Area/Location zone. */
  readonly timeZone: string
  /** Sorted unique ISO weekdays, Monday = 1 through Sunday = 7. */
  readonly weekdays: readonly number[]
  /** Next matching local-clock occurrence not yet dispatched, as UTC. */
  readonly scheduledAt: string
}
```

```ts type-equiv
/** One-shot record variants that terminate on an id-only dispatch. */
type OneShotScheduleRecord = AfterScheduleRecord | AtScheduleRecord
```

```ts type-equiv
/** Recurring record variants that dispatch with `acceptedAt` and stay active. */
type RecurringScheduleRecord = EveryScheduleRecord | DailyScheduleRecord | WeeklyScheduleRecord
```

```ts type-equiv
/** The v1 durable reminder record union. */
type ScheduleRecord = OneShotScheduleRecord | RecurringScheduleRecord
```

## 绝对时间输入

`at` 选择器可以是严格且带偏移量的 RFC 3339 字符串，也可以是精确的本地日历对象。本地形式让这种解释在工具边界保持显式：

```ts type-equiv
/** Local daily selector accepted by `schedule_create`. */
interface DailyInput {
  /** Local wall-clock time `HH:mm` or `HH:mm:ss`. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}
```

```ts type-equiv
/** Local weekly selector accepted by `schedule_create`. */
interface WeeklyInput {
  /** Local wall-clock time `HH:mm` or `HH:mm:ss`. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
  /** ISO weekdays, Monday = 1 through Sunday = 7. */
  readonly weekdays: readonly number[]
}
```

```ts type-equiv
/** Structured local-calendar input accepted by `schedule_create`. */
interface LocalAtInput {
  /** Four-digit ISO calendar date. */
  readonly date: string
  /** Local wall-clock time with optional one-to-three digit milliseconds. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}
```

```ts type-equiv
/** Absolute selector accepted by `schedule_create`. */
type AtInput = string | LocalAtInput
```

官方 Web overlay 会为每条提示词采样浏览器的 IANA 时区。当 open turn 只有一个无歧义的浏览器时区时，Time-context 会告诉模型按该请求本地时区解释未明确限定时区的自然语言日期和时间；provenance 混合或缺失时，则告诉模型询问用户。该指引不是持久 Session 默认值：模型仍必须在字符串形式中传入偏移量，或在本地形式中传入 `time_zone`；Schedule 绝不会读取浏览器、Session、进程或模型上下文。

Schedule 会拒绝无效偏移量与时区、不带偏移量的字符串、非未来目标，以及落在夏令时缺口内的一次性本地时间。遇到夏令时重叠时，会选择第一次出现的较早时点。成功的 `at` 创建只存储规范化后的 UTC `scheduledAt`，因此回放绝不依赖环境时区状态。

## 固定速率输入与补偿

`every_seconds` 是每条记录单独拥有且至少为 300 秒的间隔，以创建时间为锚点。它只提供固定速率重复调度：此 selector 不包含日历规则或 Cron 表达式、重复调度时区、共享冷却时间或跨记录准入门禁。

如果一个 Session 在多个目标到期期间处于 cold 或 busy 状态，一条 Every 记录只会贡献其中最新的一次到期触发。dispatch 会直接将记录推进到 dispatch 判断时刻之后第一个与创建锚点对齐的目标，而不会枚举、持久化或回放错过的间隔。如果下一个目标无法落在四位数年份的 UTC 范围内，最后一次 dispatch 将终结该记录。

当多条彼此不同的重复记录均已到期，且没有一次性提醒到期时，每条记录都会向同一个 follow-up 批次贡献一次触发，并按目标时间和创建顺序排列。每条记录的状态互相独立，但该获准批次中的所有 dispatch 都使用同一个判断时刻。批处理限制模型轮次数量；五分钟下限限制每条 Every 记录的 timer 频率。

## 本地钟点每天／每周输入

`daily` 与 `weekly` 存储规范化的 `HH:mm:ss` 钟点和显式 IANA 时区；每周还存储已排序且不重复的 ISO 星期（周一 = 1 … 周日 = 7）。第一个 `scheduledAt` 是创建时刻之后下一个匹配的本地钟点。夏令时缺口会跳过该日期，走到下一个该钟点仍然存在的匹配日期；重叠仍选择较早瞬间。dispatch 使用与 Every 相同的 `acceptedAt` 只追赶最新一次语义，而不枚举错过的日期。不接受 Cron 表达式。

## 持久变更与回放

版本 1 的 `schedule/change` 会话事件是 Schedule 唯一的持久权威。create 保存完整记录，delete 是终结性且仅含 id 的转换。一次性提醒的 dispatch 同样是终结性且仅含 id。重复 dispatch 携带用于选择最新到期触发的墙钟判断时刻，通常推进活动记录而不终结它。dispatch 表示 follow-up 已同步入队，而不表示模型答复成功或用户已读取答复。

```ts type-equiv
/** Creates one durable reminder record. */
interface ScheduleCreateChange {
  readonly version: 1
  readonly operation: 'create'
  readonly schedule: ScheduleRecord
}
```

```ts type-equiv
/** Deletes one currently active reminder. */
interface ScheduleDeleteChange {
  readonly version: 1
  readonly operation: 'delete'
  readonly id: ScheduleId
}
```

```ts type-equiv
/** Records that one active one-shot reminder entered the durable dispatch history. */
interface OneShotScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
}
```

```ts type-equiv
/** Records one recurring decision and advances directly past missed occurrences. */
interface EveryScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
  /** Wall-clock decision time used to select the latest due occurrence. */
  readonly acceptedAt: string
}
```

```ts type-equiv
/** Durable dispatch shapes supported by the current rule set. */
type ScheduleDispatchChange = OneShotScheduleDispatchChange | EveryScheduleDispatchChange
```

```ts type-equiv
/** Strict version-1 durable Schedule mutation union. */
type ScheduleChange = ScheduleCreateChange | ScheduleDeleteChange | ScheduleDispatchChange
```

严格 decoder 与 fold 会拒绝未知版本、额外字段、复用 id、不匹配的一次性提醒或重复 dispatch 形状，以及针对非活动记录的 delete 或 dispatch 转换。普通 Session 折叠完整事件流。fork 只折叠 `SessionHeader.seedLength` 位置及其后的事件，因此保留历史，但不会接管父 Session 的活动提醒。`schedule/change` 声明和源码位置也编入[持久化目录](../persistence-catalog.md#schedulechange--log-only)。

## 活动视图与管理

工具值将持久记录与根据当前墙钟派生的交付状态组合起来。`session-local` 表示原 Session 必须处于 live 状态：不存在外部通知渠道或 cold Session scheduler。

```ts type-equiv
/** Current delivery timing derived from the durable record and wall clock. */
type ScheduleState = 'scheduled' | 'overdue'
```

```ts type-equiv
/** Fixed v1 delivery boundary: the original session must be live. */
type ScheduleDeliveryMode = 'session-local'
```

```ts type-equiv
/** Complete model-facing view of one active reminder. */
type ScheduleView = ScheduleRecord & {
  /** Whether the target remains in the future. */
  readonly state: ScheduleState
  /** Reminder delivery never leaves the owning session. */
  readonly deliveryMode: ScheduleDeliveryMode
}
```

```ts type-equiv
/** One active reminder in the `schedule` projection, without wall-clock state. */
type ScheduleProjectionItem =
  | {
    readonly id: string
    readonly kind: 'after'
    readonly prompt: string
    readonly scheduledAt: string
    readonly afterSeconds: number
  }
  | {
    readonly id: string
    readonly kind: 'at'
    readonly prompt: string
    readonly scheduledAt: string
  }
  | {
    readonly id: string
    readonly kind: 'every'
    readonly prompt: string
    readonly scheduledAt: string
    readonly everySeconds: number
  }
  | {
    readonly id: string
    readonly kind: 'daily'
    readonly prompt: string
    readonly scheduledAt: string
    readonly time: string
    readonly timeZone: string
  }
  | {
    readonly id: string
    readonly kind: 'weekly'
    readonly prompt: string
    readonly scheduledAt: string
    readonly time: string
    readonly timeZone: string
    readonly weekdays: readonly number[]
  }
```

```ts type-equiv
/**
 * Session-local reminder list folded from `schedule/change`. Capability
 * absence is the key's absence, never an empty value. `scheduled` / `overdue`
 * stay a wall-clock read in the UI, not a durable field.
 */
interface ScheduleProjection {
  /** Active records in create order. */
  readonly items: readonly ScheduleProjectionItem[]
}
```

生成的[工具目录](../tool-catalog.md#deepseek-aidsh-schedule)负责 `schedule_create`、`schedule_list` 和 `schedule_delete` 的参数与结果 schema。组合了命令注册表时，`/schedule` 共用同一套 create 与 delete 事务。可选的 `schedule` 投影把同一份活动列表交给 Web，而不另建一份 store。一条 Agent-scoped 队列将管理调用与到期工作串行化。每次读取或判断都会先等待共享的 Session 持久化 barrier；create 与实际执行的 delete 在追加后还会再次等待。barrier 失败会报告 `persistence_uncertain`，而不是猜测 eager write 是否已提交。其他稳定错误代码是 `invalid_prompt`、`invalid_selector`、`invalid_rule`、`invalid_time_zone`、`not_future`、`time_out_of_range`、`frequency_too_high`、`corrupt_schedule_log` 和 `internal_error`。

## Live 交付

进程内 owner 根据持久 fold 派生最早的 timer，并在每次有界等待后重新读取墙钟。cold Session 不执行任何工作；重新打开后会重建 timer，并使已经过去的目标进入 overdue 状态。到期的一次性提醒享有优先级，每次只进入一个后续轮次。当没有一次性提醒到期时，所有 overdue 的 Every、每天与每周记录会组成上述单个批次。

到期工作会先等待 Agent 完全 idle 并认领 maintenance phase，再重新折叠状态、采样本次判断、将一个 `followup()` 排入队列，并追加对应的 dispatch 变更。它绝不会调用 `steer()`，也绝不会中断当前轮次。

获得准入的一次性提醒或重复批次会启动一个普通的后续轮次，且只通过普通对话 transcript（文本记录）出现；Schedule 不提供独立的持久交付回执。随附的 Web 组合会通过 `/schedule` 与 `schedule` 投影挂载新手定时任务页（[`dsh-client-ui-schedule`](../../packages/client/ui-schedule/README.md)）。如果 framing 构造或同步队列准入失败，则不会记录 dispatch，提醒仍保持活动。队列准入后、持久 dispatch 前的狭窄崩溃窗口可能使提醒内容在恢复后重复，因此该边界提供的是尽力而为的至少一次交付，而非恰好一次交付。
