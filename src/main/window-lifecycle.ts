export function createEnsureMainWindow<TWindow extends { isDestroyed(): boolean }>(options: {
  waitForDatabase: () => Promise<boolean>;
  getMainWindow: () => TWindow | undefined;
  createMainWindow: () => TWindow;
}): () => Promise<TWindow | undefined> {
  let creation: Promise<TWindow | undefined> | undefined;

  return async function ensureMainWindow(): Promise<TWindow | undefined> {
    if (!await options.waitForDatabase()) return undefined;

    const existingWindow = options.getMainWindow();
    if (existingWindow && !existingWindow.isDestroyed()) return existingWindow;
    if (creation) return creation;

    creation = Promise.resolve().then(() => {
      const window = options.getMainWindow();
      if (window && !window.isDestroyed()) return window;
      return options.createMainWindow();
    }).finally(() => {
      creation = undefined;
    });
    return creation;
  };
}
