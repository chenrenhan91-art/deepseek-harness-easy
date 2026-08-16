import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  nodeDistArchive,
  nodeDistUrl,
  parsePackDesktopArgs,
  selectNode24,
  smokeCommands,
  MACOS_LAUNCHER_NAME,
  WINDOWS_LAUNCHER_GOENV,
  zipName,
} from './pack-desktop.ts'

describe('desktop pack names and Node dist URLs', () => {
  it('names the two Release zips', () => {
    expect(zipName('macos')).toBe('DeepSeek-Harness-macOS.zip')
    expect(zipName('windows')).toBe('DeepSeek-Harness-Windows.zip')
  })

  it('builds official Node.js dist URLs', () => {
    expect(nodeDistArchive('v24.11.0', 'darwin-arm64')).toBe('node-v24.11.0-darwin-arm64.tar.gz')
    expect(nodeDistArchive('v24.11.0', 'win-x64')).toBe('node-v24.11.0-win-x64.zip')
    expect(nodeDistUrl('v24.11.0', 'darwin-x64'))
      .toBe('https://nodejs.org/dist/v24.11.0/node-v24.11.0-darwin-x64.tar.gz')
  })

  it('selects the first Node 24 row and falls back when the index has none', () => {
    expect(selectNode24([{ version: 'v23.0.0' }, { version: 'v24.8.0' }, { version: 'v24.7.0' }]))
      .toBe('v24.8.0')
    expect(selectNode24([{ version: 'v22.19.0' }])).toBe('v24.11.0')
  })

  it('parses pack flags', () => {
    const options = parsePackDesktopArgs(['--out', 'tmp/desktop', '--skip-build', '--platform', 'macos'])
    expect(options.skipBuild).toBe(true)
    expect(options.skipNodeDownload).toBe(false)
    expect(options.platforms).toEqual(['macos'])
    expect(options.outDir.endsWith('tmp/desktop')).toBe(true)
  })

  it('strips the extra -- that pnpm run forwards', () => {
    const options = parsePackDesktopArgs(['--', '--out', 'dist/desktop'])
    expect(options.outDir.endsWith('dist/desktop')).toBe(true)
  })

  it('refuses an unknown platform', () => {
    expect(() => parsePackDesktopArgs(['--platform', 'linux'])).toThrow(/unknown --platform/)
  })

  it('cross-compiles the Windows launcher from macOS or Linux', () => {
    expect(WINDOWS_LAUNCHER_GOENV).toEqual({ GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' })
  })

  it('smokes the built CLI entry, not tsx source', () => {
    const commands = smokeCommands('/pack/node', '/pack/app/lib/bin.js')
    expect(commands.map(command => command.args)).toEqual([
      ['/pack/node', '/pack/app/lib/bin.js', '--version'],
      ['/pack/node', '/pack/app/lib/bin.js', 'web', '--help'],
    ])
  })
})

describe('desktop launcher templates', () => {
  it('keeps wrappers free of a developer checkout path and opens the system browser', async () => {
    const desktop = join(import.meta.dirname, '../packaging/desktop')
    const launch = await readFile(join(desktop, 'launch.mjs'), 'utf8')
    const shell = await readFile(join(desktop, 'macos/launcher.sh'), 'utf8')
    const golang = await readFile(join(desktop, 'windows/launcher.go'), 'utf8')
    expect(launch).toContain('http://127.0.0.1:3080')
    expect(launch).toContain("command: 'open'")
    expect(launch).toContain("command: 'cmd'")
    expect(launch).toContain("'app', 'lib', 'bin.js'")
    expect(launch).not.toContain('tsx/esm')
    expect(shell).not.toContain('/Users/')
    expect(shell).not.toContain('.app')
    expect(shell).not.toContain('Contents/')
    expect(shell).toContain('DSH_DESKTOP_RUNTIME')
    expect(shell).toContain('launch.mjs')
    expect(MACOS_LAUNCHER_NAME).toBe('启动 DeepSeek Harness.command')
    expect(golang).not.toContain('/Users/')
    expect(golang).toContain('DSH_DESKTOP_RUNTIME')
    expect(golang).toContain('launch.mjs')
  })
})
