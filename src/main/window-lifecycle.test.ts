import { describe, expect, it, vi } from 'vitest';
import { createEnsureMainWindow } from './window-lifecycle';

type TestWindow = { isDestroyed: () => boolean };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('main window startup coordination', () => {
  it('waits for database initialization and coalesces startup and activation requests', async () => {
    const databaseReady = deferred<boolean>();
    let currentWindow: TestWindow | undefined;
    const createdWindow: TestWindow = { isDestroyed: () => false };
    const createMainWindow = vi.fn(() => {
      currentWindow = createdWindow;
      return createdWindow;
    });
    const ensureMainWindow = createEnsureMainWindow({
      waitForDatabase: () => databaseReady.promise,
      getMainWindow: () => currentWindow,
      createMainWindow,
    });

    let firstFinished = false;
    const startupRequest = ensureMainWindow().then((window) => {
      firstFinished = true;
      return window;
    });
    const activationRequest = ensureMainWindow();
    await Promise.resolve();

    expect(firstFinished).toBe(false);
    expect(createMainWindow).not.toHaveBeenCalled();

    databaseReady.resolve(true);
    const [startupWindow, activationWindow] = await Promise.all([startupRequest, activationRequest]);

    expect(startupWindow).toBe(createdWindow);
    expect(activationWindow).toBe(createdWindow);
    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });

  it('reuses a live window and creates a replacement only after destruction', async () => {
    let currentWindow: TestWindow | undefined = { isDestroyed: () => false };
    const existingWindow = currentWindow;
    const createMainWindow = vi.fn(() => {
      currentWindow = { isDestroyed: () => false };
      return currentWindow;
    });
    const ensureMainWindow = createEnsureMainWindow({
      waitForDatabase: async () => true,
      getMainWindow: () => currentWindow,
      createMainWindow,
    });

    expect(await ensureMainWindow()).toBe(existingWindow);
    expect(createMainWindow).not.toHaveBeenCalled();

    const destroyedWindow: TestWindow = { isDestroyed: () => true };
    currentWindow = destroyedWindow;
    const replacementWindow = await ensureMainWindow();
    expect(replacementWindow).not.toBe(destroyedWindow);
    expect(replacementWindow?.isDestroyed()).toBe(false);
    expect(createMainWindow).toHaveBeenCalledTimes(1);
  });
});
