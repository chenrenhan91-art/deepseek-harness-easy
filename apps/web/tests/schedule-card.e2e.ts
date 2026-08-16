// Keyless assembled-browser coverage for the beginner calendar schedule
// page. The page writes through `/schedule` and reads the `schedule`
// projection, so this scenario issues no model call: a stray stream fails loud.
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/schedule-card', import.meta.url))
const EMPTY_EXPECTED = join(SNAPSHOT_DIR, 'empty.expected.md')
const SCHEDULED_EXPECTED = join(SNAPSHOT_DIR, 'scheduled.expected.md')
const MODE = webSnapshotMode()
const PROMPT = 'Check the build'
const PAGE = '[data-schedule-page]'

function normalizeNextLabel(snapshot: string): string {
  return snapshot
    .replace(/\bIn \d+ minutes\b/g, 'In {{n}} minutes')
    .replace(/\bIn \d+ hours\b/g, 'In {{n}} hours')
    .replace(/\bIn \d+ days\b/g, 'In {{n}} days')
    .replace(/\d+分钟后/g, '{{n}}分钟后')
    .replace(/\d+小时后/g, '{{n}}小时后')
    .replace(/\d+天后/g, '{{n}}天后')
}

describe('web e2e: beginner calendar schedule page', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold()
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await page.getByRole('button', { name: '定时任务' }).waitFor({ timeout: 15_000 })
    expect(await page.getByRole('button', { name: 'Reminder', exact: true }).count()).toBe(0)
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('creates and cancels a daily task from the sidebar page', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-schedule-card'))
    await page.getByRole('button', { name: '定时任务' }).click()
    const dialog = page.locator(PAGE)
    await dialog.waitFor({ timeout: 15_000 })
    await compareOrRefreshGolden(
      EMPTY_EXPECTED,
      normalizeNextLabel(await captureStableAria(page, PAGE, scaffold.workspaceCwd)),
      MODE,
    )

    await page.getByPlaceholder('例如：检查构建').fill(PROMPT)
    const start = page.getByRole('button', { name: '开始定时任务' })
    await expect.poll(() => start.isEnabled(), { timeout: 15_000 }).toBe(true)
    await start.click()
    await dialog.getByRole('button', { name: '取消' }).waitFor({ timeout: 15_000 })
    await compareOrRefreshGolden(
      SCHEDULED_EXPECTED,
      normalizeNextLabel(await captureStableAria(page, PAGE, scaffold.workspaceCwd)),
      MODE,
    )

    await dialog.getByRole('button', { name: '取消' }).click()
    await expect.poll(() => dialog.getByRole('button', { name: '取消' }).count(), {
      timeout: 15_000,
    }).toBe(0)
    expect(await dialog.getByText(PROMPT).count()).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 60_000)

  it.skipIf(MODE === 'record')('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['empty.expected.md', 'scheduled.expected.md'])
  })
})
