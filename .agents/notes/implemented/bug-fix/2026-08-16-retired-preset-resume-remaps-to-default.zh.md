# Agent Note: 已退役 preset 的 resume 回退到默认

Status: implemented

[English](2026-08-16-retired-preset-resume-remaps-to-default.md) | 中文

## 问题

新手 Web 名册删除了 `standard`、`code`、`minimal` 与 `cordis`（[新手 Web 工作台](../feature/2026-08-15-beginner-web-workbench.md)）。在那些 id 下创建的会话仍记录着它们。打开这样的会话会走 `agentFor`，按存储的 id 组装并报 `preset "standard" not found`。模式网格的点击路径是 `agentPreset.select`，而 select 会先 resume agent，因此在该空白会话上点卡片也会死于同一错误。settings 文档若仍把 `standard` 当作用户默认，每个未指名的创建也会同样失败。

## 决策

三处恢复：

- `AgentPresets.resolve()` 在未传 id、且 `defaultId` 已不在名册上时，再试 `config.default`。显式 id 若是已退役的随附名（`standard`、`code`、`minimal`、`cordis`）也走同一回退，因为 resume、select 与 mount 都经过 `resolve`，一条仍写着 `standard` 的旧会话否则会让每一条都失败。其他显式 id 仍抛错。
- 网关 `composeAgent` 按名册成员关系回退**记录下来的** id，而不是 `instanceof UnknownPresetError`（第二份包副本会认不出这个类，并把 `preset "standard" not found` 原样抛回）。`session.create` 与 `agentPreset.select` 对显式未知 id 仍明确失败。
- 模式网格不会对记录着名册里没有的 preset 的会话调用 `agentPreset.select`。那次 select 会先 resume 已退役身份并失败。点击会用 `session.create({ agentPreset })` 新建空白会话并打开它。新建会话也不会复用仍写着 `standard`、`code`、`minimal` 或 `cordis` 的空白会话，因此侧栏动作不会再次落到同一身份上。

模式网格会忽略当前会话里不在名册上的 preset，改显示部署默认。preset 仍在名册上的已开始会话仍锁定（`agent-preset-locked`）；这种状态下点击也会新建会话，因此卡片仍能切到用户接下来要对话的组装。

回退时不改写已退役会话的日志。

## 考虑过的替代方案

**给每个已退役 id 指定后继（`standard` → `study`，`code` → `learn-code`）。** 否决：八个模式共用一套工具名册，被删除的用户 preset 仍需要通用回退。未指名的默认是一条规则。

**只在 resume 时回退，并继续对同一会话做 `select`。** 作为点击路径否决：`select` 会先 resume 已退役身份，而这正是卡片点击暴露的错误。新建一个已经写着所选模式的会话，不会碰旧身份。

**回退时改写日志。** 否决：`agent-preset/selected` 是空白会话上的选择。已开始会话的先前轮次是在已退役组装下跑的；追加新 id 会让之后每一次重建都把整段历史算成默认 preset。

## 后果

- 记在已删除随附 id 下的会话会按 `study`（Web 部署默认）打开。点击模式卡片会按该模式新建空白会话，而不是重组已退役身份。
- 过期的 `agent-presets.default` 设置不再让每个新会话失败；`agentPreset.list` 标记的是解析后的默认，不是 settings 里的原始字符串。
- 对缺失 id 的显式请求仍是 `agent-preset-not-found`。

## 测试

`packages/preset/agent-presets/tests/settings.spec.ts` 钉住未指名解析的回退，以及显式 id 仍然响亮失败。`packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts` 在 `study`/`writing` 名册上 resume 一条冷的 `standard` 会话并选中 `writing`。`packages/client/ui-agent-preset/tests/apply.client.spec.ts` 在当前会话仍写着 `standard` 时把网格开在 `study` 上，并新建 `writing` 会话而不是对该退役行或已开始会话调用 `select`。`packages/client/runtime/tests/workspaces-service.client.spec.ts` 跳过对仍写着 `standard` 的空白会话的新建会话复用。
