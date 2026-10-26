import type Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { err, ok, type Result } from 'neverthrow';
import type { ApiError } from '../contracts/api';
import { pinInputSchema, type ParentStatus, type UnlockResult } from '../contracts/parent';

const PIN_SETTING = 'parent_pin';
const KEY_LENGTH = 32;

export const IDLE_LOCK_MS = 5 * 60_000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(pin, salt, KEY_LENGTH).toString('hex')}`;
}

function verifyPin(pin: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pin, Buffer.from(salt, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Parent PIN state for this process. The PIN is a household UI safeguard: it keeps a child from
 * using parent controls in the app, not from editing files under the same OS account. The unlocked
 * state lives only in main-process memory, so a restart or idle timeout locks again.
 */
export function createParentAuth(options: { getDatabase: () => Database.Database; now?: () => number }) {
  const now = options.now ?? Date.now;
  let unlockedUntil = 0;
  let failedAttempts = 0;
  let lockedOutUntil = 0;

  const persistence = (): ApiError => ({ code: 'PersistenceFailure', message: 'Could not read parent settings.' });
  const readStoredPin = (): string | undefined =>
    (options.getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').get(PIN_SETTING) as { value: string } | undefined)?.value;

  function getStatus(): Result<ParentStatus, ApiError> {
    try {
      return ok({ pinSet: readStoredPin() !== undefined, unlocked: now() < unlockedUntil });
    } catch {
      return err(persistence());
    }
  }

  function setupPin(input: unknown): Result<ParentStatus, ApiError> {
    const parsed = pinInputSchema.safeParse(input);
    if (!parsed.success) return err({ code: 'InvalidInput', message: 'Use a PIN of 4 to 8 digits.' });
    try {
      const inserted = options.getDatabase()
        .prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(PIN_SETTING, hashPin(parsed.data.pin));
      if (inserted.changes === 0) return err({ code: 'UnauthorizedAction', message: 'A parent PIN is already set.' });
      unlockedUntil = now() + IDLE_LOCK_MS;
      return ok({ pinSet: true, unlocked: true });
    } catch {
      return err(persistence());
    }
  }

  function unlock(input: unknown): Result<UnlockResult, ApiError> {
    const parsed = pinInputSchema.safeParse(input);
    if (!parsed.success) return err({ code: 'InvalidInput', message: 'Use a PIN of 4 to 8 digits.' });
    if (now() < lockedOutUntil) {
      return ok({ outcome: 'throttled', retryAfterSeconds: Math.ceil((lockedOutUntil - now()) / 1000) });
    }
    try {
      const stored = readStoredPin();
      if (!stored) return err({ code: 'UnauthorizedAction', message: 'Set a parent PIN first.' });
      if (verifyPin(parsed.data.pin, stored)) {
        failedAttempts = 0;
        unlockedUntil = now() + IDLE_LOCK_MS;
        return ok({ outcome: 'unlocked', retryAfterSeconds: 0 });
      }
      failedAttempts += 1;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        failedAttempts = 0;
        lockedOutUntil = now() + LOCKOUT_MS;
        return ok({ outcome: 'throttled', retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) });
      }
      return ok({ outcome: 'incorrect', retryAfterSeconds: 0 });
    } catch {
      return err(persistence());
    }
  }

  function lock(): Result<ParentStatus, ApiError> {
    unlockedUntil = 0;
    return getStatus();
  }

  /** Checks authorization for an administrative request and extends the idle window when allowed. */
  function authorize(): boolean {
    if (now() >= unlockedUntil) return false;
    unlockedUntil = now() + IDLE_LOCK_MS;
    return true;
  }

  return { getStatus, setupPin, unlock, lock, authorize };
}

export type ParentAuth = ReturnType<typeof createParentAuth>;
