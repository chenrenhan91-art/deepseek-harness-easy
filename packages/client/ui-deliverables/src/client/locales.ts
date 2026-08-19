/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'produced.label': '产物',
  'produced.moreOne': '+ 1 个文件',
  'produced.more': '+ {count} 个文件',
  'produced.open': '打开 {name}',
  'produced.showInFolder': '在文件夹中显示',
  'preview.opened': '已在浏览器打开 {name}',
  'preview.remote': '成品在 {path}。远程会话无法在此打开，请在那台电脑上打开这个文件。',
}

/** English dictionary (same key set). */
export const en: Record<DeliverablesKey, string> = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
  'produced.showInFolder': 'Show in folder',
  'preview.opened': 'Opened {name} in the browser',
  'preview.remote': 'The file is at {path}. A remote session cannot open it here; open it on that machine.',
}

/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof zh
