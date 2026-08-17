/**
 * macOS Electron shell around `pnpm dsh web`.
 * @module @deepseek-ai/dsh-desktop
 */

export {
  installMacosDesktop,
  renderMacosLauncher,
  resolveInfoPlist,
  shellSingleQuote,
} from './install-macos.ts'
export { DEFAULT_WEB_URL, LISTEN_TIMEOUT_MS, isListening, waitForListening } from './listen.ts'
export { APP_NAME, defaultDesktopDir, desktopAppPath, resolveRepoRoot } from './paths.ts'
export {
  assertMacosDesktopHost,
  isElectronProcess,
  resolveDesktopNodePath,
  resolveDesktopPnpmPath,
  which,
} from './runtime.ts'
export { dshWebSpawn, spawnDshWeb } from './server.ts'
