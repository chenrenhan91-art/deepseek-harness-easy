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
    const agents = await readFile(join(root, 'AGENTS.md'), 'utf8')
    const skill = await readFile(join(root, '.agents/skills/dsh-user-install/SKILL.md'), 'utf8')
    const copilot = await readFile(join(root, '.github/copilot-instructions.md'), 'utf8')
    const paste = firstFence(install)
    expect(paste).toContain('https://github.com/chenrenhan91-art/deepseek-harness-easy')
    expect(paste).toContain('pnpm run desktop:install')
    expect(paste).toContain('装完必须打开网页工作台')
    expect(paste).toContain('不要克隆完就停')
    expect(paste).toContain('不要下 GitHub 的 Source code zip')
    expect(paste).toContain('不要提交或推送本机产生的文件')
    expect(firstFence(installZh)).toBe(paste)
    expect(firstFence(readme)).toBe(paste)
    expect(firstFence(readmeZh)).toBe(paste)
    expect(install).toContain('~/Desktop/DeepSeek Harness.app')
    expect(install).toContain('The git URL alone is enough')
    expect(install).toContain('chenrenhan91-art.github.io/deepseek-harness-easy')
    expect(install).toContain('unfinished until the Web workbench is on screen')
    expect(installZh).toContain('只发仓库地址就够')
    expect(readme).toContain('the URL alone is enough')
    expect(readme).not.toContain('npx @deepseek-ai/dsh')
    expect(agents).toContain('INSTALL.md')
    expect(agents).toContain('pnpm run desktop:install')
    expect(agents).toContain('do not stop after clone')
    expect(llms).toContain('INSTALL.md')
    expect(llms).toContain('pnpm run desktop:install')
    expect(llms).toContain('Do not stop after clone')
    expect(skill).toContain('The git URL alone is enough')
    expect(skill).toContain('Do not stop after clone')
    expect(copilot).toContain('The git URL alone is enough')
    expect(copilot).toContain('do not stop after clone or build')
    const gitignore = await readFile(join(root, '.gitignore'), 'utf8')
    expect(gitignore).toContain('/*.html')
    expect(gitignore).toContain('/dist/')
    expect(gitignore).toContain('/.dsh/')
  })
})
