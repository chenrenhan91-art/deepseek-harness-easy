import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { boot, healProfilesModuleFallback, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { resolveSessionPreset, SETTINGS_NAMESPACE } from '@deepseek-ai/dsh-agent-presets'
import { applyChildComposition, childSessionMeta } from '@deepseek-ai/dsh-subagent'
import { CallId } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-compaction-basic'
import type {} from '@deepseek-ai/dsh-skill'
import type {} from '@deepseek-ai/dsh-tools'
// Type-only: resolves `ctx.get('sessionProjections')` and `ctx.get('tokenMeter')`.
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-token-meter'

const CONFIG_DIR = fileURLToPath(new URL('../config/', import.meta.url))
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
/** The shipped Web surface: the dsh-base and dsh-web-app bundle patches over an empty preset root. */
const BASE_PATCH = join(REPO_ROOT, 'packages/bundle/base/cordis.patch.yml')
const WEB_PATCH = join(REPO_ROOT, 'packages/bundle/web-app/cordis.patch.yml')
/** The installation anchor whose dependency surface the preset module fallback mirrors. */
const INSTALL_ANCHOR = join(REPO_ROOT, 'apps/cli/package.json')
/** Every shipped beginner mode, in the order the roster presents them. */
const MODES = [
  'web-page', 'writing', 'sheet', 'files', 'study', 'slides', 'autopilot', 'learn-code',
] as const

/**
 * Boot the shipped Web composition, minus the rows that would bind a port,
 * touch the network, or write outside the test. Everything that decides an
 * agent's capabilities is the real thing, including every shipped mode.
 */
async function bootWeb(settingsFile: string, extra: PatchOptions[] = []): Promise<Context> {
  const storageRoot = join(dirname(settingsFile), 'storages')
  const patches: PatchOptions[] = [
    ...loadOverlayPatches('dsh-test', BASE_PATCH),
    ...loadOverlayPatches('dsh-test', WEB_PATCH),
    // The settings row defaults to `$DSH_HOME/settings.yaml`. Left alone it
    // reads the developer's own document — and since the default preset is a
    // setting, a stored `agent-presets.default` would decide this file's
    // outcome. Point it at a temp file for the same reason the roster below
    // names only the shipped root.
    { id: 'settings', config: { path: settingsFile, watch: false } },
    // storage-json's root is anchored to the real $DSH_HOME. Unpinned, this
    // file writes the developer's own `~/.dsh/storages/` — and then reads it
    // back on the next run, so a stored document from any other build decides
    // this test's boot. Same reason the settings row above is pinned.
    { id: 'storage-json', config: { root: storageRoot } },
    // Host rows with side effects outside this process: a bound port, a served
    // asset tree, a telemetry exporter. `api-gateway` and `directory-picker`
    // stay ENABLED on purpose — the api-proxy is the host row that injects
    // `subagents`, `workspace`, and the rest of the agent plane, so disabling
    // it would hide exactly the breakage this file exists to catch: a service
    // moved into the presets that a host row still waits for. The boot audit
    // is that assertion.
    { id: 'webserver', disabled: true },
    // The web bundle's runtime row injects `webServer`, so it cannot
    // activate without the bound port disabled above. It owns dist serving
    // and the URL prompt line — surface glue, not anything that decides an
    // agent's capabilities, which is all this file asserts.
    { id: 'web-runtime', disabled: true },
    { id: 'session-telemetry-otel', disabled: true },
    // A deployment-level skill on the host registry's GLOBAL layer — the same
    // registration shape a repository plugin's skill root uses. The layered
    // skills test below proves it reaches preset-composed agents.
    { id: 'skill-badge', disabled: false },
    { id: 'modules', disabled: true },
    { id: 'connection', disabled: true },
    // The always-on reload chain waits for the browser roster and bound port
    // disabled above.
    { id: 'client-hmr', disabled: true },
    // The shipped `-auto` chooser resolves its interaction from a running
    // host and so waits for the webserver disabled above; the browse variant
    // supplies `directoryPicker` without one.
    { id: 'directory-picker', disabled: true },
    { insert: [
      { id: 'directory-picker-browse', name: '@deepseek-ai/dsh-host-directory-picker-browse' },
      { id: 'ui-directory-picker-browse', name: '@deepseek-ai/dsh-client-ui-directory-picker-browse' },
    ] },
    // The roster AppCLIEntry would patch in; only the shipped root, so a
    // developer's own `~/.dsh/.preset` cannot change this test's outcome.
    // `default` here is the COMPOSITION default — the base layer the settings
    // document overrides.
    {
      id: 'agent-presets',
      config: {
        default: 'study',
        roots: [{ path: join(CONFIG_DIR, 'agent-presets'), trust: 'system' }],
        includeUserRoot: false,
      },
    },
    ...extra,
  ]
  // The surface is patch layers over an empty preset root, so the root sits
  // outside this workspace and bare plugin names cannot resolve by Node's
  // upward walk. The flat fallback the preset boot maintains is what makes
  // them resolvable — the same mechanism, not a test-only shim.
  const home = dirname(settingsFile)
  healProfilesModuleFallback(INSTALL_ANCHOR, home)
  const profileDir = join(home, 'profiles', 'spec')
  await mkdir(profileDir, { recursive: true })
  const rootConfig = join(profileDir, 'cordis.yml')
  await writeFile(rootConfig, '[]\n')
  return await boot('dsh-test', rootConfig, patches, (bootCtx) => {
    provideCmdline(bootCtx, { args: [], exit: () => {} })
  })
}

const toolNames = (ctx: Context, agent?: Agent): string[] =>
  ctx.tools.schemas(agent).map(schema => schema.name).sort()

/**
 * What a mode composed, without the reminder tools the host installs on root
 * agents alone — a delegated child is not a root agent, so comparing a child
 * to its parent tool for tool would measure that rule rather than the mode.
 */
const composedToolNames = (ctx: Context, agent: Agent): string[] =>
  toolNames(ctx, agent).filter(name => !name.startsWith('schedule_'))

/** The persona text an agent composed from `preset` was given. */
async function persona(ctx: Context, agent: Agent): Promise<string> {
  const assembly = await ctx.systemPrompt.assemble({ scope: agent })
  return assembly.sections.find(section => section.name === 'deployment:persona')?.text ?? ''
}

let ctx: Context
beforeAll(async () => {
  const settingsFile = join(await mkdtemp(join(tmpdir(), 'dsh-web-presets-')), 'settings.yaml')
  await writeFile(settingsFile, '{}\n')
  ctx = await bootWeb(settingsFile)
}, 120_000)

describe('the shipped Web composition', () => {
  it('leaves the global tool layer empty', () => {
    // Every model-facing tool belongs to a mode, `ask_user_question`
    // included: a tool in the global layer reaches EVERY agent regardless of
    // which mode composed it, so a two-tool benchmark surface would really
    // present three. A regression here means an agent-plane row came back to
    // the host composition.
    expect(toolNames(ctx)).toEqual([])
  })

  it('keeps the token meter and its context-meter projections on the host plane', async () => {
    // Read before any preset in this file mounts, which is what makes this an
    // ownership assertion rather than a mount-order coincidence: a preset-side
    // meter sits behind an `isolate` realm and is invisible to `ctx.get`.
    //
    // The projection registry is process-wide rather than scope-layered, so a
    // preset-side meter would make the browser's context meter a function of
    // which modes happen to be mounted rather than a per-session fact.
    expect(ctx.get('tokenMeter')).toBeDefined()
    const projections = ctx.get('sessionProjections')
    if (projections === undefined) throw new Error('the Web composition must compose a projection registry')
    const handle = await ctx.agents.create({
      sessionId: SessionId('preset-meter'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    try {
      // A subset assertion: `tasks`, `goal`, and the rest register into the
      // same process-wide table, and this is about the meter's three units.
      expect(Object.keys(projections.snapshot(handle.agent.session).values))
        .toEqual(expect.arrayContaining(['contextBreakdown', 'contextPressure', 'tokenUsage']))
    } finally {
      await handle.dispose()
    }
  })

  it('supplies the eight shipped modes, and only those, from the system root', async () => {
    const listed = await ctx.agentPresets.list()

    // Roster order is the order the mode grid presents; every shipped mode
    // declares `order` in its `preset.yml` so the grid never sorts by id.
    expect(listed.map(preset => preset.id)).toEqual([...MODES])
    expect(listed.every(preset => preset.trust === 'system')).toBe(true)
    // A card with no Chinese name or one-line description is unreadable on
    // the first screen, which is the only place a beginner picks a mode.
    expect(listed.every(preset => preset.name !== undefined && preset.description !== undefined)).toBe(true)
    expect(listed.every(preset => preset.broken === undefined)).toBe(true)
    expect(ctx.agentPresets.defaultId).toBe('study')
  })

  it('composes the same beginner toolset from every mode', async () => {
    const handle = await ctx.agents.create({
      sessionId: SessionId('preset-tools'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    try {
      // The EXACT catalog, not a spot-check: an omission is this design's
      // quietest failure mode, because a row that registers into the wrong
      // layer mounts cleanly and simply contributes nothing. `glob`/`grep` are
      // excluded for the reason the TUI composition e2e excludes them — they
      // depend on ripgrep being present on the machine.
      // `schedule_*` is host-plane and installs itself on every root agent, so
      // reminders work in every mode rather than only in `autopilot`.
      expect(toolNames(ctx, handle.agent).filter(name => name !== 'glob' && name !== 'grep')).toEqual([
        'ask_user_question', 'bash', 'edit', 'exit_plan_mode', 'read', 'read_image',
        'schedule_create', 'schedule_delete', 'schedule_list',
        'skill', 'todo_write', 'web_fetch', 'web_search', 'write',
      ])
    } finally {
      await handle.dispose()
    }
  })

  it('differs between modes by persona and skills rather than by tools', async () => {
    const study = await ctx.agents.create({
      sessionId: SessionId('preset-study'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    const page = await ctx.agents.create({
      sessionId: SessionId('preset-web-page'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'web-page').then(() => undefined),
    })
    try {
      // Same capabilities, different expertise: a beginner who picked "做网页"
      // must not discover that the mode also took a tool away.
      expect(toolNames(ctx, page.agent)).toEqual(toolNames(ctx, study.agent))
      expect(await persona(ctx, page.agent)).not.toBe(await persona(ctx, study.agent))

      const pageSkills = (await ctx.skills.list({ scope: page.agent })).map(skill => skill.name)
      const studySkills = (await ctx.skills.list({ scope: study.agent })).map(skill => skill.name)
      expect(pageSkills).toEqual(expect.arrayContaining([
        'build-a-page', 'look-distinct', 'check-on-phone', 'vision',
      ]))
      expect(studySkills).toEqual(expect.arrayContaining([
        'explain-clearly', 'check-understanding', 'work-an-example', 'vision',
      ]))
      expect(studySkills).not.toContain('build-a-page')
      expect(pageSkills).not.toContain('explain-clearly')
    } finally {
      await page.dispose()
      await study.dispose()
    }
  })

  it('keeps two differently composed sessions independent', async () => {
    const study = await ctx.agents.create({
      sessionId: SessionId('preset-both-study'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    const writing = await ctx.agents.create({
      sessionId: SessionId('preset-both-writing'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'writing').then(() => undefined),
    })
    try {
      expect(toolNames(ctx, writing.agent).length).toBeGreaterThan(5)

      await writing.dispose()

      // Tearing one session down leaves the other whole.
      expect(toolNames(ctx, study.agent).length).toBeGreaterThan(5)
      expect(toolNames(ctx)).toEqual([])
    } finally {
      await study.dispose()
    }
  })

  it('ships each mode\'s expertise inside its own directory', async () => {
    // A mode's skill root is derived from its own `baseUrl`, so the expertise
    // travels with the directory wherever the mode is installed.
    const skill = join(CONFIG_DIR, 'agent-presets', 'web-page', 'skills', 'build-a-page', 'SKILL.md')

    expect((await readFile(skill, 'utf8')).startsWith('---\nname: build-a-page')).toBe(true)
  })

  it('merges the global skill layer into a mode agent\'s catalog, keeping local discovery preset-side', async () => {
    const proj = await mkdtemp(join(tmpdir(), 'dsh-preset-skill-proj-'))
    await mkdir(join(proj, '.dsh', 'skills', 'project-proof'), { recursive: true })
    await writeFile(join(proj, '.dsh', 'skills', 'project-proof', 'SKILL.md'), [
      '---',
      'name: project-proof',
      'description: Proves the preset layer discovers project skills beside global ones.',
      '---',
      '',
      'Project proof body.',
      '',
    ].join('\n'))

    const handle = await ctx.agents.create({
      // Unique per run: the composition persists into the ambient DSH home,
      // and a fixed id would collide with a log an earlier run left there.
      sessionId: SessionId(`preset-skills-${randomUUID()}`),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    try {
      // The host (global) view carries the deployment-level provider alone:
      // local discovery moved behind the presets with `skill-filesystem`.
      expect((await ctx.skills.list({ cwd: proj })).map(skill => skill.name)).toEqual(['dsh-badge'])

      // A mode agent's view merges the global layer with its own local
      // discovery over the session cwd.
      const scoped = (await ctx.skills.list({ cwd: proj, scope: handle.agent })).map(skill => skill.name)
      expect(scoped).toContain('dsh-badge')
      expect(scoped).toContain('project-proof')

      // The mode's own loader tool resolves the global-layer skill.
      const loaded = await ctx.tools.execute({
        callId: CallId('preset-skills-load'),
        name: 'skill',
        arguments: { name: 'dsh-badge' },
        signal: new AbortController().signal,
        agent: handle.agent,
      })
      expect(loaded.isError).toBe(false)
      expect(JSON.stringify(loaded.content)).toContain('powered by dsh')
    } finally {
      await handle.dispose()
    }
  })

  it('never rewrites the preset file it composed from', async () => {
    // The Loader persists a tree whose plugin self-disposed, and tearing an
    // agent down disposes its whole subtree. Inherited, that rewrote the
    // shipped composition — truncating it to `[]` the first time a session
    // ended — so `PresetTree` refuses to write at all.
    const path = join(CONFIG_DIR, 'agent-presets', 'study', 'agent.cordis.yml')
    const before = await readFile(path, 'utf8')

    const handle = await ctx.agents.create({
      sessionId: SessionId('preset-readonly'),
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    await handle.dispose()
    // Slack, not a race the number has to win. The write is driven by the
    // Loader's fiber-unload listener, which fires as the subtree's fibers
    // settle rather than when `dispose()` resolves, and the Loader exposes no
    // flush to await. A regression writes synchronously inside that listener,
    // so any wait past settlement fails; a longer one only slows the test.
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(await readFile(path, 'utf8')).toBe(before)
  })
})

describe('a switch survives the session', () => {
  it('records the choice so the log states what the agent runs', async () => {
    const handle = await ctx.agents.create({
      sessionId: SessionId('preset-switch-logged'),
      meta: { agentPreset: 'study' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    try {
      // The api-proxy's select does exactly this pair while the session is blank.
      await ctx.agentPresets.recompose(handle.agent.ctx, 'writing')
      handle.agent.session.append('agent-preset/selected', { agentPreset: 'writing' })

      // The header keeps the creation fact; the log carries what it runs.
      expect(handle.agent.session.header.agentPreset).toBe('study')
      expect(resolveSessionPreset(handle.agent.session)).toBe('writing')
    } finally {
      await handle.dispose()
    }
  })

  it('rebuilds a switched session from the log, not the creation header', () => {
    // The exact shape a resume reads back from disk: the header says study,
    // the log records the switch the user made while the session was blank.
    const rebuilt = resolveSessionPreset({
      header: { version: 0, id: SessionId('x'), createdAt: 0, agentPreset: 'study' },
      events: [
        { type: 'agent-preset/selected', seq: 1, time: 0, data: { agentPreset: 'writing' } },
        { type: 'turn/start', seq: 2, time: 0, data: { turn: 0, trigger: { kind: 'message', source: { kind: 'user' } } } },
      ] as never,
    })

    // Reading the header alone would compose the creation-time mode over a
    // history another one produced — the replay the blank-only lock prevents.
    expect(rebuilt).toBe('writing')
  })
})

describe('a forked session', () => {
  it('inherits the composition its seeded history was produced under', async () => {
    const parent = await ctx.agents.create({
      sessionId: SessionId('preset-fork-parent'),
      meta: { agentPreset: 'writing' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'writing').then(() => undefined),
    })
    const inherited = resolveSessionPreset(parent.agent.session)
    const child = await ctx.agents.create({
      sessionId: SessionId('preset-fork-child'),
      meta: {
        parentSession: SessionId('preset-fork-parent'),
        seedLength: 0,
        ...inherited === undefined ? {} : { agentPreset: inherited },
      },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, inherited).then(() => undefined),
    })
    try {
      // Composing nothing would leave the child empty: this layer moved every
      // model-facing row out of the host plane, so there is nothing to inherit
      // for free any more.
      expect(toolNames(ctx, child.agent)).toEqual(toolNames(ctx, parent.agent))
      expect(toolNames(ctx, child.agent).length).toBeGreaterThan(0)
    } finally {
      await child.dispose()
      await parent.dispose()
    }
  })
})

describe('a delegated child', () => {
  it('runs on the composition its parent runs on', async () => {
    const parent = await ctx.agents.create({
      sessionId: SessionId('preset-child-parent'),
      meta: { agentPreset: 'study' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    // Exactly what an in-process subagent driver's creation window does.
    const child = await parent.agent.ctx.agents.create({
      sessionId: SessionId('preset-child'),
      meta: childSessionMeta(parent.agent, 1, 0),
      setup: (agentCtx) => {
        applyChildComposition(agentCtx, parent.agent, {})
      },
    })
    try {
      expect(composedToolNames(ctx, child.agent)).toEqual(composedToolNames(ctx, parent.agent))
      // Every shipped mode is a whole agent; an empty child here is the
      // defect, and equality alone would not catch it.
      expect(toolNames(ctx, child.agent)).toContain('bash')
      expect(child.agent.session.header.agentPreset).toBe('study')
    } finally {
      await child.dispose()
      await parent.dispose()
    }
  })

  it('follows a parent that switched preset while blank', async () => {
    const parent = await ctx.agents.create({
      sessionId: SessionId('preset-child-switch-parent'),
      meta: { agentPreset: 'study' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'study').then(() => undefined),
    })
    await ctx.agentPresets.recompose(parent.agent.ctx, 'writing')
    const child = await parent.agent.ctx.agents.create({
      sessionId: SessionId('preset-child-switch'),
      meta: childSessionMeta(parent.agent, 1, 0),
      setup: (agentCtx) => {
        applyChildComposition(agentCtx, parent.agent, {})
      },
    })
    try {
      // The live scope chain is the authority, not the parent's creation
      // header — which still names `study`.
      expect(composedToolNames(ctx, child.agent)).toEqual(composedToolNames(ctx, parent.agent))
      expect(child.agent.session.header.agentPreset).toBe('writing')
    } finally {
      await child.dispose()
      await parent.dispose()
    }
  })
})

describe('a launcher that configures no writable root', () => {
  // The claim this default exists for, asserted through the real shipped
  // bundles rather than a hand-built context: `apps/cli` patches in only the
  // system root, and a person's own presets are found anyway because the
  // roster derives `<dshHome>/.agent-presets` itself. `$DSH_HOME` is pointed
  // at a temp home BEFORE boot — the derived root is resolved when the plugin
  // is constructed, and an unpinned run would read the developer's own.
  let derivedCtx: Context
  let previousHome: string | undefined

  beforeAll(async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-preset-derived-'))
    previousHome = process.env.DSH_HOME
    process.env.DSH_HOME = home
    await mkdir(join(home, '.agent-presets', 'derived-mine'), { recursive: true })
    await writeFile(
      join(home, '.agent-presets', 'derived-mine', 'agent.cordis.yml'),
      '- id: tool-todo\n  name: \'@deepseek-ai/dsh-tool-todo\'\n  config:\n    allowParallelInProgress: true\n',
    )
    const settingsFile = join(await mkdtemp(join(tmpdir(), 'dsh-preset-derived-settings-')), 'settings.yaml')
    await writeFile(settingsFile, '{}\n')
    // Only the shipped root, exactly what `composeProfile` supplies; the
    // writable one is the roster's own default rather than this patch's job.
    derivedCtx = await bootWeb(settingsFile, [{
      id: 'agent-presets',
      config: {
        default: 'study',
        roots: [{ path: join(CONFIG_DIR, 'agent-presets'), trust: 'system' }],
        includeUserRoot: true,
      },
    }])
  }, 120_000)

  afterAll(async () => {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    await derivedCtx.fiber.dispose()
  })

  it('discovers and mounts a preset the person authored under the harness home', async () => {
    const listed = await derivedCtx.agentPresets.list()

    const mine = listed.find(preset => preset.id === 'derived-mine')
    expect(mine).toMatchObject({ trust: 'user' })
    // Omitted rather than undefined: a healthy row carries no `broken` key.
    expect(mine?.broken).toBeUndefined()
    expect(derivedCtx.agentPresets.authorable).toBe(true)

    const handle = await derivedCtx.agents.create({
      sessionId: SessionId('preset-derived-root'),
      setup: agentCtx => derivedCtx.agentPresets.mount(agentCtx, 'derived-mine').then(() => undefined),
    })
    try {
      expect(toolNames(derivedCtx, handle.agent)).toContain('todo_write')
    } finally {
      await handle.dispose()
    }
  })
})

describe('authoring a preset on a shipped mode', () => {
  let authorCtx: Context
  let userRoot: string

  beforeAll(async () => {
    userRoot = join(await mkdtemp(join(tmpdir(), 'dsh-preset-authoring-')), 'profiles')
    const settingsFile = join(await mkdtemp(join(tmpdir(), 'dsh-preset-authoring-settings-')), 'settings.yaml')
    await writeFile(settingsFile, '{}\n')
    authorCtx = await bootWeb(settingsFile, [{
      id: 'agent-presets',
      config: {
        default: 'study',
        roots: [
          { path: join(CONFIG_DIR, 'agent-presets'), trust: 'system' },
          // The root does not exist yet: a deployment whose user has authored
          // nothing is the normal first-run state.
          { path: userRoot, trust: 'user' },
        ],
        includeUserRoot: false,
      },
    }])
  })

  it('refuses to copy over or delete a shipped mode', async () => {
    await expect(authorCtx.agentPresets.copy('study', 'web-page')).rejects.toThrow(/already exists/)
    await expect(authorCtx.agentPresets.remove('study')).rejects.toThrow(/ships with the deployment/)
  })

  it.each(['../escape', 'a/b', '/abs', 'Upper'])('refuses the uncontainable id %j', async (id) => {
    // The id becomes a directory name under the user root, so containment is
    // checked on the id rather than on the joined path afterwards.
    await expect(authorCtx.agentPresets.copy('study', id)).rejects.toThrow()
  })

  it('copies a shipped mode a session then really composes from', async () => {
    await authorCtx.agentPresets.copy('study', 'my-agent', '我的模式')

    // Round-trips through the roster as a `user` row carrying the given name
    // and the source's description, over the source's own composition text.
    const preset = await authorCtx.agentPresets.resolve('my-agent')
    const source = await authorCtx.agentPresets.resolve('study')
    expect(preset.trust).toBe('user')
    expect(preset.name).toBe('我的模式')
    expect(preset.description).toBe(source.description)
    expect(await authorCtx.agentPresets.read('my-agent')).toBe(await authorCtx.agentPresets.read('study'))
    // Owner-only, in an owner-only directory: a composition is executable
    // configuration on a machine that may have other users.
    expect((await stat(preset.path)).mode & 0o777).toBe(0o600)
    const handle = await authorCtx.agents.create({
      sessionId: SessionId('preset-authored'),
      setup: agentCtx => authorCtx.agentPresets.mount(agentCtx, 'my-agent').then(() => undefined),
    })
    try {
      // The copy composes an agent, from a directory copied through the
      // service into a root outside the installed harness.
      expect(toolNames(authorCtx, handle.agent)).toContain('bash')
    } finally {
      await handle.dispose()
    }
  })

  it('deletes what it copied', async () => {
    await authorCtx.agentPresets.copy('study', 'doomed')

    await authorCtx.agentPresets.remove('doomed')

    expect((await authorCtx.agentPresets.list()).map(preset => preset.id)).not.toContain('doomed')
  })
})

/**
 * Which mode an unnamed session gets is a user setting layered over the
 * composition's own default. The package suite proves the layering against a
 * hand-built context; this proves it through the shipped `cordis.yml` — that
 * the roster and the settings provider are actually wired to each other, and
 * that the id the setting names is the one a session composes from.
 */
describe('the default preset as a user setting', () => {
  it('composes an unnamed session from the stored default, not the composed one', async () => {
    expect(ctx.agentPresets.defaultId).toBe('study')

    await ctx.settings.update(settingsNamespace(SETTINGS_NAMESPACE), { default: 'writing' })
    try {
      expect(ctx.agentPresets.defaultId).toBe('writing')

      const handle = await ctx.agents.create({
        sessionId: SessionId('preset-user-default'),
        setup: agentCtx => ctx.agentPresets.mount(agentCtx).then(() => undefined),
      })
      try {
        // `mount()` with no id resolves the effective default; the persona is
        // what distinguishes one mode's composition from another's.
        expect(await persona(ctx, handle.agent)).toContain('写作')
      } finally {
        await handle.dispose()
      }
    } finally {
      // The context is shared with the rest of the file. `replace({})` drops
      // the user section wholesale so the field re-inherits the composition
      // base; `update` merges, and would leave the override standing.
      await ctx.settings.replace(settingsNamespace(SETTINGS_NAMESPACE), {})
    }

    expect(ctx.agentPresets.defaultId).toBe('study')
  })
})

describe('a session keeps the preset it was created with', () => {
  it('refuses to adopt a live session under a different preset', async () => {
    const handle = await ctx.agents.create({
      sessionId: SessionId('preset-locked'),
      meta: { agentPreset: 'writing' },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'writing').then(() => undefined),
    })
    try {
      // The api-proxy guard reads exactly this: the header records what the
      // session runs, so naming anything else is a caller error rather than a
      // switch. Its history was produced under `writing`'s composition.
      expect(handle.agent.session.header.agentPreset).toBe('writing')
    } finally {
      await handle.dispose()
    }
  })
})
