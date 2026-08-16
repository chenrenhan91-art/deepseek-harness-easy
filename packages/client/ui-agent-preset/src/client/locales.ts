/** Locale bundles for the agent-preset settings row, mode grid, and header label. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'title' | 'description' | 'loading' | 'error' | 'userTrust' | 'headerHint'
  | 'gridHeading' | 'gridHint' | 'noDescription'
  | 'pinsHint' | 'pinRemove' | 'pinArm'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  title: 'Mode',
  description: 'Applies to sessions you start from now on. Running sessions keep the mode they began with.',
  loading: 'Loading modes…',
  error: 'Could not load modes.',
  userTrust: 'Custom',
  headerHint: 'The mode this session runs, fixed when it started',
  gridHeading: 'What would you like help with?',
  gridHint: 'Pick one, then type what you want in the box above. You can switch before you send.',
  noDescription: 'No description.',
  pinsHint: 'This mode will use these methods. They are sent with your message. Dismiss one to skip it.',
  pinRemove: 'Don’t use {name}',
  pinArm: 'Use {name}',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentPresetSettingsKey, string> = {
  title: '模式',
  description: '对此后新建的会话生效。已经开始的会话保持它开始时的模式。',
  loading: '正在加载模式…',
  error: '无法加载模式。',
  userTrust: '自定义',
  headerHint: '本次会话使用的模式，开始后不再更改',
  gridHeading: '你想让它帮你做什么？',
  gridHint: '选一个，然后在上面的框里说出你要做的事。发送前都可以换。',
  noDescription: '暂无说明。',
  pinsHint: '这个模式会用到这些做法，发送时自动带上。点掉的这次不带。',
  pinRemove: '不用{name}',
  pinArm: '用上{name}',
}
