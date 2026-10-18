import { describe, expect, it } from 'vitest';
import { createProfileInputSchema, profileSchema, uiLanguageSchema } from './profile';

const validProfile = {
  id: 'd2719e09-7614-4d1f-9359-10baf2a466fd',
  displayName: 'Mila',
  ageBand: '9-11',
  preferredLanguage: 'bg',
  learningPreferences: '',
  createdAt: '2026-10-18T10:00:00.000Z',
};

describe('profile contracts', () => {
  it('accepts a bounded, explicit profile without inferring age from grade', () => {
    expect(profileSchema.parse(validProfile)).toEqual(validProfile);
  });

  it('rejects empty names, oversized preference text, and unsupported languages', () => {
    expect(createProfileInputSchema.safeParse({ displayName: ' ', ageBand: '9-11', preferredLanguage: 'uk' }).success).toBe(false);
    expect(createProfileInputSchema.safeParse({ displayName: 'Mila', ageBand: '9-11', preferredLanguage: 'uk', learningPreferences: 'x'.repeat(241) }).success).toBe(false);
    expect(uiLanguageSchema.safeParse('ru').success).toBe(false);
  });
});
