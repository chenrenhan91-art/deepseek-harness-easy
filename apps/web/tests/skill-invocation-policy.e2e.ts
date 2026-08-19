// Web e2e scenario: a beginner mode catalog does not list workspace skills.
// Four policy-quadrant files are seeded under the connected workspace; study
// sets `includeDefaultRoots: false`, so they stay out of `/explain`, while
// the mode-owned `explain-clearly` skill still appears. A real chromium
// connects a fresh workspace; no model call is issued, so a stray stream
// fails loud on the open LLM seam.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory,
  captureStableAria,
  compareOrRefreshGolden,
  launchWebScaffold,
  watchConsole,
  webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/skill-invocation-policy', import.meta.url))
const MENU_EXPECTED = join(SNAPSHOT_DIR, 'menu.expected.md')
const MODE = webSnapshotMode()

interface SeedSkill {
  name: string
  description: string
  frontmatter: string
}

const SKILLS: readonly SeedSkill[] = [
  {
    name: 'policy-shared',
    description: 'Available to both model and user invocation',
    frontmatter: '',
  },
  {
    name: 'policy-model-only',
    description: 'Available only to model invocation',
    frontmatter: 'user-invocable: false\n',
  },
  {
    name: 'policy-user-only',
    description: 'Available only to user invocation',
    frontmatter: 'disable-model-invocation: true\n',
  },
  {
    name: 'policy-trusted-only',
    description: 'Available only to trusted internal callers',
    frontmatter: 'disable-model-invocation: true\nuser-invocable: false\n',
  },
]

async function seedSkills(workspaceCwd: string): Promise<void> {
  for (const skill of SKILLS) {
    const directory = join(workspaceCwd, 'workspace', '.agents', 'skills', skill.name)
    await mkdir(directory, { recursive: true })
    const policyLines = skill.frontmatter === '' ? [] : skill.frontmatter.trimEnd().split('\n')
    await writeFile(join(directory, 'SKILL.md'), [
      '---',
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      ...policyLines,
      '---',
      '',
      `# ${skill.name}`,
      '',
    ].join('\n'))
  }
}

describe('web e2e: skill invocation policy through the real host', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    await seedSkills(scaffold.workspaceCwd)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('keeps workspace policy skills out of the beginner catalog', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-skill-invocation-policy'))
    const input = page.locator('textarea').first()
    await expect.poll(() => input.inputValue(), { timeout: 15_000 }).toMatch(/explain-clearly/)
    await input.fill('/explain')
    const menu = page.getByRole('listbox', { name: '触发候选建议' })
    await expect.poll(
      () => menu.getByRole('option', { name: /explain-clearly/ }).count(),
      { timeout: 10_000 },
    ).toBe(1)
    // Beginner modes set `includeDefaultRoots: false`, so workspace policy
    // skills never enter this catalog. The four seeded files stay on disk
    // as the proof that a default-roots composition would have listed them.
    expect(await menu.getByRole('option', { name: /policy-shared/ }).count()).toBe(0)
    expect(await menu.getByRole('option', { name: /policy-user-only/ }).count()).toBe(0)
    expect(await menu.getByRole('option', { name: /policy-model-only/ }).count()).toBe(0)

    const snapshot = await captureStableAria(page, '[role="listbox"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(MENU_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
    await assertFixtureInventory(SNAPSHOT_DIR, ['menu.expected.md'])
  })
})
