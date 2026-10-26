import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, input?: unknown) => Promise<unknown>>(),
  logged: [] as unknown[],
  correlationIds: [] as string[],
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, input?: unknown) => Promise<unknown>) => mocks.handlers.set(channel, handler),
    on: vi.fn(),
  },
}));
vi.mock('./window', () => ({
  getMainWindow: () => ({ isDestroyed: () => false, webContents: { id: 7 } }),
  recordRendererReady: vi.fn(),
  recordRendererStartupFailure: vi.fn(),
}));
vi.mock('./local-diagnostics', () => ({
  createCorrelationId: () => mocks.correlationIds.shift(),
  writeLocalDiagnostic: (record: unknown) => mocks.logged.push(record),
}));

import { registerIpc } from './ipc';

describe('IPC exception boundary', () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.logged.length = 0;
    mocks.correlationIds = [
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    ];
    (globalThis as typeof globalThis & { MAIN_WINDOW_WEBPACK_ENTRY: string }).MAIN_WINDOW_WEBPACK_ENTRY = 'file:///school/index.html';
  });

  it('sanitizes thrown failures and logs each failed request with its own correlation ID', async () => {
    const database = {
      listProfiles: () => { throw new Error('private path /Users/child and secret'); },
    };
    registerIpc(database as never);
    const frame = { url: 'file:///school/index.html' };
    const event = { sender: { id: 7, mainFrame: frame }, senderFrame: frame };
    const invoke = mocks.handlers.get('profiles:list');
    expect(invoke).toBeDefined();

    const first = await invoke!(event);
    const second = await invoke!(event);

    expect(first).toEqual({ ok: false, error: { code: 'InternalError', message: 'The request could not be completed.' } });
    expect(second).toEqual(first);
    expect(mocks.logged).toEqual([
      {
        level: 'error', event: 'ipc.failed', correlationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        err: { code: 'IPC_REQUEST_FAILED' },
        metadata: { stage: 'ipc.request', outcome: 'failure' },
      },
      {
        level: 'error', event: 'ipc.failed', correlationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        err: { code: 'IPC_REQUEST_FAILED' },
        metadata: { stage: 'ipc.request', outcome: 'failure' },
      },
    ]);
    expect(new Set(mocks.logged.map((record) => (record as { correlationId: string }).correlationId)).size).toBe(2);
    expect(JSON.stringify(mocks.logged)).not.toContain('private path');
    expect(JSON.stringify(mocks.logged)).not.toContain('secret');
  });
});
