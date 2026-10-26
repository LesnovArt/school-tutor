import { app, BrowserWindow } from 'electron';
import {
  createCorrelationId,
  writeLocalDiagnostic,
} from './local-diagnostics';

let currentWindow: BrowserWindow | undefined;
let currentWindowCorrelationId = createCorrelationId();
let rendererReady = false;
let rendererFailureRecorded = false;

export function getMainWindow(): BrowserWindow | undefined {
  return currentWindow;
}

export function getWindowCorrelationId(): string {
  return currentWindowCorrelationId;
}

export function recordRendererReady(): void {
  if (rendererReady) return;
  rendererReady = true;
  writeLocalDiagnostic({
    level: 'info', event: 'renderer.ready', correlationId: currentWindowCorrelationId,
    metadata: { stage: 'renderer.readiness', outcome: 'success' },
  });
}

export function recordRendererStartupFailure(): void {
  if (rendererReady || rendererFailureRecorded) return;
  rendererFailureRecorded = true;
  writeLocalDiagnostic({
    level: 'error', event: 'renderer.failed', correlationId: currentWindowCorrelationId,
    err: { code: 'RENDERER_STARTUP_FAILED' },
    metadata: { stage: 'renderer.readiness', outcome: 'failure' },
  });
}

export function createMainWindow(): BrowserWindow {
  const correlationId = createCorrelationId();
  currentWindowCorrelationId = correlationId;
  rendererReady = false;
  rendererFailureRecorded = false;
  writeLocalDiagnostic({
    level: 'info', event: 'window.create', correlationId,
    metadata: { stage: 'window.create', outcome: 'started' },
  });
  writeLocalDiagnostic({
    level: 'info', event: 'preload.load', correlationId,
    metadata: { stage: 'preload.load', preloadStatus: 'configured' },
  });

  const window = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 640,
    minHeight: 520,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  currentWindow = window;
  let preloadLoadFailed = false;
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('did-finish-load', () => {
    if (window.isDestroyed()) return;
    writeLocalDiagnostic({
      level: 'info', event: 'window.load', correlationId,
      metadata: { stage: 'window.load', outcome: 'success' },
    });
    if (!preloadLoadFailed) {
      writeLocalDiagnostic({
        level: 'info', event: 'preload.load', correlationId,
        metadata: { stage: 'preload.load', preloadStatus: 'error_not_observed' },
      });
    }
  });
  window.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (window.isDestroyed() || !isMainFrame || code === -3) return;
    writeLocalDiagnostic({
      level: 'error', event: 'window.load', correlationId,
      err: { code: 'PAGE_LOAD_FAILED' },
      metadata: { stage: 'window.load', outcome: 'failure' },
    });
  });
  window.webContents.on('preload-error', () => {
    if (window.isDestroyed()) return;
    preloadLoadFailed = true;
    writeLocalDiagnostic({
      level: 'error', event: 'preload.load', correlationId,
      err: { code: 'PRELOAD_LOAD_FAILED' },
      metadata: { stage: 'preload.load', preloadStatus: 'failed' },
    });
  });
  window.webContents.on('render-process-gone', () => {
    if (window.isDestroyed()) return;
    writeLocalDiagnostic({
      level: 'error', event: 'renderer.failed', correlationId,
      err: { code: 'RENDERER_PROCESS_GONE' },
      metadata: { stage: 'renderer.readiness', outcome: 'failure' },
    });
  });
  if (!app.isPackaged) window.webContents.openDevTools({ mode: 'detach' });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== MAIN_WINDOW_WEBPACK_ENTRY) event.preventDefault();
  });
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show();
  });
  void window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch(() => {
    if (window.isDestroyed()) return;
    writeLocalDiagnostic({
      level: 'error', event: 'window.load', correlationId,
      err: { code: 'WINDOW_LOAD_FAILED' },
      metadata: { stage: 'window.load', outcome: 'failure' },
    });
    app.exit(1);
  });
  window.on('closed', () => {
    if (currentWindow === window) currentWindow = undefined;
  });
  return window;
}
