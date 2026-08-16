/**
 * Assemble the beginner desktop Release zips: a built Web slice, official
 * portable Node, and a launcher that opens the system browser. This is not
 * the source-run `pnpm dsh web` path.
 */
import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, unlinkSync } from 'node:fs'
import { chmod, cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { parseArgs } from 'node:util'
import { isEntry } from './release/process.ts'

const root = resolve(import.meta.dirname, '..')
const PACKAGING = join(root, 'packaging', 'desktop')
const DEPLOY_FILTER = '@deepseek-ai/dsh'
const FALLBACK_NODE_VERSION = 'v24.11.0'

/** A desktop zip the Release page names for beginners. */
export type DesktopPlatform = 'macos' | 'windows'

/** CLI flags for {@link packDesktop}. */
export interface PackDesktopOptions {
  /** Destination directory for the two zips. */
  readonly outDir: string
  /** Skip `pnpm run build` when artifacts already exist. */
  readonly skipBuild: boolean
  /** Skip downloading official Node (tests supply a runtime tree). */
  readonly skipNodeDownload: boolean
  /** Platforms to assemble; default both. */
  readonly platforms: readonly DesktopPlatform[]
}

/**
 * @param platform - desktop zip family.
 * @returns Release asset filename.
 */
export function zipName(platform: DesktopPlatform): string {
  return platform === 'macos' ? 'DeepSeek-Harness-macOS.zip' : 'DeepSeek-Harness-Windows.zip'
}

/**
 * Official Node.js dist archive for one portable runtime.
 * @param version - `v24.x.y` including the leading `v`.
 * @param family - Node dist family tag.
 * @returns archive file name on nodejs.org.
 */
export function nodeDistArchive(version: string, family: 'darwin-arm64' | 'darwin-x64' | 'win-x64'): string {
  const ext = family === 'win-x64' ? 'zip' : 'tar.gz'
  return `node-${version}-${family}.${ext}`
}

/**
 * @param version - `v24.x.y` including the leading `v`.
 * @param family - Node dist family tag.
 * @returns official download URL.
 */
export function nodeDistUrl(version: string, family: 'darwin-arm64' | 'darwin-x64' | 'win-x64'): string {
  return `https://nodejs.org/dist/${version}/${nodeDistArchive(version, family)}`
}

/**
 * @param argv - process arguments after the script name.
 * @returns parsed pack options.
 */
export function parsePackDesktopArgs(argv: readonly string[]): PackDesktopOptions {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      out: { type: 'string', default: 'dist/desktop' },
      'skip-build': { type: 'boolean', default: false },
      'skip-node-download': { type: 'boolean', default: false },
      platform: { type: 'string', multiple: true },
    },
    strict: true,
  })
  const platforms = values.platform ?? ['macos', 'windows']
  for (const platform of platforms) {
    if (platform !== 'macos' && platform !== 'windows') {
      throw new Error(`pack-desktop: unknown --platform ${JSON.stringify(platform)}`)
    }
  }
  return {
    outDir: resolve(root, values.out),
    skipBuild: values['skip-build'],
    skipNodeDownload: values['skip-node-download'],
    platforms: platforms as DesktopPlatform[],
  }
}

/**
 * Commands that prove a staged slice can start the built CLI.
 * @param nodePath - portable or host Node.
 * @param binPath - deployed `lib/bin.js`.
 * @returns argv pairs for `--version` and `web --help`.
 */
export function smokeCommands(nodePath: string, binPath: string): readonly { label: string; args: readonly string[] }[] {
  return [
    { label: 'dsh --version', args: [nodePath, binPath, '--version'] },
    { label: 'dsh web --help', args: [nodePath, binPath, 'web', '--help'] },
  ]
}

function pnpmBin(): string {
  const fromEnv = process.env.npm_execpath
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  return 'pnpm'
}

