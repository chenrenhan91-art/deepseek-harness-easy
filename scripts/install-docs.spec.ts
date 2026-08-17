import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')

function firstFence(markdown: string): string {
  const match = markdown.match(/```\n([\s\S]*?)```/)
  if (match?.[1] === undefined) throw new Error('missing unlabeled paste fence')
  return match[1]
}

describe('AI install docs', () => {
  it('tells agents to clone this fork and run desktop:install', async () => {
    const install = await readFile(join(root, 'INSTALL.md'), 'utf8')
    const installZh = await readFile(join(root, 'INSTALL.zh.md'), 'utf8')
    const readme = await readFile(join(root, 'README.md'), 'utf8')
    const readmeZh = await readFile(join(root, 'README.zh.md'), 'utf8')
    const llms = await readFile(join(root, 'llms.txt'), 'utf8')
    const paste = firstFence(install)
    expect(paste).toContain('https://github.com/chenrenhan91-art/deepseek-harness-easy')
    expect(paste).toContain('pnpm run desktop:install')
    expect(paste).toContain('不要下 GitHub 的 Source code zip')
    expect(paste).toContain('不要提交或推送本机产生的文件')
    expect(firstFence(installZh)).toBe(paste)
    expect(firstFence(readme)).toBe(paste)
    expect(firstFence(readmeZh)).toBe(paste)
    expect(install).toContain('~/Desktop/DeepSeek Harness.app')
    expect(readme).not.toContain('npx @deepseek-ai/dsh')
    const gitignore = await readFile(join(root, '.gitignore'), 'utf8')
    expect(gitignore).toContain('/*.html')
    expect(gitignore).toContain('/dist/')
    expect(gitignore).toContain('/.dsh/')
    expect(llms).toContain('INSTALL.md')
    expect(llms).toContain('pnpm run desktop:install')
  })
})
