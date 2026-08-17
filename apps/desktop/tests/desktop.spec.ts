import { once } from 'node:events'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_NAME,
  DEFAULT_WEB_URL,
  assertMacosDesktopHost,
  defaultDesktopDir,
  desktopAppPath,
  dshWebSpawn,
  installMacosDesktop,
  isElectronProcess,
  isListening,
  renderMacosLauncher,
  resolveDesktopNodePath,
  resolveDesktopPnpmPath,
  resolveInfoPlist,
  resolveRepoRoot,
  shellSingleQuote,
  spawnDshWeb,
  waitForListening,
  which,
} from '../src/index.ts'

const tmpDirs: string[] = []

function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-desktop-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop()
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true })
  }
})

const sampleInstall = {
  repoRoot: '/checkout',
  destinationDir: '/tmp/desktop',
  nodePath: '/usr/bin/node',
  pnpmPath: '/usr/bin/pnpm',
  electronPath: '/opt/electron',
  mainPath: '/checkout/apps/desktop/lib/main.js',
} as const

describe('dsh web spawn argv', () => {
  it('runs a JS pnpm entry through node', () => {
    expect(dshWebSpawn('/opt/pnpm.mjs', '/usr/bin/node')).toEqual({
      command: '/usr/bin/node',
      args: ['/opt/pnpm.mjs', 'dsh', 'web'],
    })
    expect(dshWebSpawn('/opt/pnpm.cjs', '/usr/bin/node').args[0]).toBe('/opt/pnpm.cjs')
    expect(dshWebSpawn('/opt/pnpm.js', '/usr/bin/node').command).toBe('/usr/bin/node')
  })

  it('runs a pnpm binary directly', () => {
    expect(dshWebSpawn('/usr/bin/pnpm', '/usr/bin/node')).toEqual({
      command: '/usr/bin/pnpm',
      args: ['dsh', 'web'],
    })
  })

  it('spawns the JS entry and records argv', async () => {
    const dir = tmp()
    const script = join(dir, 'pnpm.mjs')
    const logPath = join(dir, 'web.log')
    const argvPath = join(dir, 'argv.json')
    writeFileSync(script, `import { writeFileSync } from 'node:fs'
writeFileSync(${JSON.stringify(argvPath)}, JSON.stringify(process.argv.slice(2)))
`)
    const child = spawnDshWeb({
      repoRoot: dir,
      pnpmPath: script,
      nodePath: process.execPath,
      logPath,
    })
    await once(child, 'close')
    expect(JSON.parse(readFileSync(argvPath, 'utf8'))).toEqual(['dsh', 'web'])
  })
})

