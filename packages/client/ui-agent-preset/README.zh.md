# dsh-client-ui-agent-preset

[English](README.md) | 中文

agent preset 的各个表层：铺满新建会话界面的模式网格；General 设置中的一行，用于选择此后的会话据以组装的 [preset](../../preset/agent-presets/README.md)；会话标题旁的一个只读标签；当前模式领域 skill 的编辑器标签；以及助手行上的再生成。

## 为什么它是"新建会话"的偏好设置

会话的 preset 在创建时即固定——宿主拒绝以不同 preset 接管已存在的会话，因为该会话的历史是在最初那份 preset 的工具下产生的。因此两个选择器都不可能是实时切换，设置行也如实说明了这一点：更改只对此后开启的会话生效，而运行中的会话保持它们开始时的组装。

## 模式网格

新建会话界面上、输入框下方的第一样东西：每个 preset 一张卡片，写明它的名称、一句话说明，以及它所要的图标。用卡片而非下拉菜单，是因为「让 agent 擅长什么」是新手要做的第一个决定，也是他们最没有能力去翻找的那个——所有选项一眼可读，整组以单选组的方式工作，任何时刻恰有一张卡片处于选中。

网格以部署默认值打开，其选择是**暂存**的——该界面先于它要应用到的会话存在。暂存值会在当前会话仍为空白、且它所记录的 preset 仍在名册上时抵达该会话；这既覆盖工作区连接新建的会话，也覆盖它复用的那个空白会话，而搭 `sessions.create` 的便车会漏掉后者。暂存值一经使用即被清空，因此下一个新会话重新以默认值打开——与它旁边的工作区选择器完全一致。设置界面上改动的默认值也会带动网格，否则那个即将开启下一个会话的界面会一直提供旧默认值，直到页面重载。

无法重组当前会话的点击——会话已经开始，或仍写着名册里已经没有的 preset——会新建一个已经按所选模式组装的空白会话并打开它。`agentPreset.select` 会先 resume 当前身份，因此把它用在已退役 id 上（新手名册之后的 `standard`）正是卡片曾经暴露的错误。

preset 在 `preset.yml` 里按名字指定图标（`icon: question`）。未指定图标、或指定了本次构建不绘制的名字，都会拿到通用图标——一个不认识的名字只会换来一张朴素卡片，绝不会是一张缺图的卡片。

## 模式 skill 标签

位于编辑器输入卡片正上方：当前会话模式自有 skill 的标签（至多三枚；学习答疑只钉 `explain-clearly`，`check-understanding` / `work-an-example` 留在 `+`）。网格上的选择会刷新 `skill.list`，并把这些 `/name` 写进草稿，以便宿主在发送时注入 skill 正文。共享的 `vision` 和 `fit` skill 留在 `+` 里，不会被钉上。点掉一枚标签会去掉对应 token；换模式会替换上一模式的 token，并留下用户正文。空白会话上，同一张卡片为每个随附模式提供两条示例，hero placeholder 则是该模式自己的那句话。回复之后，助手 IconActions 行上的**再生成**会把该轮用户句再发一次；对照两个版本仍然用分支。见[模式 skill 标签](../../../.agents/notes/implemented/feature/2026-08-16-mode-skill-pins-and-preset-local-catalog.md)和[空会话默认](../../../.agents/notes/implemented/feature/2026-08-19-workbench-empty-session-and-turn-actions.md)。

## 会话标题旁的标签

位于会话标题旁：**本会话**所运行的 preset，作为静态装饰呈现。在那里放一个控件，等于承诺一次宿主会断然拒绝的切换。它从会话自身的摘要读取 preset，并在 General 行所读的同一份名单上解析显示名称。转发的 owner 事件 `agent-preset/selected` 会在每个标签页中把已经提交的空会话切换折进这份共享摘要；发起方标签页可能已经采用 RPC 回执，而合并是幂等的。

## 它读什么、写什么

选项与当前默认值都来自同一次 `agentPreset.list` 调用。名单本身已经报告了"未显式选择的会话会得到哪个 id"，因此本行无需对 settings schema 做内省；写入目标是 `agent-presets` settings 命名空间的 `default` 字段，也正是宿主在创建时解析的那个字段。

本地创作的 preset 的权限恰好等于它所引用的插件，因此设置列表会标注 `user` 行，而不是把每个 preset 都呈现为随附且已审核的。

展示文本来自 preset 自己的文件——`preset.yml` 中的 `name`、`description` 与 `icon`，不做国际化，原样显示。没有提供这些字段的 preset 按 id 列出，因此随附 preset 需要用其部署所面向的语言写好这些文案。

本行在自身命名空间的 `settings/changed` 以及 `connection/reset` 时重新读取：名单是一个活动目录，默认值是一项设置，外部编辑与重新连接都可能改变它。

设置默认值写入的是 `agent-presets` settings 命名空间，宿主需将其暴露给配置客户端（[`dsh-apiproxy`](../../host/apiproxy/README.md) 维护一份显式白名单——不在其中的命名空间会让选择器动一下然后悄悄忘记）。

`agentPreset.list` 未被固定在环回地址（见 [`dsh-client-connection`](../connection/README.md)）：它携带 id、信任级别与展示元数据，而局域网客户端的选择器需要它。

## 何时不显示这些表层

未组装任何 preset 的部署返回空名单，网格、设置行与标签都不渲染任何内容——此时每个会话共用宿主组装，也就无从选择。两个选择器同样不列出宿主标记为 `broken` 的名单行：它们选的是下一个会话的组装，列出无法组装的选项只会把失败推迟到会话启动。

## 模型体验

间接影响，通过此后会话据以组装的那个 preset；[`dsh-agent-presets`](../../preset/agent-presets/README.md) 负责该组装摆在模型面前的内容。

#### KV Cache effect

没有直接的失效影响。更改默认值绝不触及运行中会话的前缀；此后创建的会话依据它自己的组装建立自己的前缀。

## 已知限制与暂缓事项

- **没有元数据的 preset 按 id 列出** —— 展示文本是可选的，未取名的 preset 回退到目录名。
- **preset 在自己的文件里编辑** —— 浏览器不创建、不复制、也不删除；部署要新增一个模式，就在 preset 根目录下新增一个目录。
- **组装编辑对页面不可见** —— 文件在浏览器之外编辑，传输层不广播文件变动，因此名单只在自身操作、`settings/changed` 与 `connection/reset` 时重读，而非每次磁盘编辑。
