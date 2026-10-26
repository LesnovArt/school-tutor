import { describe, expect, it, vi } from 'vitest';
import { handleSquirrelStartup, parseSquirrelEvent, shortcutArgument } from './squirrel-startup';

describe('squirrel startup', () => {
  it('recognises Squirrel lifecycle flags only on Windows', () => {
    expect(parseSquirrelEvent('win32', ['School Tutor.exe', '--squirrel-install', '1.0.0'])).toBe('install');
    expect(parseSquirrelEvent('win32', ['School Tutor.exe', '--squirrel-obsolete'])).toBe('obsolete');
    expect(parseSquirrelEvent('darwin', ['School Tutor', '--squirrel-install'])).toBeUndefined();
    expect(parseSquirrelEvent('win32', ['School Tutor.exe'])).toBeUndefined();
    expect(parseSquirrelEvent('win32', ['School Tutor.exe', '--inspect'])).toBeUndefined();
  });

  it('creates and removes shortcuts for the packaged executable', () => {
    expect(shortcutArgument('install', 'School Tutor.exe')).toBe('--createShortcut=School Tutor.exe');
    expect(shortcutArgument('updated', 'School Tutor.exe')).toBe('--createShortcut=School Tutor.exe');
    expect(shortcutArgument('uninstall', 'School Tutor.exe')).toBe('--removeShortcut=School Tutor.exe');
    expect(shortcutArgument('obsolete', 'School Tutor.exe')).toBeUndefined();
  });

  it('does nothing for a normal launch', () => {
    const quit = vi.fn();
    expect(handleSquirrelStartup('win32', ['School Tutor.exe'], 'C:\\app\\School Tutor.exe', quit)).toBe(false);
    expect(quit).not.toHaveBeenCalled();
  });

  it('quits immediately for the obsolete event', () => {
    const quit = vi.fn();
    expect(handleSquirrelStartup('win32', ['School Tutor.exe', '--squirrel-obsolete'], 'C:\\app\\School Tutor.exe', quit)).toBe(true);
    expect(quit).toHaveBeenCalledOnce();
  });
});
