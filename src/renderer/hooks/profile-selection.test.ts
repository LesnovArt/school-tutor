import { describe, expect, it } from 'vitest';
import type { Profile } from '../../contracts/profile';
import { resolveSelectedProfileId } from './profile-selection';

const profiles: Profile[] = [
  {
    id: '8a78bf2b-5bb2-4ef8-8f52-2ddc9842e553',
    displayName: 'Mila',
    ageBand: '9-11',
    preferredLanguage: 'uk',
    learningPreferences: '',
    createdAt: '2026-10-18T12:00:00.000Z',
  },
];

describe('resolveSelectedProfileId', () => {
  it('returns no selection when the saved profile ID is missing or stale', () => {
    expect(resolveSelectedProfileId(profiles, null)).toBe('');
    expect(resolveSelectedProfileId(profiles, 'f44d74c5-e614-4db0-9f92-f2e644a942fe')).toBe('');
  });

  it('returns the saved ID only when it belongs to a listed profile', () => {
    expect(resolveSelectedProfileId(profiles, profiles[0]!.id)).toBe(profiles[0]!.id);
  });
});
