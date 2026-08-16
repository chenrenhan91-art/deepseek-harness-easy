// Web e2e scenario: beginner mode selection. The roster's `roots` is an
// assembly fact the CLI entry resolves and patches in, so every other lane
// boots with an empty roster and no preset surface at all; this is the one
// lane that mounts the SHIPPED modes and puts the card grid in front of a
// browser.
//
// Two surfaces, one host rule: a session's composition is fixed when the
// session starts. Before that, the new-session grid stages the choice under
// the workspace picker — the only screen where it still works. After it, the
// session header names what the session runs and offers no control at all,
// because the host answers `agent-preset-locked` to anything else.
//
// Zero model calls: no replay fixture mounts, so a stray stream fails loud.
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold, seedSession, watchConsole,
  webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/agent-preset-selection', import.meta.url))
const GRID_EXPECTED = join(SNAPSHOT_DIR, 'grid.expected.md')
const HEADER_EXPECTED = join(SNAPSHOT_DIR, 'header.expected.md')
const MODE = webSnapshotMode()
const SEED_ID = 'agent-preset-selection-web-e2e'
/** A project skill default roots would have listed; beginner modes omit those roots. */
const SKILL_NAME = 'preset-catalog-demo'

/**
 * Seed one project skill under the connected workspace.
 *
 * Beginner modes set `includeDefaultRoots: false`, so this file must not
 * appear in `/` even though it sits in the workspace skill directory. The
 * slash catalog still differs by the mode-owned skills.
 * @param workspaceCwd - the scaffold's temp project parent.
 */
async function seedWorkspaceSkill(workspaceCwd: string): Promise<void> {
  const directory = join(workspaceCwd, 'workspace', '.agents', 'skills', SKILL_NAME)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'SKILL.md'), [
    '---',
    `name: ${SKILL_NAME}`,
    'description: Prove the slash catalog follows the session composition',
    '---',
    '',
    'Body.',
    '',
  ].join('\n'))
}

/**
 * A settled one-turn session with no model content: this lane asserts chrome
 * around a conversation, not a conversation, and a recorded turn would tie
 * the golden to a provider's wording for no gain.
 * @returns a tokenized session log ending on a closed turn.
 */
function seedLog(): string {
  const time = 1784974100000
  const at = (index: number, event: Record<string, unknown>): string =>
    JSON.stringify({ ...event, seq: index, time: time + index })
  return [
    JSON.stringify({ type: 'session', version: 0, id: '{{sessionId}}', createdAt: time, cwd: '{{cwd}}/workspace' }),
    at(0, { type: 'turn/start', data: { turn: 1, trigger: { kind: 'message', source: { kind: 'user', rpcId: 'seed' } } } }),
    at(1, {
      type: 'user/message',
      data: { content: [{ type: 'text', text: 'Seeded turn.' }], source: { kind: 'user', rpcId: 'seed' } },
      surfaceOp: 'append',
    }),
    at(2, { type: 'session/title', data: { title: 'Seeded turn', messageSeqs: [1], source: { kind: 'fallback' } } }),
    at(3, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }),
  ].join('\n')
}

/**
 * The preset the host reports for the blank session the workspace connect
 * produced. Addressed by id rather than by scanning the serialized list: the
 * seeded session records `writing` too, so a substring match over the whole
 * list answers before the switch has landed.
 * @param baseUrl - the scaffold's origin.
 * @returns the live session's preset, or undefined before it is listed.
 */
async function livePreset(baseUrl: string): Promise<string | undefined> {
  const response = await fetch(`${baseUrl}/api/session.list`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request', rpcId: 'agent-preset-live', method: 'session.list', payload: {},
    }),
  })
  const body = await response.json() as {
    result: { value?: { items: { sessionId: string; agentPreset?: string }[] } }
  }
  return body.result.value?.items.find(item => item.sessionId !== SEED_ID)?.agentPreset
}

/** Every option label the trigger menu currently lists. */
async function menuOptions(page: Page): Promise<string[]> {
  const menu = page.getByRole('listbox', { name: '触发候选建议' })
  await menu.waitFor({ timeout: 10_000 })
  return await menu.getByRole('option').allTextContents()
}

