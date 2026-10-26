import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Profile, UiLanguage } from '../../contracts/profile';
import type { StudySpace } from '../../contracts/study';
import type { ParentConsoleState } from '../hooks/useParentConsole';
import { visibleSpace } from '../hooks/useStudySpace';
import { languageNames, messages, supportedLanguages } from '../localization/messages';
import { ChildHomePage } from './ChildHomePage';
import { ParentPage } from './ParentPage';

const id = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const profile: Profile = { id: id(1), displayName: 'Mila', ageBand: '6-8', preferredLanguage: 'bg', learningPreferences: '', createdAt: '2026-01-01T00:00:00.000Z' };
const enrollment = (n: number, schoolSystem: 'ua' | 'bg', grade: number) => ({
  id: id(n), profileId: profile.id, schoolSystem, academicYear: '2026-2027', grade, homeworkLanguage: schoolSystem === 'ua' ? 'uk' as const : 'bg' as const, createdAt: '2026-01-01T00:00:00.000Z',
});
const space: StudySpace = {
  profileId: profile.id, selectedEnrollmentId: id(2),
  enrollments: [enrollment(2, 'ua', 2), enrollment(3, 'bg', 3)],
  lessons: [
    { id: id(4), enrollmentId: id(2), position: 1, title: 'Додавання до 20', schoolLanguage: 'uk', topicNotes: 'Перехід через десяток', prerequisiteNotes: '', isCurrent: true, relatedLesson: { id: id(5), title: 'Събиране до 20', schoolSystem: 'bg' } },
    { id: id(5), enrollmentId: id(3), position: 1, title: 'Събиране до 20', schoolLanguage: 'bg', topicNotes: '', prerequisiteNotes: '', isCurrent: false, relatedLesson: null },
  ],
};
const noop = () => undefined;
const asyncNoop = async () => undefined;

function child(language: UiLanguage, current: StudySpace | null = space) {
  return renderToStaticMarkup(createElement(ChildHomePage, {
    text: messages[language], profiles: [profile], hasProfiles: true, profileSummary: '1 / 2', selectedProfile: profile, selectedId: profile.id,
    profileMutationPending: false, space: current, language, languages: supportedLanguages, languageNames, error: '',
    onLanguageChange: noop, onProfileSelect: noop, onSelectEnrollment: noop, onOpenParent: noop,
  }));
}

const form = {
  name: '', setName: noop, ageBand: '6-8' as const, setAgeBand: noop, preferredLanguage: 'uk' as const, setPreferredLanguage: noop,
  preferences: '', setPreferences: noop, saving: false, submit: noop, ageValues: ['6-8', '9-11', '12-14', '15+'] as const,
};
const state = {
  profileId: profile.id, schoolId: id(2), space, pending: false, chooseProfile: noop, chooseSchool: noop,
  createEnrollment: async () => true, updateEnrollment: async () => true, createLesson: async () => true, updateLesson: async () => true,
  moveLesson: async () => true, setCurrentLesson: async () => true, deleteLesson: async () => true,
} satisfies ParentConsoleState;

function parent(language: UiLanguage, status: { pinSet: boolean; unlocked: boolean } | null, notice: Parameters<typeof ParentPage>[0]['notice'] = null) {
  return renderToStaticMarkup(createElement(ParentPage, {
    text: messages[language], status, notice, accessPending: false, profiles: [profile], canCreateProfile: true, profileMutationPending: false,
    form, state, language, languages: supportedLanguages, languageNames, error: '', onLanguageChange: noop,
    onSetupPin: asyncNoop, onUnlock: asyncNoop, onLock: noop, onExplanationLanguage: noop, onClose: noop,
  }));
}

describe.each(supportedLanguages)('pages in %s', (language) => {
  const text = messages[language];

  it('shows the child their own school spaces, grade, current lesson, and related link', () => {
    const html = child(language);
    expect(html).toContain(`${text.schoolNames.ua} · ${text.grade} 2 · 2026-2027`);
    expect(html).toContain(`${text.schoolNames.bg} · ${text.grade} 3 · 2026-2027`);
    expect(html).toContain('Додавання до 20');
    expect(html).toContain(`>${text.currentLesson}<`);
    expect(html).toContain(`${text.relatedLesson}: ${text.schoolNames.bg} · Събиране до 20`);
    expect(html).not.toContain('Събиране до 20</strong>');
    expect(html).toContain(`${text.explanationRole}: ${languageNames.bg} · ${text.homeworkRole}: ${languageNames.uk}`);
  });

  it('explains missing schools and a missing space without crashing', () => {
    expect(child(language, { ...space, enrollments: [], lessons: [], selectedEnrollmentId: null })).toContain(text.noSchools);
    expect(child(language, null)).toContain(text.schoolSpace);
  });

  it('gates parent settings: loading, PIN setup, PIN unlock, then the console', () => {
    expect(parent(language, null)).toContain(text.loading);
    const setup = parent(language, { pinSet: false, unlocked: false });
    expect(setup).toContain(text.pinSetupTitle);
    expect(setup).toContain(text.pinConfirm);
    expect(setup).not.toContain(text.addLesson);
    const unlock = parent(language, { pinSet: true, unlocked: false }, { kind: 'throttled', seconds: 30 });
    expect(unlock).toContain(text.pinUnlockTitle);
    expect(unlock).toContain(text.pinThrottled.replace('{seconds}', '30'));
    expect(unlock).not.toContain(text.addLesson);
    const console = parent(language, { pinSet: true, unlocked: true });
    expect(console).toContain(text.addLesson);
    expect(console).toContain(text.lockParent);
    expect(console).toContain(text.makeCurrent);
  });

  it('keeps the {seconds} placeholder in every translation', () => {
    expect(text.pinThrottled).toContain('{seconds}');
  });
});

describe('stale study space guard', () => {
  it('never shows a space loaded for a previously selected child', () => {
    expect(visibleSpace(space, profile.id)).toBe(space);
    expect(visibleSpace(space, id(9))).toBeNull();
    expect(visibleSpace(space, '')).toBeNull();
    expect(visibleSpace(null, profile.id)).toBeNull();
  });
});
