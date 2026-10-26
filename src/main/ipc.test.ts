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

describe('parent authorization and child scope', () => {
  const frame = { url: 'file:///school/index.html' };
  const event = { sender: { id: 7, mainFrame: frame }, senderFrame: frame };
  const unauthorized = { ok: false, error: { code: 'UnauthorizedAction', message: 'Unlock parent settings first.' } };
  let db: Database.Database;
  let activeProfileId: string | null;
  const call = (channel: string, input?: unknown) => mocks.handlers.get(channel)!(event, input) as Promise<{ ok: boolean; value?: any; error?: { code: string } }>;

  beforeEach(() => {
    mocks.handlers.clear();
    (globalThis as typeof globalThis & { MAIN_WINDOW_WEBPACK_ENTRY: string }).MAIN_WINDOW_WEBPACK_ENTRY = 'file:///school/index.html';
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    for (const [id, name] of [['11111111-1111-4111-8111-111111111111', 'Mila'], ['22222222-2222-4222-8222-222222222222', 'Ivan']]) {
      db.prepare(`INSERT INTO profiles (id, display_name, age_band, preferred_language, learning_preferences, created_at)
        VALUES (?, ?, '6-8', 'uk', '', 'x')`).run(id, name);
    }
    activeProfileId = '11111111-1111-4111-8111-111111111111';
    registerIpc({
      ...realDatabase,
      getDatabase: () => db,
      getActiveProfileId: () => ok(activeProfileId),
    } as never);
  });
  afterEach(() => db.close());

  const mutations: [string, unknown][] = [
    ['profiles:create', { displayName: 'New', ageBand: '6-8', preferredLanguage: 'uk' }],
    ['profiles:set-explanation-language', { profileId: '11111111-1111-4111-8111-111111111111', preferredLanguage: 'bg' }],
    ['study:get-parent-space', { profileId: '11111111-1111-4111-8111-111111111111' }],
    ['study:create-enrollment', { profileId: '11111111-1111-4111-8111-111111111111', schoolSystem: 'ua', academicYear: '2026-2027', grade: 2, homeworkLanguage: 'uk' }],
    ['study:update-enrollment', {}],
    ['study:create-lesson', {}],
    ['study:update-lesson', {}],
    ['study:move-lesson', {}],
    ['study:set-current-lesson', {}],
    ['study:delete-lesson', {}],
  ];

  it.each(mutations)('rejects %s while parent settings are locked, before touching data', async (channel, input) => {
    expect(await call(channel, input)).toEqual(unauthorized);
    expect(db.prepare('SELECT COUNT(*) AS n FROM enrollments').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM profiles').get()).toEqual({ n: 2 });
  });

  it('allows the same mutations after the PIN is set, and blocks them again after locking', async () => {
    const enrollment = mutations[3]!;
    expect((await call('parent:status')).value).toEqual({ pinSet: false, unlocked: false });
    expect((await call('parent:setup-pin', { pin: '2468' })).value).toEqual({ pinSet: true, unlocked: true });
    const created = await call(enrollment[0], enrollment[1]);
    expect(created.ok).toBe(true);
    expect(created.value.enrollments).toHaveLength(1);

    expect((await call('parent:lock')).value.unlocked).toBe(false);
    expect(await call(enrollment[0], enrollment[1])).toEqual(unauthorized);
    expect((await call('parent:unlock', { pin: '0000' })).value.outcome).toBe('incorrect');
    expect(await call(enrollment[0], enrollment[1])).toEqual(unauthorized);
    expect((await call('parent:unlock', { pin: '2468' })).value.outcome).toBe('unlocked');
    expect((await call('study:get-parent-space', { profileId: '22222222-2222-4222-8222-222222222222' })).ok).toBe(true);
  });

  it('serves children only their own space and ignores renderer-supplied profile IDs', async () => {
    await call('parent:setup-pin', { pin: '2468' });
    const ivanEnrollment = (await call('study:create-enrollment', {
      profileId: '22222222-2222-4222-8222-222222222222', schoolSystem: 'ua', academicYear: '2026-2027', grade: 6, homeworkLanguage: 'uk',
    })).value.enrollments[0];
    await call('parent:lock');

    const space = await call('study:get-space', { profileId: '22222222-2222-4222-8222-222222222222' });
    expect(space.value.profileId).toBe('11111111-1111-4111-8111-111111111111');
    expect(space.value.enrollments).toEqual([]);

    const forged = await call('study:select-enrollment', { enrollmentId: ivanEnrollment.id, profileId: '22222222-2222-4222-8222-222222222222' });
    expect(forged.error?.code).toBe('UnauthorizedAction');
    activeProfileId = '22222222-2222-4222-8222-222222222222';
    expect((await call('study:select-enrollment', { enrollmentId: ivanEnrollment.id })).ok).toBe(true);
  });

  it('rejects untrusted senders for parent operations', async () => {
    const other = { url: 'https://example.com/' };
    const result = await mocks.handlers.get('parent:setup-pin')!({ sender: { id: 7, mainFrame: other }, senderFrame: other }, { pin: '2468' });
    expect(result).toEqual({ ok: false, error: { code: 'UnauthorizedAction', message: 'This request is not allowed.' } });
    expect((await call('parent:status')).value.pinSet).toBe(false);
  });
});
