import Database from 'better-sqlite3';
import { ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { runMigrations } from './db/migrations';
import * as realDatabase from './db';

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

describe('parent authorization', () => {
  const frame = { url: 'file:///school/index.html' };
  const event = { sender: { id: 7, mainFrame: frame }, senderFrame: frame };
  const unauthorized = { ok: false, error: { code: 'UnauthorizedAction', message: 'Unlock parent settings first.' } };
  const profileId = '11111111-1111-4111-8111-111111111111';
  const createProfile = vi.fn(() => ok({ id: profileId }));
  const setExplanationLanguage = vi.fn(() => ok({ id: profileId }));
  let db: Database.Database;
  const call = (channel: string, input?: unknown) => mocks.handlers.get(channel)!(event, input) as Promise<{ ok: boolean; value?: any; error?: { code: string } }>;

  beforeEach(() => {
    mocks.handlers.clear();
    createProfile.mockClear();
    setExplanationLanguage.mockClear();
    (globalThis as typeof globalThis & { MAIN_WINDOW_WEBPACK_ENTRY: string }).MAIN_WINDOW_WEBPACK_ENTRY = 'file:///school/index.html';
    db = new Database(':memory:');
    runMigrations(db);
    registerIpc({ ...realDatabase, getDatabase: () => db, createProfile, setExplanationLanguage } as never);
  });
  afterEach(() => db.close());

  const mutations = [
    ['profiles:create', createProfile],
    ['profiles:set-explanation-language', setExplanationLanguage],
  ] as const;

  it.each(mutations)('rejects %s while parent settings are locked, before reaching the data layer', async (channel, operation) => {
    expect(await call(channel, { profileId })).toEqual(unauthorized);
    expect(operation).not.toHaveBeenCalled();
  });

  it('allows the same mutations after the PIN is set, and blocks them again after locking', async () => {
    expect((await call('parent:status')).value).toEqual({ pinSet: false, unlocked: false });
    expect((await call('parent:setup-pin', { pin: '2468' })).value).toEqual({ pinSet: true, unlocked: true });
    expect((await call('profiles:create', { x: 1 })).ok).toBe(true);
    expect(createProfile).toHaveBeenCalledWith({ x: 1 });

    expect((await call('parent:lock')).value.unlocked).toBe(false);
    expect(await call('profiles:create', {})).toEqual(unauthorized);
    expect((await call('parent:unlock', { pin: '0000' })).value.outcome).toBe('incorrect');
    expect(await call('profiles:set-explanation-language', {})).toEqual(unauthorized);
    expect((await call('parent:unlock', { pin: '2468' })).value.outcome).toBe('unlocked');
    expect((await call('profiles:set-explanation-language', { profileId })).ok).toBe(true);
    expect(createProfile).toHaveBeenCalledTimes(1);
    expect(setExplanationLanguage).toHaveBeenCalledTimes(1);
  });

  it('rejects untrusted senders for parent operations', async () => {
    const other = { url: 'https://example.com/' };
    const result = await mocks.handlers.get('parent:setup-pin')!({ sender: { id: 7, mainFrame: other }, senderFrame: other }, { pin: '2468' });
    expect(result).toEqual({ ok: false, error: { code: 'UnauthorizedAction', message: 'This request is not allowed.' } });
    expect((await call('parent:status')).value.pinSet).toBe(false);
  });
});
