import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { channels, APP_PROTOCOL, PRODUCTION_CALLBACK_URL } from '@/shared/constants'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

import __Store from 'electron-store'
/**
 * Vite workaround for "Store is not a constructor"
 * https://github.com/sindresorhus/electron-store/issues/289#issuecomment-2899942966
 */
type ElectronStoreConstructor = typeof __Store

const electronStoreModule = __Store as ElectronStoreConstructor & {
  default?: ElectronStoreConstructor
}

const Store = electronStoreModule.default ?? electronStoreModule

const store = new Store()
// Main process IPC Handlers
ipcMain.on(channels.AUTH_TOKEN_SET, (_event, key, token) => {
  store.set(key, token)
})

ipcMain.handle(channels.AUTH_TOKEN_GET, async (_event, key) => {
  return store.get(key)
})

ipcMain.on(channels.AUTH_TOKEN_CLEAR, (_event, key) => {
  store.delete(key)
})

// HTTP proxy handler - forwards HTTP requests from renderer to main process
ipcMain.handle(channels.HTTP_REQUEST, async (_event, options) => {
  const { url, method = 'GET', headers = {}, body } = options

  try {
    const res = await fetch(url, { method, headers, body })
    const text = await res.text()

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: text
    }
  } catch (error) {
    console.error('[main] http:request error', url, error)
    // Return error information in a structured way
    return {
      ok: false,
      status: 0,
      statusText: error instanceof Error ? error.message : 'Unknown error',
      headers: {},
      body: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

// OAuth popup code
const defaultOAuthRedirectUrl = (() => {
  if (!is.dev) {
    return PRODUCTION_CALLBACK_URL
  }

  const base = import.meta.env.VITE_DOMAIN?.trim()
  if (!base) return null
  const normalizedBase = base.replace(/\/+$/, '')
  return `${normalizedBase}/sso-callback`
})()

type AuthOpenPayload =
  | string
  | {
      url?: string
      callbackUrl?: string | null
    }

const safeParseUrl = (value?: string | null): URL | null => {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

const hasOAuthCallbackParams = (targetUrl: string): boolean => {
  const parsed = safeParseUrl(targetUrl)
  if (!parsed) return false
  const params = parsed.searchParams
  return params.has('rotating_token_nonce') || params.has('created_session_id')
}

const normalizeCallbackUrl = (value?: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const createOAuthCallbackMatcher = (callbackUrlOverride?: string | null) => {
  const normalizedCallbackUrl =
    normalizeCallbackUrl(callbackUrlOverride) ?? normalizeCallbackUrl(defaultOAuthRedirectUrl)
  const callbackUrlObject = safeParseUrl(normalizedCallbackUrl)
  const callbackUrlLower = normalizedCallbackUrl?.toLowerCase() ?? null

  return (targetUrl: string): boolean => {
    if (!targetUrl) return false

    if (callbackUrlObject) {
      const target = safeParseUrl(targetUrl)
      if (target) {
        const callbackOrigin = callbackUrlObject.origin
        const callbackPath = callbackUrlObject.pathname
        const targetOrigin = target.origin
        const targetPath = target.pathname

        if (
          callbackOrigin !== 'null' &&
          targetOrigin === callbackOrigin &&
          targetPath === callbackPath
        ) {
          return true
        }

        if (callbackOrigin === 'null' && target.protocol === callbackUrlObject.protocol) {
          return target.href.startsWith(callbackUrlObject.href)
        }
      }
    }

    if (callbackUrlLower && targetUrl.toLowerCase().startsWith(callbackUrlLower)) {
      return true
    }

    return hasOAuthCallbackParams(targetUrl)
  }
}

let authPopupWindow: BrowserWindow | null = null

const closeAuthPopupWindow = (): void => {
  if (authPopupWindow && !authPopupWindow.isDestroyed()) {
    authPopupWindow.close()
  }
  authPopupWindow = null
}

const registerAppProtocol = (): void => {
  if (is.dev) {
    return
  }

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1])
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL)
  }
}

registerAppProtocol()

ipcMain.on(channels.AUTH_OPENED_POPUP, (event, payload: AuthOpenPayload) => {
  const normalizedPayload =
    typeof payload === 'string'
      ? { url: payload, callbackUrl: undefined }
      : { url: payload?.url ?? '', callbackUrl: payload?.callbackUrl }

  if (!normalizedPayload.url) {
    console.warn('[main] auth:open invoked without a URL')
    return
  }

  closeAuthPopupWindow()

  const openerContents = event.sender
  const parentWindow =
    BrowserWindow.fromWebContents(openerContents) ?? BrowserWindow.getFocusedWindow()

  const authWindow = new BrowserWindow({
    width: 600,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    parent: parentWindow ?? undefined,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      nativeWindowOpen: true,
      session: parentWindow?.webContents.session ?? session.defaultSession
    }
  })

  authPopupWindow = authWindow
  authWindow.setMenuBarVisibility(false)

  const matchCallbackUrl = createOAuthCallbackMatcher(normalizedPayload.callbackUrl)
  let hasEmittedCallback = false

  const emitCallback = (callbackLocation: string): void => {
    if (hasEmittedCallback) return
    hasEmittedCallback = true

    if (!openerContents.isDestroyed()) {
      openerContents.send(channels.AUTH_CALLBACK, callbackLocation)
    }
  }

  const maybeHandleCallback = (nextUrl?: string | null, preventDefault?: () => void): void => {
    if (!nextUrl) return
    if (!matchCallbackUrl(nextUrl)) return

    if (preventDefault) {
      preventDefault()
    }

    emitCallback(nextUrl)

    if (!authWindow.isDestroyed()) {
      authWindow.close()
    }
  }

  authWindow.webContents.on('will-redirect', (navigationEvent, url) => {
    maybeHandleCallback(url, () => navigationEvent.preventDefault())
  })

  authWindow.webContents.on('will-navigate', (navigationEvent, url) => {
    maybeHandleCallback(url, () => navigationEvent.preventDefault())
  })

  authWindow.webContents.on('did-navigate', (_event, url) => {
    maybeHandleCallback(url)
  })

  authWindow.on('closed', () => {
    if (!openerContents.isDestroyed()) {
      openerContents.send(channels.AUTH_CLOSED_POPUP)
    }

    if (authPopupWindow === authWindow) {
      authPopupWindow = null
    }
  })

  authWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  authWindow.loadURL(normalizedPayload.url).catch((error) => {
    console.error('[main] Failed to open auth popup', normalizedPayload.url, error)
  })

  authWindow.once('ready-to-show', () => {
    authWindow.show()
  })
})
