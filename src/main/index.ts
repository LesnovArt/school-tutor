import { app, type BrowserWindow } from 'electron';
import path from 'node:path';
import {
  createCorrelationId,
  initializeLocalDiagnostics,
  writeLocalDiagnostic,
} from './local-diagnostics';
import { createEnsureMainWindow } from './window-lifecycle';
type DatabaseApi = typeof import('./db');
type WindowApi = typeof import('./window');

// Initialize local diagnostics before importing database or startup modules.
try {
  initializeLocalDiagnostics({
    logDirectory: path.join(app.getPath('userData'), 'logs'),
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    packaged: app.isPackaged,
  });
} catch {
  // Diagnostics must not block startup, even if Electron cannot resolve userData.
}

const startupCorrelationId = createCorrelationId();
writeLocalDiagnostic({
  level: 'info', event: 'startup.started', correlationId: startupCorrelationId,
  metadata: { stage: 'bootstrap', outcome: 'started' },
});

let databaseApi: DatabaseApi | undefined;
let windowApi: WindowApi | undefined;
let databaseInitialization: Promise<boolean> | undefined;
let ensureMainWindow: (() => Promise<BrowserWindow | undefined>) | undefined;
let cleanupAttempted = false;
let cleanupFailed = false;

function reportWindowCreationFailure(): void {
  writeLocalDiagnostic({
    level: 'error', event: 'startup.failed', correlationId: createCorrelationId(),
    err: { code: 'WINDOW_CREATION_FAILED' },
    metadata: { stage: 'window.create', outcome: 'failure' },
  });
  app.exit(1);
}

function focusWindow(window: BrowserWindow | undefined): void {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.focus();
}

function cleanup(): void {
  if (cleanupAttempted) return;
  cleanupAttempted = true;
  try {
    databaseApi?.closeDatabase();
  } catch {
    cleanupFailed = true;
  }
}

app.on('before-quit', cleanup);
process.on('exit', (code) => {
  cleanup();
  writeLocalDiagnostic({
    level: code === 0 && !cleanupFailed ? 'info' : 'warn',
    event: 'app.shutdown', correlationId: createCorrelationId(),
    ...(cleanupFailed ? { err: { code: 'SHUTDOWN_CLEANUP_FAILED' } } : {}),
    metadata: { stage: 'app.shutdown', outcome: code === 0 && !cleanupFailed ? 'success' : 'failure' },
  });
});

async function startApplication(): Promise<void> {
  // Delay importing startup modules until diagnostics can record their failures.
  const [ipcApi, loadedWindowApi] = await Promise.all([import('./ipc'), import('./window')]);
  windowApi = loadedWindowApi;
  ensureMainWindow = createEnsureMainWindow({
    waitForDatabase: () => databaseInitialization ?? Promise.resolve(false),
    getMainWindow: () => windowApi?.getMainWindow(),
    createMainWindow: () => {
      if (!windowApi) throw new Error('Window module is not initialized');
      return windowApi.createMainWindow();
    },
  });
  const lockCorrelationId = createCorrelationId();
  const hasSingleInstanceLock = app.requestSingleInstanceLock();
  writeLocalDiagnostic({
    level: hasSingleInstanceLock ? 'info' : 'warn',
    event: 'app.single_instance_lock', correlationId: lockCorrelationId,
    metadata: { stage: 'single_instance_lock', outcome: hasSingleInstanceLock ? 'acquired' : 'denied' },
  });

  if (!hasSingleInstanceLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    void ensureMainWindow?.().then(focusWindow).catch(reportWindowCreationFailure);
  });

  databaseInitialization = app.whenReady().then(async () => {
    writeLocalDiagnostic({
      level: 'info', event: 'startup.stage', correlationId: startupCorrelationId,
      metadata: { stage: 'app.ready', outcome: 'success' },
    });
    const databaseCorrelationId = createCorrelationId();
    writeLocalDiagnostic({
      level: 'info', event: 'database.initialize', correlationId: databaseCorrelationId,
      metadata: { stage: 'database.initialize', outcome: 'started' },
    });
    try {
      databaseApi = await import('./db');
    } catch (error) {
      const detail = typeof error === 'object' && error !== null ? error as { code?: unknown; message?: unknown } : {};
      const missingSqlite = detail.code === 'MODULE_NOT_FOUND' && typeof detail.message === 'string' && detail.message.includes('better-sqlite3');
      writeLocalDiagnostic({
        level: 'error', event: 'startup.failed', correlationId: databaseCorrelationId,
        err: { code: missingSqlite ? 'SQLITE_MODULE_MISSING' : 'STARTUP_FAILED' },
        metadata: { stage: 'database.initialize', outcome: 'failure' },
      });
      app.exit(1);
      return false;
    }
    const result = databaseApi.openDatabase();
    if (result.isErr()) {
      writeLocalDiagnostic({
        level: 'error', event: 'startup.failed', correlationId: databaseCorrelationId,
        err: { code: 'DATABASE_INITIALIZATION_FAILED' },
        metadata: { stage: 'database.initialize', outcome: 'failure' },
      });
      app.exit(1);
      return false;
    }
    writeLocalDiagnostic({
      level: 'info', event: 'database.initialize', correlationId: databaseCorrelationId,
      metadata: { stage: 'database.initialize', outcome: 'success' },
    });
    ipcApi.registerIpc(databaseApi);
    return true;
  }).catch(() => {
    writeLocalDiagnostic({
      level: 'error', event: 'startup.failed', correlationId: startupCorrelationId,
      err: { code: 'STARTUP_FAILED' },
      metadata: { stage: 'app.ready', outcome: 'failure' },
    });
    app.exit(1);
    return false;
  });

  app.on('activate', () => {
    void ensureMainWindow?.().then(focusWindow).catch(reportWindowCreationFailure);
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  void ensureMainWindow().catch(reportWindowCreationFailure);
}

void startApplication().catch(() => {
  writeLocalDiagnostic({
    level: 'error', event: 'startup.failed', correlationId: startupCorrelationId,
    err: { code: 'STARTUP_FAILED' },
    metadata: { stage: 'bootstrap', outcome: 'failure' },
  });
  app.exit(1);
});
