import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from './db/migrations';
import { createParentAuth, IDLE_LOCK_MS, LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from './parent-auth';

let db: Database.Database;
let clock = 0;
const auth = () => createParentAuth({ getDatabase: () => db, now: () => clock });

beforeEach(() => {
  db = new Database(':memory:');
  runMigrations(db);
  clock = 1_000_000;
});
afterEach(() => db.close());

describe('parent PIN', () => {
  it('starts without a PIN, sets one once, and stores only a salted hash', () => {
    const parent = auth();
    expect(parent.getStatus()._unsafeUnwrap()).toEqual({ pinSet: false, unlocked: false });
    expect(parent.setupPin({ pin: '2468' })._unsafeUnwrap()).toEqual({ pinSet: true, unlocked: true });
    expect(parent.setupPin({ pin: '1357' })._unsafeUnwrapErr().code).toBe('UnauthorizedAction');
    const stored = (db.prepare("SELECT value FROM app_settings WHERE key = 'parent_pin'").get() as { value: string }).value;
    expect(stored).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    expect(stored).not.toContain('2468');
  });

  it('rejects malformed PINs', () => {
    const parent = auth();
    for (const pin of ['123', '123456789', 'abcd', '12 34', 1234]) {
      expect(parent.setupPin({ pin })._unsafeUnwrapErr().code).toBe('InvalidInput');
    }
    expect(parent.getStatus()._unsafeUnwrap().pinSet).toBe(false);
    expect(parent.unlock({})._unsafeUnwrapErr().code).toBe('InvalidInput');
  });

  it('unlocks with the right PIN only, and keeps the PIN across a new process', () => {
    auth().setupPin({ pin: '2468' });
    const restarted = auth();
    expect(restarted.getStatus()._unsafeUnwrap()).toEqual({ pinSet: true, unlocked: false });
    expect(restarted.unlock({ pin: '0000' })._unsafeUnwrap().outcome).toBe('incorrect');
    expect(restarted.authorize()).toBe(false);
    expect(restarted.unlock({ pin: '2468' })._unsafeUnwrap().outcome).toBe('unlocked');
    expect(restarted.authorize()).toBe(true);
  });

  it('cannot unlock before a PIN exists', () => {
    expect(auth().unlock({ pin: '2468' })._unsafeUnwrapErr().code).toBe('UnauthorizedAction');
  });

  it('locks explicitly and after the idle timeout, which activity extends', () => {
    const parent = auth();
    parent.setupPin({ pin: '2468' });
    clock += IDLE_LOCK_MS - 1;
    expect(parent.authorize()).toBe(true);
    clock += IDLE_LOCK_MS - 1;
    expect(parent.authorize()).toBe(true);
    clock += IDLE_LOCK_MS;
    expect(parent.authorize()).toBe(false);
    parent.unlock({ pin: '2468' });
    expect(parent.lock()._unsafeUnwrap().unlocked).toBe(false);
    expect(parent.authorize()).toBe(false);
  });

  it('throttles repeated wrong PINs, even for the right PIN, until the lockout ends', () => {
    const parent = auth();
    parent.setupPin({ pin: '2468' });
    parent.lock();
    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      expect(parent.unlock({ pin: '0000' })._unsafeUnwrap().outcome).toBe('incorrect');
    }
    expect(parent.unlock({ pin: '0000' })._unsafeUnwrap()).toEqual({ outcome: 'throttled', retryAfterSeconds: LOCKOUT_MS / 1000 });
    expect(parent.unlock({ pin: '2468' })._unsafeUnwrap().outcome).toBe('throttled');
    expect(parent.authorize()).toBe(false);
    clock += LOCKOUT_MS;
    expect(parent.unlock({ pin: '2468' })._unsafeUnwrap().outcome).toBe('unlocked');
  });
});