function run(label: string, command: string, args: readonly string[], cwd = root): void {
  console.log(`pack-desktop: ${label}: ${command} ${args.join(' ')}`)
  const result = spawnSync(command, [...args], { cwd, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`pack-desktop: ${label} exited ${String(result.status)}`)
}

function capture(command: string, args: readonly string[], cwd = root): string {
  const result = spawnSync(command, [...args], { cwd, encoding: 'utf8' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`pack-desktop: ${command} ${args.join(' ')} exited ${String(result.status)}:\n${result.stderr}`)
  }
  return result.stdout.trim()
}

/**
 * Pick the newest Node 24 release from the official index, or a pinned fallback.
 * @param versions - `nodejs.org/dist/index.json` rows.
 * @returns version string including the leading `v`.
 */
export function selectNode24(versions: readonly { version: string }[]): string {
  const match = versions.find(row => /^v24\.\d+\.\d+$/.test(row.version))
  return match === undefined ? FALLBACK_NODE_VERSION : match.version
}

async function latestNode24(): Promise<string> {
  const response = await fetch('https://nodejs.org/dist/index.json')
  if (!response.ok) {
    console.warn(`pack-desktop: Node index HTTP ${String(response.status)}; using ${FALLBACK_NODE_VERSION}`)
    return FALLBACK_NODE_VERSION
  }
  return selectNode24(await response.json() as { version: string }[])
}

async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok || response.body === null) {
    throw new Error(`pack-desktop: download failed ${url} (${String(response.status)})`)
  }
  await mkdir(dirname(destination), { recursive: true })
  await pipeline(response.body, createWriteStream(destination))
}

async function extractArchive(archive: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true })
  if (archive.endsWith('.zip')) run('unzip', 'unzip', ['-q', archive, '-d', destination])
  else run('untar', 'tar', ['-xzf', archive, '-C', destination])
}

async function deployApp(staging: string): Promise<void> {
  await rm(staging, { recursive: true, force: true })
  await mkdir(dirname(staging), { recursive: true })
  run('deploy', pnpmBin(), [
    '--filter',
    DEPLOY_FILTER,
    'deploy',
    '--legacy',
    '--prod',
    '--config.node-linker=hoisted',
    '--config.auto-install-peers=false',
    '--config.link-workspace-packages=true',
    staging,
  ])
  const bin = join(staging, 'lib', 'bin.js')
  if (!existsSync(bin)) throw new Error(`pack-desktop: deployed CLI missing ${bin}`)
}

async function copyRuntimeApp(appSource: string, runtimeRoot: string): Promise<void> {
  await cp(appSource, join(runtimeRoot, 'app'), { recursive: true })
  await cp(join(PACKAGING, 'launch.mjs'), join(runtimeRoot, 'launch.mjs'))
}

async function assembleMacos(params: {
  work: string
  appSource: string
  nodeVersion: string
  cache: string
  skipNodeDownload: boolean
}): Promise<string> {
  const app = join(params.work, 'DeepSeek Harness.app')
  const contents = join(app, 'Contents')
  const runtime = join(contents, 'Resources', 'runtime')
  await mkdir(join(contents, 'MacOS'), { recursive: true })
  await mkdir(join(contents, 'Resources'), { recursive: true })
  await cp(join(PACKAGING, 'macos', 'Info.plist'), join(contents, 'Info.plist'))
  const launcher = join(contents, 'MacOS', 'DeepSeek Harness')
  await cp(join(PACKAGING, 'macos', 'launcher.sh'), launcher)
  await chmod(launcher, 0o755)
  const icns = join(PACKAGING, 'macos', 'AppIcon.icns')
  if (existsSync(icns)) await cp(icns, join(contents, 'Resources', 'AppIcon.icns'))
  await copyRuntimeApp(params.appSource, runtime)
  if (!params.skipNodeDownload) {
    for (const family of ['darwin-arm64', 'darwin-x64'] as const) {
      const archiveName = nodeDistArchive(params.nodeVersion, family)
      const archive = join(params.cache, archiveName)
      if (!existsSync(archive)) await download(nodeDistUrl(params.nodeVersion, family), archive)
      const extractTo = join(params.work, `extract-${family}`)
      await extractArchive(archive, extractTo)
      await cp(join(extractTo, `node-${params.nodeVersion}-${family}`), join(runtime, `node-${family}`), { recursive: true })
    }
  }
  await cp(join(PACKAGING, 'BEGINNER.zh.txt'), join(params.work, '使用说明.txt'))
  return app
}

