import { ipcMain } from 'electron';
import type { Result } from 'neverthrow';
import type { ApiError, ApiResult } from '../contracts/api';
import {
  createCorrelationId,
  writeLocalDiagnostic,
} from './local-diagnostics';
import { createParentAuth } from './parent-auth';
import {
  getMainWindow,
  recordRendererReady,
  recordRendererStartupFailure,
} from './window';

type DatabaseApi = typeof import('./db');

export function isTrustedMainFrame(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): boolean {
  const window = getMainWindow();
  if (!window || window.isDestroyed() || event.sender.id !== window.webContents.id || event.senderFrame !== event.sender.mainFrame) return false;
  try {
    const actual = new URL(event.senderFrame.url);
    const expected = new URL(MAIN_WINDOW_WEBPACK_ENTRY);
    return actual.origin === expected.origin && actual.pathname === expected.pathname;
  } catch {
    return false;
  }
}

function toApiResult<T>(result: Result<T, ApiError>): ApiResult<T> {
  if (result.isErr()) return { ok: false, error: result.error };
  return { ok: true, value: result.value };
}

function register<T>(channel: string, operation: (input: unknown) => T, authorize: () => boolean = () => true): void {
  ipcMain.handle(channel, async (event, input) => {
    if (!isTrustedMainFrame(event)) return { ok: false, error: { code: 'UnauthorizedAction', message: 'This request is not allowed.' } };
    if (!authorize()) return { ok: false, error: { code: 'UnauthorizedAction', message: 'Unlock parent settings first.' } };
    try {
      return await operation(input);
    } catch {
      writeLocalDiagnostic({
        level: 'error', event: 'ipc.failed', correlationId: createCorrelationId(),
        err: { code: 'IPC_REQUEST_FAILED' },
        metadata: { stage: 'ipc.request', outcome: 'failure' },
      });
      return { ok: false, error: { code: 'InternalError', message: 'The request could not be completed.' } };
    }
  });
}

export function registerIpc(database: DatabaseApi): void {
  const parent = createParentAuth({ getDatabase: () => database.getDatabase() });
  // Administrative mutations are authorized here, in the main process; the renderer cannot skip the check.
  const registerParent = <T>(channel: string, operation: (input: unknown) => T) => register(channel, operation, parent.authorize);

  register('parent:status', () => toApiResult(parent.getStatus()));
  register('parent:setup-pin', (input) => toApiResult(parent.setupPin(input)));
  register('parent:unlock', (input) => toApiResult(parent.unlock(input)));
  register('parent:lock', () => toApiResult(parent.lock()));

  register('profiles:list', () => toApiResult(database.listProfiles()));
  registerParent('profiles:create', (input) => toApiResult(database.createProfile(input)));
  registerParent('profiles:set-explanation-language', (input) => toApiResult(database.setExplanationLanguage(input)));

  register('settings:get-language', () => toApiResult(database.getUiLanguage()));
  register('settings:get-active-profile', () => toApiResult(database.getActiveProfileId()));
  register('settings:set-active-profile', (input) => toApiResult(database.setActiveProfileId(input)));
  register('settings:set-language', (input) => toApiResult(database.setUiLanguage(input)));
  ipcMain.on('diagnostics:renderer-startup-failure', (event) => {
    if (isTrustedMainFrame(event)) recordRendererStartupFailure();
  });
  ipcMain.on('diagnostics:renderer-ready', (event) => {
    if (isTrustedMainFrame(event)) recordRendererReady();
  });
}
