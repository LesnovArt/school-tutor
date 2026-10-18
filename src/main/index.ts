import { app } from 'electron';
import path from 'node:path';
import {
  createCorrelationId,
  initializeLocalDiagnostics,
  writeLocalDiagnostic,
} from './local-diagnostics';
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
let cleanupAttempted = false;
let cleanupFailed = false;

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
    const window = windowApi?.getMainWindow();
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(async () => {
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
      return;
    }
    const result = databaseApi.openDatabase();
    if (result.isErr()) {
      writeLocalDiagnostic({
        level: 'error', event: 'startup.failed', correlationId: databaseCorrelationId,
        err: { code: 'DATABASE_INITIALIZATION_FAILED' },
        metadata: { stage: 'database.initialize', outcome: 'failure' },
      });
      app.exit(1);
      return;
    }
    writeLocalDiagnostic({
      level: 'info', event: 'database.initialize', correlationId: databaseCorrelationId,
      metadata: { stage: 'database.initialize', outcome: 'success' },
    });
    ipcApi.registerIpc(databaseApi);
    try {
      windowApi?.createMainWindow();
    } catch {
      writeLocalDiagnostic({
        level: 'error', event: 'startup.failed', correlationId: createCorrelationId(),
        err: { code: 'WINDOW_CREATION_FAILED' },
        metadata: { stage: 'window.create', outcome: 'failure' },
      });
      app.exit(1);
    }
  }).catch(() => {
    writeLocalDiagnostic({
      level: 'error', event: 'startup.failed', correlationId: startupCorrelationId,
      err: { code: 'STARTUP_FAILED' },
      metadata: { stage: 'app.ready', outcome: 'failure' },
    });
    app.exit(1);
  });

  app.on('activate', () => {
    if (windowApi?.getMainWindow()?.isDestroyed() !== false) windowApi?.createMainWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

void startApplication().catch(() => {
  writeLocalDiagnostic({
    level: 'error', event: 'startup.failed', correlationId: startupCorrelationId,
    err: { code: 'STARTUP_FAILED' },
    metadata: { stage: 'bootstrap', outcome: 'failure' },
  });
  app.exit(1);
});