async function assembleWindows(params: {
  work: string
  appSource: string
  nodeVersion: string
  cache: string
  skipNodeDownload: boolean
}): Promise<string> {
  const folder = join(params.work, 'windows')
  const runtime = join(folder, 'runtime')
  await mkdir(runtime, { recursive: true })
  await copyRuntimeApp(params.appSource, runtime)
  if (!params.skipNodeDownload) {
    const family = 'win-x64' as const
    const archiveName = nodeDistArchive(params.nodeVersion, family)
    const archive = join(params.cache, archiveName)
    if (!existsSync(archive)) await download(nodeDistUrl(params.nodeVersion, family), archive)
    const extractTo = join(params.work, 'extract-win-x64')
    await extractArchive(archive, extractTo)
    await cp(join(extractTo, `node-${params.nodeVersion}-${family}`), join(runtime, 'node'), { recursive: true })
  }
  const exe = join(folder, 'DeepSeek Harness.exe')
  run('go-windows-launcher', 'go', [
    'build',
    '-ldflags', '-H windowsgui',
    '-o', exe,
    join(PACKAGING, 'windows', 'launcher.go'),
  ], join(PACKAGING, 'windows'))
  await cp(join(PACKAGING, 'BEGINNER.zh.txt'), join(folder, '使用说明.txt'))
  return folder
}

function zipTree(source: string, destination: string, entries: readonly string[]): void {
  if (existsSync(destination)) unlinkSync(destination)
  run('zip', 'zip', ['-qry', destination, ...entries], source)
}

function smokeStaged(nodePath: string, appRoot: string): void {
  const bin = join(appRoot, 'lib', 'bin.js')
  for (const command of smokeCommands(nodePath, bin)) {
    const [executable, ...argv] = command.args
    if (executable === undefined) throw new Error(`pack-desktop: ${command.label} has no executable`)
    const output = capture(executable, argv, appRoot)
    if (output.length === 0) throw new Error(`pack-desktop: ${command.label} produced no output`)
    console.log(`pack-desktop: smoke ${command.label}: ${output.split('\n')[0]}`)
  }
}

/**
 * Build both beginner desktop zips.
 * @param options - pack flags.
 */
export async function packDesktop(options: PackDesktopOptions): Promise<void> {
  if (!options.skipBuild) run('build', pnpmBin(), ['run', 'build'])
  const staging = join(options.outDir, 'staging')
  const cache = join(options.outDir, 'cache')
  await mkdir(options.outDir, { recursive: true })
  await deployApp(join(staging, 'app'))
  const nodeVersion = options.skipNodeDownload ? FALLBACK_NODE_VERSION : await latestNode24()
  const hostNode = process.execPath
  smokeStaged(hostNode, join(staging, 'app'))

  if (options.platforms.includes('macos')) {
    const work = join(staging, 'macos')
    await rm(work, { recursive: true, force: true })
    await assembleMacos({
      work,
      appSource: join(staging, 'app'),
      nodeVersion,
      cache,
      skipNodeDownload: options.skipNodeDownload,
    })
    zipTree(work, join(options.outDir, zipName('macos')), ['DeepSeek Harness.app', '使用说明.txt'])
  }
  if (options.platforms.includes('windows')) {
    const work = join(staging, 'windows-work')
    await rm(work, { recursive: true, force: true })
    const folder = await assembleWindows({
      work,
      appSource: join(staging, 'app'),
      nodeVersion,
      cache,
      skipNodeDownload: options.skipNodeDownload,
    })
    zipTree(folder, join(options.outDir, zipName('windows')), ['DeepSeek Harness.exe', 'runtime', '使用说明.txt'])
  }
}

if (isEntry(import.meta.url)) {
  const options = parsePackDesktopArgs(process.argv.slice(2))
  await packDesktop(options)
}