describe('workbench listen polling', () => {
  it('exposes the shipped Web bind', () => {
    expect(DEFAULT_WEB_URL).toBe('http://127.0.0.1:3080')
  })

  it('reports a server that answers HTTP', async () => {
    const server = http.createServer((_request, response) => {
      response.end('ok')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('expected a TCP address')
    try {
      expect(await isListening(`http://127.0.0.1:${String(address.port)}/`)).toBe(true)
    } finally {
      server.close()
    }
  })

  it('reports a closed port as down', async () => {
    expect(await isListening('http://127.0.0.1:1/')).toBe(false)
  })

  it('times out when TCP accepts but HTTP never starts', async () => {
    const server = net.createServer()
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('expected a TCP address')
    try {
      expect(await isListening(`http://127.0.0.1:${String(address.port)}/`)).toBe(false)
    } finally {
      server.close()
    }
  })

  it('returns on the first successful probe', async () => {
    expect(await waitForListening('http://example.invalid/', 0, async () => true)).toBe(true)
  })

  it('gives up when every probe fails', async () => {
    expect(await waitForListening('http://example.invalid/', 0, async () => false)).toBe(false)
  })
})

describe('checkout and Desktop paths', () => {
  it('finds the workspace root from this test file', () => {
    const root = resolveRepoRoot(import.meta.filename)
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name: string }
    expect(manifest.name).toBe('@deepseek-ai/dsh-root')
  })

  it('fails when no root manifest exists above the start file', () => {
    const dir = tmp()
    const start = join(dir, 'orphan.ts')
    writeFileSync(start, '')
    expect(() => resolveRepoRoot(start)).toThrow(/dsh-root/)
  })

  it('names the Finder app under the Desktop directory', () => {
    expect(desktopAppPath('/tmp/Desktop')).toBe(join('/tmp/Desktop', `${APP_NAME}.app`))
    expect(defaultDesktopDir().endsWith('/Desktop') || defaultDesktopDir().endsWith('\\Desktop')).toBe(true)
  })
})

describe('runtime path resolution', () => {
  it('prefers baked Node and pnpm environment values', () => {
    expect(resolveDesktopNodePath({ DSH_DESKTOP_NODE: '/baked/node' }, '/other/node', true)).toBe('/baked/node')
    expect(resolveDesktopPnpmPath({ DSH_DESKTOP_PNPM: '/baked/pnpm', npm_execpath: '/ignored' })).toBe('/baked/pnpm')
  })

  it('uses execPath outside Electron and npm_execpath for pnpm', () => {
    expect(resolveDesktopNodePath({}, '/usr/bin/node', false)).toBe('/usr/bin/node')
    expect(resolveDesktopPnpmPath({ npm_execpath: '/opt/pnpm.mjs' })).toBe('/opt/pnpm.mjs')
  })

  it('refuses the installer off macOS', () => {
    expect(() => {
      assertMacosDesktopHost('linux')
    }).toThrow(/only supports macOS/)
    expect(() => {
      assertMacosDesktopHost('darwin')
    }).not.toThrow()
  })

  it('detects Electron from process.versions.electron', () => {
    expect(isElectronProcess({} as NodeJS.ProcessVersions)).toBe(false)
    expect(isElectronProcess({ electron: '37.0.0' } as NodeJS.ProcessVersions)).toBe(true)
  })

  it.skipIf(process.platform === 'win32')('looks up node when Electron has no baked path', () => {
    const found = resolveDesktopNodePath({}, '/Electron', true)
    expect(existsSync(found)).toBe(true)
  })

  it.skipIf(process.platform === 'win32')('throws when which cannot find a command', () => {
    expect(() => which('dsh-desktop-missing-binary-xyz')).toThrow(/not on PATH/)
  })
})

describe('macos .app install', () => {
  it('quotes apostrophes in launcher paths', () => {
    expect(shellSingleQuote('it\'s')).toBe('\'it\'\\\'\'s\'')
  })

  it('renders a launcher that execs Electron with baked env', () => {
    const body = renderMacosLauncher(sampleInstall)
    expect(body.startsWith('#!/bin/sh\n')).toBe(true)
    expect(body).toContain('export DSH_DESKTOP_ROOT=\'/checkout\'')
    expect(body).toContain('exec \'/opt/electron\' \'/checkout/apps/desktop/lib/main.js\'')
    expect(readFileSync(new URL('../src/install-macos.ts', import.meta.url), 'utf8')).not.toContain('/Users/')
  })

  it('writes Info.plist, icon, and a 0755 launcher into a temp Desktop', () => {
    const destinationDir = tmp()
    const repoRoot = resolveRepoRoot(import.meta.filename)
    const app = installMacosDesktop({
      ...sampleInstall,
      repoRoot,
      destinationDir,
    })
    expect(app).toBe(join(destinationDir, `${APP_NAME}.app`))
    const plist = readFileSync(join(app, 'Contents/Info.plist'), 'utf8')
    expect(plist).toContain('art.chenrenhan.deepseek-harness-easy')
    expect(existsSync(join(app, 'Contents/Resources/AppIcon.icns'))).toBe(true)
    const executable = join(app, 'Contents/MacOS', APP_NAME)
    const launcher = readFileSync(executable, 'utf8')
    expect(launcher).toContain(repoRoot)
    if (process.platform !== 'win32') {
      expect(statSync(executable).mode & 0o111).not.toBe(0)
    }
  })

  it('omits the icon when the checkout has no icns', () => {
    const destinationDir = tmp()
    const app = installMacosDesktop({
      ...sampleInstall,
      repoRoot: tmp(),
      destinationDir,
    })
    expect(existsSync(join(app, 'Contents/Resources/AppIcon.icns'))).toBe(false)
    expect(readFileSync(join(app, 'Contents/Info.plist'), 'utf8')).toContain('art.chenrenhan.deepseek-harness-easy')
  })

  it('resolves Info.plist beside lib, then from the checkout, then fails', () => {
    const repoRoot = resolveRepoRoot(import.meta.filename)
    const layout = tmp()
    mkdirSync(join(layout, 'lib'))
    mkdirSync(join(layout, 'resources/macos'), { recursive: true })
    writeFileSync(join(layout, 'resources/macos/Info.plist'), 'beside\n')
    expect(readFileSync(resolveInfoPlist(join(layout, 'lib'), '/missing'), 'utf8')).toBe('beside\n')
    const emptyHere = tmp()
    expect(resolveInfoPlist(emptyHere, repoRoot)).toBe(join(repoRoot, 'apps/desktop/resources/macos/Info.plist'))
    expect(() => resolveInfoPlist(emptyHere, emptyHere)).toThrow(/missing Info.plist/)
  })
})
