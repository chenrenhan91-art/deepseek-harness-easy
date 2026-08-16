/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'command'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
  'description.compact': '压缩较早的对话历史',
  'description.export': '将本会话日志下载为 ZIP 压缩包',
  'description.feedback': '记录关于本会话的反馈',
  'description.goal': '设置或查看长期任务的目标',
  'description.permission': '切换权限预设（沙箱模式与审批策略）',
  'description.plan': '进入或退出 plan mode',
  'description.schedule': '在本对话中设置提醒',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'description.compact': 'Compact older conversation history',
  'description.export': 'Download this Session log as a ZIP archive',
  'description.feedback': 'record feedback about this session',
  'description.goal': 'set or view the goal for a long-running task',
  'description.permission': 'Switch the permission preset (sandbox mode + approval policy)',
  'description.plan': 'Enter or leave plan mode',
  'description.schedule': 'Set a reminder in this conversation',
} satisfies Record<CommandKey, string>
