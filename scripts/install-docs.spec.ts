import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')

describe('AI install docs', () => {
  it('tells agents to clone this fork and start pnpm dsh web', async () => {
    const install = await readFile(join(root, 'INSTALL.md'), 'utf8')
    const llms = await readFile(join(root, 'llms.txt'), 'utf8')
    expect(install).toContain('https://github.com/chenrenhan91-art/deepseek-harness-easy.git')
    expect(install).toContain('pnpm dsh web')
    expect(install).toContain('不要让我双击 .command')
    expect(llms).toContain('INSTALL.md')
    expect(llms).toContain('pnpm dsh web')
  })
})