describe('web e2e: agent-preset selection', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    // A resumed session runs what it was created with; seeding one that
    // records `writing` is what makes the header label a claim about the
    // session rather than an echo of the current default (`study`).
    await seedSession(scaffold, seedLog(), SEED_ID, 'writing')
    await seedWorkspaceSkill(scaffold.workspaceCwd)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('offers the mode grid on the new-session screen, under the workspace picker', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-grid'))
    await connectFreshWorkspace(page, scaffold.workspaceCwd)

    const grid = page.getByRole('radiogroup')
    await grid.waitFor({ timeout: 10_000 })
    const snapshot = await captureStableAria(page, '[role="radiogroup"]', scaffold.workspaceCwd)

    await compareOrRefreshGolden(GRID_EXPECTED, snapshot, MODE)
    expect(snapshot).toContain('学习答疑')
    expect(snapshot).toContain('写作')
    expect(snapshot).toContain('做网页')
    expect(snapshot).toContain('表格数据')
    expect(snapshot).toContain('文件整理')
    expect(snapshot).toContain('做 PPT')
    expect(snapshot).toContain('电脑自动化')
    expect(snapshot).toContain('学编程')
    expect(await grid.getByRole('radio', { name: /学习答疑/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('applies the staged pick to the blank session, and the host honors it', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-stage'))
    await page.getByRole('radio', { name: /写作/ }).click()

    // The grid stages; the blank session the workspace connect produced is
    // what the stage lands on. The host's own answer is what comes back.
    await expect.poll(() => livePreset(scaffold.baseUrl), { timeout: 15_000 }).toBe('writing')
    expect(await page.getByRole('radio', { name: /写作/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('re-reads the slash catalog through the composition the switch installed', async () => {
    // Continues the previous case: the grid has already applied `writing` to
    // the blank session, and this one reads the menu that switch left behind.
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-slash-catalog'))
    const composer = page.locator('textarea:enabled').last()

    await expect.poll(() => page.locator('[data-skill-pins]').count(), { timeout: 15_000 }).toBe(1)
    expect(await page.locator('[data-skill-pin="draft-and-revise"]').textContent()).toContain('写作')
    expect(page.locator('[data-skill-pin="write-plain"]')).toHaveCount(1)
    expect(page.locator('[data-skill-pin="keep-the-facts"]')).toHaveCount(1)

    await composer.fill('/')
    await expect.poll(() => menuOptions(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([expect.stringContaining('draft-and-revise')]))
    const onWriting = await menuOptions(page)
    expect(onWriting.some(option => option.includes(SKILL_NAME))).toBe(false)
    expect(onWriting.some(option => option.includes('draft-and-revise'))).toBe(true)
    expect(onWriting.some(option => option.includes('write-plain'))).toBe(true)
    expect(onWriting.some(option => option.includes('keep-the-facts'))).toBe(true)
    expect(onWriting.some(option => option.includes('explain-clearly'))).toBe(false)
    expect(onWriting.some(option => option.startsWith('vision'))).toBe(true)
    expect(onWriting.some(option => option.startsWith('compact'))).toBe(true)
    expect(onWriting.some(option => option.startsWith('plan'))).toBe(true)
    await composer.fill('')

    await page.getByRole('radio', { name: /学习答疑/ }).click()
    await expect.poll(() => livePreset(scaffold.baseUrl), { timeout: 15_000 }).toBe('study')

    await expect.poll(() => page.locator('[data-skill-pin="explain-clearly"]').count(), { timeout: 15_000 }).toBe(1)
    expect(page.locator('[data-skill-pin="draft-and-revise"]')).toHaveCount(0)

    await composer.fill('/')
    await expect.poll(() => menuOptions(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([expect.stringContaining('explain-clearly')]))
    const onStudy = await menuOptions(page)
    expect(onStudy.some(option => option.includes(SKILL_NAME))).toBe(false)
    expect(onStudy.some(option => option.includes('explain-clearly'))).toBe(true)
    expect(onStudy.some(option => option.includes('check-understanding'))).toBe(true)
    expect(onStudy.some(option => option.includes('work-an-example'))).toBe(true)
    expect(onStudy.some(option => option.includes('draft-and-revise'))).toBe(false)
    expect(onStudy.some(option => option.startsWith('vision'))).toBe(true)
    expect(onStudy.some(option => option.startsWith('compact'))).toBe(true)
    expect(onStudy.some(option => option.startsWith('plan'))).toBe(true)
    await composer.fill('')
  }, 90_000)

  it('labels a resumed session with the preset it was created under', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-header'))
    // The seeded session's cwd is the scaffold root rather than the connected
    // workspace, so it lists under 未分组; the group collapses by default.
    await page.getByRole('treeitem', { name: /^未分组/ }).click()
    await page.locator('[role="treeitem"]').last().click()
    await page.getByText('Seeded turn.').waitFor({ timeout: 15_000 })

    const snapshot = await captureStableAria(page, '[class*="titleRow"]', scaffold.workspaceCwd)

    await compareOrRefreshGolden(HEADER_EXPECTED, snapshot, MODE)
    expect(snapshot).toContain('写作')
    expect(snapshot).toContain('button "会话日志"')
    expect(snapshot.indexOf('写作')).toBeLessThan(snapshot.indexOf('button "会话日志"'))
    // Static chrome, not a control: the header can only report a composition
    // the host would refuse to change.
    expect(snapshot).not.toContain('button "写作"')
  })

  it('drove every surface without a page error or a stream warning', () => {
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })
})
