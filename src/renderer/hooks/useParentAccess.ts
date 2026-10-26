import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ParentStatus } from '../../contracts/parent';
import { parentApi } from '../api/parent';
import type { AppErrorKey } from './useAppStartup';

export type PinNotice = { kind: 'incorrect' } | { kind: 'throttled'; seconds: number } | null;

export function useParentAccess(setErrorKey: Dispatch<SetStateAction<AppErrorKey | null>>) {
  const [status, setStatus] = useState<ParentStatus | null>(null);
  const [notice, setNotice] = useState<PinNotice>(null);
  const [pending, setPending] = useState(false);

  async function refresh(): Promise<void> {
    try {
      const result = await parentApi.getStatus();
      if (result.ok) setStatus(result.value);
      else setErrorKey('actionError');
    } catch {
      setErrorKey('actionError');
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function attempt(operation: () => Promise<void>): Promise<void> {
    if (pending) return;
    setPending(true);
    setNotice(null);
    setErrorKey(null);
    try {
      await operation();
    } catch {
      setErrorKey('actionError');
    } finally {
      setPending(false);
    }
  }

  const setupPin = (pin: string) => attempt(async () => {
    const result = await parentApi.setupPin(pin);
    if (result.ok) setStatus(result.value);
    else setErrorKey(result.error.code === 'InvalidInput' ? 'invalidError' : 'actionError');
  });

  const unlock = (pin: string) => attempt(async () => {
    const result = await parentApi.unlock(pin);
    if (!result.ok) {
      setErrorKey(result.error.code === 'InvalidInput' ? 'invalidError' : 'actionError');
    } else if (result.value.outcome === 'unlocked') {
      setStatus({ pinSet: true, unlocked: true });
    } else if (result.value.outcome === 'throttled') {
      setNotice({ kind: 'throttled', seconds: result.value.retryAfterSeconds });
    } else {
      setNotice({ kind: 'incorrect' });
    }
  });

  const lock = () => attempt(async () => {
    const result = await parentApi.lock();
    if (result.ok) setStatus(result.value);
    else setErrorKey('actionError');
  });

  /** Called when the main process reports a parent action as unauthorized, e.g. after the idle timeout. */
  const markLocked = () => setStatus((current) => (current ? { ...current, unlocked: false } : current));

  return { status, notice, pending, refresh, setupPin, unlock, lock, markLocked };
}
