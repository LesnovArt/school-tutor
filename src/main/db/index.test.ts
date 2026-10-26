import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPath } = vi.hoisted(() => ({ mockGetPath: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: mockGetPath } }));

import {
  closeDatabase, createProfile, getActiveProfileId, getDatabase, listProfiles, openDatabase, setActiveProfileId,
  setExplanationLanguage, setUiLanguage,
} from './index';
import { createEnrollment, getActiveSpace, selectEnrollment } from './study';

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

describe('language roles', () => {
  const mila = { displayName: 'Mila', ageBand: '6-8', preferredLanguage: 'uk', learningPreferences: '' };

  it('changes the interface language without losing the selected school or its persisted choice', () => {
    expect(openDatabase().isOk()).toBe(true);
    const profile = createProfile(mila)._unsafeUnwrap();
    setActiveProfileId(profile.id)._unsafeUnwrap();
    const enroll = (schoolSystem: 'ua' | 'bg') => createEnrollment(getDatabase(), {
      profileId: profile.id, schoolSystem, academicYear: '2026-2027', grade: 2, homeworkLanguage: schoolSystem === 'ua' ? 'uk' : 'bg',
    })._unsafeUnwrap();
    enroll('ua');
    const bg = enroll('bg').enrollments.find((enrollment) => enrollment.schoolSystem === 'bg')!;
    selectEnrollment(getDatabase(), profile.id, { enrollmentId: bg.id })._unsafeUnwrap();

    for (const language of ['en', 'bg', 'uk'] as const) {
      expect(setUiLanguage(language).isOk()).toBe(true);
      expect(getActiveSpace(getDatabase(), profile.id)._unsafeUnwrap()!.selectedEnrollmentId).toBe(bg.id);
    }
    closeDatabase();
    expect(openDatabase().isOk()).toBe(true);
    expect(getActiveSpace(getDatabase(), profile.id)._unsafeUnwrap()!.selectedEnrollmentId).toBe(bg.id);
  });

  it('sets the explanation language per child, independent of interface and homework languages', () => {
    expect(openDatabase().isOk()).toBe(true);
    const first = createProfile(mila)._unsafeUnwrap();
    const second = createProfile({ ...mila, displayName: 'Ivan' })._unsafeUnwrap();
    setUiLanguage('en')._unsafeUnwrap();

    expect(setExplanationLanguage({ profileId: first.id, preferredLanguage: 'bg' })._unsafeUnwrap().preferredLanguage).toBe('bg');
    expect(listProfiles()._unsafeUnwrap().map((profile) => profile.preferredLanguage)).toEqual(['bg', 'uk']);
    expect(setExplanationLanguage({ profileId: second.id, preferredLanguage: 'fr' })._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(setExplanationLanguage({ profileId: '33333333-3333-4333-8333-333333333333', preferredLanguage: 'en' })._unsafeUnwrapErr().code).toBe('InvalidInput');
  });
});

