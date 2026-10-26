import { spawn } from 'node:child_process';
import path from 'node:path';

export type SquirrelEvent = 'install' | 'updated' | 'uninstall' | 'obsolete';

const EVENTS: Record<string, SquirrelEvent> = {
  '--squirrel-install': 'install',
  '--squirrel-updated': 'updated',
  '--squirrel-uninstall': 'uninstall',
  '--squirrel-obsolete': 'obsolete',
};

/** Squirrel.Windows launches the app with a single `--squirrel-*` flag during install, update, and uninstall. */
export function parseSquirrelEvent(platform: string, argv: readonly string[]): SquirrelEvent | undefined {
  if (platform !== 'win32') return undefined;
  const flag = argv[1];
  return flag === undefined ? undefined : EVENTS[flag];
}

/** Maps a Squirrel event to the Update.exe shortcut argument it requires, if any. */
export function shortcutArgument(event: SquirrelEvent, exeName: string): string | undefined {
  if (event === 'install' || event === 'updated') return `--createShortcut=${exeName}`;
  if (event === 'uninstall') return `--removeShortcut=${exeName}`;
  return undefined;
}

/**
 * Handles Squirrel lifecycle launches. Returns true when the process is only
 * serving the installer and must quit without starting the application.
 */
export function handleSquirrelStartup(
  platform: string,
  argv: readonly string[],
  execPath: string,
  quit: () => void,
): boolean {
  const event = parseSquirrelEvent(platform, argv);
  if (!event) return false;
  const argument = shortcutArgument(event, path.basename(execPath));
  if (!argument) {
    quit();
    return true;
  }
  const updateExe = path.resolve(path.dirname(execPath), '..', 'Update.exe');
  try {
    const child = spawn(updateExe, [argument], { detached: true, stdio: 'ignore' });
    child.once('error', quit);
    child.once('close', quit);
    child.unref();
  } catch {
    quit();
  }
  return true;
}
