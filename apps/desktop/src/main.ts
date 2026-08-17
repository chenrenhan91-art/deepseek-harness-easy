/**
 * Electron main process: spawn `dsh web` if needed and load it in a window
 * after the composed boot graph is present.
 * @module @deepseek-ai/dsh-desktop/main
 */

import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog } from 'electron'
import { DEFAULT_WEB_URL, LISTEN_TIMEOUT_MS, isListening, isWorkbenchReady, waitForListening } from './listen.ts'
import { resolveRepoRoot } from './paths.ts'
import { resolveDesktopNodePath, resolveDesktopPnpmPath } from './runtime.ts'
import { spawnDshWeb } from './server.ts'

const repoRoot = process.env.DSH_DESKTOP_ROOT ?? resolveRepoRoot(fileURLToPath(import.meta.url))
const pnpmPath = resolveDesktopPnpmPath()
const nodePath = resolveDesktopNodePath()

let ownedChild: ReturnType<typeof spawnDshWeb> | undefined

async function openWorkbench(): Promise<void> {
  const url = DEFAULT_WEB_URL
  const logDir = join(homedir(), '.dsh')
  if (!await isWorkbenchReady(url)) {
    if (!await isListening(url)) {
      await mkdir(logDir, { recursive: true })
      ownedChild = spawnDshWeb({
        repoRoot,
        pnpmPath,
        nodePath,
        logPath: join(logDir, 'desktop-web.log'),
      })
    }
    const up = await waitForListening(url, LISTEN_TIMEOUT_MS, isWorkbenchReady)
    if (!up) {
      dialog.showErrorBox(
        'DeepSeek Harness',
        `${url} did not become ready. See ${join(logDir, 'desktop-web.log')}.`,
      )
      app.quit()
      return
    }
  }
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'DeepSeek Harness',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  await window.loadURL(url)
}

app.on('before-quit', () => {
  ownedChild?.kill()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.whenReady().then(() => openWorkbench()).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  dialog.showErrorBox('DeepSeek Harness', message)
  app.quit()
})
