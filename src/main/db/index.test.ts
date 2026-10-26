import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPath } = vi.hoisted(() => ({ mockGetPath: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: mockGetPath } }));

import { closeDatabase, createProfile, getActiveProfileId, listProfiles, openDatabase, setActiveProfileId } from './index';

let dataPath = '';

beforeEach(() => {
  dataPath = mkdtempSync(path.join(tmpdir(), 'school-tutor-test-'));
  mockGetPath.mockReturnValue(dataPath);
});

afterEach(() => {
  closeDatabase();
  rmSync(dataPath, { recursive: true, force: true });
});

describe('local profile persistence', () => {
  it('migrates, creates, selects, and reloads a profile after reopening SQLite', () => {
    expect(openDatabase().isOk()).toBe(true);
    const created = createProfile({
      displayName: 'Mila', ageBand: '9-11', preferredLanguage: 'bg', learningPreferences: 'Short examples',
    });
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;

    expect(setActiveProfileId(created.value.id).isOk()).toBe(true);
    closeDatabase();
    expect(openDatabase().isOk()).toBe(true);

    expect(listProfiles()._unsafeUnwrap()).toEqual([created.value]);
    expect(getActiveProfileId()._unsafeUnwrap()).toBe(created.value.id);
  });

  it('rejects malformed input and does not create a third profile', () => {
    expect(openDatabase().isOk()).toBe(true);
    expect(createProfile({ displayName: '', ageBand: '9-11', preferredLanguage: 'uk' }).isErr()).toBe(true);
    expect(createProfile({ displayName: 'A', ageBand: '6-8', preferredLanguage: 'uk' }).isOk()).toBe(true);
    expect(createProfile({ displayName: 'B', ageBand: '9-11', preferredLanguage: 'bg' }).isOk()).toBe(true);
    expect(createProfile({ displayName: 'C', ageBand: '12-14', preferredLanguage: 'en' }).isErr()).toBe(true);
  });
});
