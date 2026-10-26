import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StudySpace } from '../../contracts/study';
import { migrations, runMigrations } from './migrations';
import {
  createEnrollment, createLesson, deleteLesson, getActiveSpace, getParentSpace, MAX_LESSONS_PER_ENROLLMENT,
  moveLesson, selectEnrollment, setCurrentLesson, updateEnrollment, updateLesson,
} from './study';

let db: Database.Database;
let mila: string;
let ivan: string;

function addProfile(name: string): string {
  const id = randomUUID();
  db.prepare(`INSERT INTO profiles (id, display_name, age_band, preferred_language, learning_preferences, created_at)
    VALUES (?, ?, '6-8', 'uk', '', ?)`).run(id, name, new Date().toISOString());
  return id;
}

const enroll = (profileId: string, schoolSystem: 'ua' | 'bg', grade: number, homeworkLanguage: 'uk' | 'bg' = schoolSystem === 'ua' ? 'uk' : 'bg', academicYear = '2026-2027'): StudySpace =>
  createEnrollment(db, { profileId, schoolSystem, academicYear, grade, homeworkLanguage })._unsafeUnwrap();
const school = (space: StudySpace, schoolSystem: 'ua' | 'bg'): string => space.enrollments.find((e) => e.schoolSystem === schoolSystem)!.id;
const lesson = (enrollmentId: string, title: string): StudySpace =>
  createLesson(db, { enrollmentId, title, schoolLanguage: 'uk' })._unsafeUnwrap();
const titles = (space: StudySpace, enrollmentId: string): string[] =>
  space.lessons.filter((candidate) => candidate.enrollmentId === enrollmentId).map((candidate) => candidate.title);

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  mila = addProfile('Mila');
  ivan = addProfile('Ivan');
});
afterEach(() => db.close());

describe('enrollments', () => {
  it('keeps four enrollments with different grades per school, isolated between children', () => {
    enroll(mila, 'ua', 2);
    const milaSpace = enroll(mila, 'bg', 3);
    enroll(ivan, 'ua', 6);
    const ivanSpace = enroll(ivan, 'bg', 7);

    expect(milaSpace.enrollments.map((e) => [e.schoolSystem, e.grade])).toEqual([['ua', 2], ['bg', 3]]);
    expect(ivanSpace.enrollments.map((e) => [e.schoolSystem, e.grade])).toEqual([['ua', 6], ['bg', 7]]);
    expect(ivanSpace.enrollments.every((e) => e.profileId === ivan)).toBe(true);
    expect(getParentSpace(db, { profileId: mila })._unsafeUnwrap().enrollments).toHaveLength(2);
  });

  it('rejects duplicates, malformed years, and unknown children', () => {
    enroll(mila, 'ua', 2);
    const invalid = (input: object) => createEnrollment(db, input)._unsafeUnwrapErr().code;
    const base = { profileId: mila, schoolSystem: 'ua', academicYear: '2026-2027', grade: 2, homeworkLanguage: 'uk' };
    expect(invalid(base)).toBe('InvalidInput');
    expect(invalid({ ...base, academicYear: '2026-2028' })).toBe('InvalidInput');
    expect(invalid({ ...base, academicYear: '2027-2028', grade: 13 })).toBe('InvalidInput');
    expect(invalid({ ...base, academicYear: '2027-2028', profileId: randomUUID() })).toBe('InvalidInput');
  });

  it('updates grade, year, and homework language without changing the school system', () => {
    const space = enroll(mila, 'bg', 2, 'bg');
    const id = space.enrollments[0]!.id;
    const updated = updateEnrollment(db, { enrollmentId: id, academicYear: '2027-2028', grade: 3, homeworkLanguage: 'uk' })._unsafeUnwrap();
    expect(updated.enrollments[0]).toMatchObject({ schoolSystem: 'bg', academicYear: '2027-2028', grade: 3, homeworkLanguage: 'uk' });
  });
});

describe('child-scoped access', () => {
  it('returns only the active child space and persists their selected school', () => {
    const milaUa = enroll(mila, 'ua', 2).enrollments[0]!;
    const milaBg = enroll(mila, 'bg', 3).enrollments.find((e) => e.schoolSystem === 'bg')!;
    enroll(ivan, 'ua', 6);

    expect(getActiveSpace(db, null)._unsafeUnwrap()).toBeNull();
    const initial = getActiveSpace(db, mila)._unsafeUnwrap()!;
    expect(initial.selectedEnrollmentId).toBe(milaUa.id);
    expect(initial.enrollments.map((e) => e.profileId)).toEqual([mila, mila]);

    expect(selectEnrollment(db, mila, { enrollmentId: milaBg.id })._unsafeUnwrap().selectedEnrollmentId).toBe(milaBg.id);
    expect(getActiveSpace(db, mila)._unsafeUnwrap()!.selectedEnrollmentId).toBe(milaBg.id);
  });

  it("refuses to select another child's school space", () => {
    const ivanEnrollment = enroll(ivan, 'ua', 6).enrollments[0]!;
    enroll(mila, 'ua', 2);
    const result = selectEnrollment(db, mila, { enrollmentId: ivanEnrollment.id });
    expect(result._unsafeUnwrapErr().code).toBe('UnauthorizedAction');
    expect(getActiveSpace(db, ivan)._unsafeUnwrap()!.selectedEnrollmentId).toBe(ivanEnrollment.id);
  });

  it('rejects selection without an active child or with malformed input', () => {
    const id = enroll(mila, 'ua', 2).enrollments[0]!.id;
    expect(selectEnrollment(db, null, { enrollmentId: id })._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(selectEnrollment(db, mila, { enrollmentId: 'x' })._unsafeUnwrapErr().code).toBe('InvalidInput');
  });
});

describe('ordered lessons', () => {
  let enrollmentId: string;
  beforeEach(() => { enrollmentId = school(enroll(mila, 'ua', 2), 'ua'); });

  it('appends, reorders, and renumbers lessons', () => {
    lesson(enrollmentId, 'A'); lesson(enrollmentId, 'B');
    let space = lesson(enrollmentId, 'C');
    const idOf = (title: string) => space.lessons.find((l) => l.title === title)!.id;

    space = moveLesson(db, { lessonId: idOf('C'), direction: 'up' })._unsafeUnwrap();
    expect(titles(space, enrollmentId)).toEqual(['A', 'C', 'B']);
    space = moveLesson(db, { lessonId: idOf('A'), direction: 'up' })._unsafeUnwrap();
    expect(titles(space, enrollmentId)).toEqual(['A', 'C', 'B']);
    space = deleteLesson(db, { lessonId: idOf('A') })._unsafeUnwrap();
    expect(space.lessons.map((l) => [l.title, l.position])).toEqual([['C', 1], ['B', 2]]);
  });

  it('keeps one current lesson per school and the choice after reopening data', () => {
    const other = school(enroll(mila, 'bg', 3), 'bg');
    lesson(enrollmentId, 'A');
    const space = lesson(enrollmentId, 'B');
    lesson(other, 'Other');
    const [a, b] = space.lessons.filter((l) => l.enrollmentId === enrollmentId);

    setCurrentLesson(db, { lessonId: a!.id })._unsafeUnwrap();
    const afterSecond = setCurrentLesson(db, { lessonId: b!.id })._unsafeUnwrap();
    expect(afterSecond.lessons.filter((l) => l.isCurrent).map((l) => l.title)).toEqual(['B']);

    const otherLesson = afterSecond.lessons.find((l) => l.title === 'Other')!;
    const withBoth = setCurrentLesson(db, { lessonId: otherLesson.id })._unsafeUnwrap();
    expect(withBoth.lessons.filter((l) => l.isCurrent).map((l) => l.title).sort()).toEqual(['B', 'Other']);
    expect(getActiveSpace(db, mila)._unsafeUnwrap()!.lessons.filter((l) => l.isCurrent)).toHaveLength(2);
  });

  it('links related lessons only across school spaces of the same child', () => {
    const bgId = school(enroll(mila, 'bg', 3), 'bg');
    const ivanId = enroll(ivan, 'ua', 6).enrollments[0]!.id;
    lesson(enrollmentId, 'Fractions UA'); lesson(enrollmentId, 'Sibling UA');
    const space = lesson(bgId, 'Fractions BG');
    const ivanLesson = lesson(ivanId, 'Ivan lesson').lessons[0]!;
    const find = (title: string) => (title === 'Ivan lesson' ? ivanLesson : space.lessons.find((l) => l.title === title)!);
    const update = (title: string, relatedLessonId: string | null) =>
      updateLesson(db, { lessonId: find(title).id, title, schoolLanguage: 'uk', topicNotes: '', prerequisiteNotes: '', relatedLessonId });

    const linked = update('Fractions UA', find('Fractions BG').id)._unsafeUnwrap();
    expect(linked.lessons.find((l) => l.title === 'Fractions UA')!.relatedLesson).toMatchObject({ title: 'Fractions BG', schoolSystem: 'bg' });
    expect(linked.lessons.find((l) => l.title === 'Fractions BG')!.isCurrent).toBe(false);
    expect(update('Fractions UA', find('Sibling UA').id)._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(update('Fractions UA', find('Ivan lesson').id)._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(update('Fractions UA', null)._unsafeUnwrap().lessons.find((l) => l.title === 'Fractions UA')!.relatedLesson).toBeNull();
  });

  it('rejects links between different academic years of the same school system', () => {
    const nextYear = enroll(mila, 'ua', 3, 'uk', '2027-2028').enrollments.find((e) => e.academicYear === '2027-2028')!.id;
    lesson(enrollmentId, 'Year 1');
    const space = lesson(nextYear, 'Year 2');
    const first = space.lessons.find((l) => l.title === 'Year 1')!;
    const second = space.lessons.find((l) => l.title === 'Year 2')!;
    const link = (from: typeof first, to: typeof first) =>
      updateLesson(db, { lessonId: from.id, title: from.title, schoolLanguage: 'uk', topicNotes: '', prerequisiteNotes: '', relatedLessonId: to.id });

    expect(link(first, second)._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(link(second, first)._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(getParentSpace(db, { profileId: mila })._unsafeUnwrap().lessons.every((l) => l.relatedLesson === null)).toBe(true);
  });

  it('clears a link when the related lesson is deleted and rejects invalid or excessive lessons', () => {
    const bgId = school(enroll(mila, 'bg', 3), 'bg');
    lesson(enrollmentId, 'UA');
    const space = lesson(bgId, 'BG');
    const ua = space.lessons.find((l) => l.title === 'UA')!;
    const bg = space.lessons.find((l) => l.title === 'BG')!;
    updateLesson(db, { lessonId: ua.id, title: 'UA', schoolLanguage: 'uk', topicNotes: '', prerequisiteNotes: '', relatedLessonId: bg.id })._unsafeUnwrap();
    const afterDelete = deleteLesson(db, { lessonId: bg.id })._unsafeUnwrap();
    expect(afterDelete.lessons.find((l) => l.id === ua.id)!.relatedLesson).toBeNull();

    expect(createLesson(db, { enrollmentId, title: '  ', schoolLanguage: 'uk' })._unsafeUnwrapErr().code).toBe('InvalidInput');
    expect(createLesson(db, { enrollmentId: randomUUID(), title: 'X', schoolLanguage: 'uk' })._unsafeUnwrapErr().code).toBe('InvalidInput');
    const insert = db.prepare(`INSERT INTO lessons (id, enrollment_id, position, title, school_language, created_at, updated_at)
      VALUES (?, ?, ?, 't', 'uk', 'x', 'x')`);
    for (let position = 2; position <= MAX_LESSONS_PER_ENROLLMENT; position += 1) insert.run(randomUUID(), enrollmentId, position);
    expect(createLesson(db, { enrollmentId, title: 'One too many', schoolLanguage: 'uk' })._unsafeUnwrapErr().code).toBe('InvalidInput');
  });
});

describe('migration 002', () => {
  it('upgrades a real version 1 database, keeping profiles and enforcing study constraints', () => {
    const old = new Database(':memory:');
    old.pragma('foreign_keys = ON');
    runMigrations(old, migrations.filter((migration) => migration.version === 1));
    old.prepare(`INSERT INTO profiles (id, display_name, age_band, preferred_language, learning_preferences, created_at)
      VALUES ('11111111-1111-4111-8111-111111111111', 'Mila', '9-11', 'bg', 'Short', 'x')`).run();

    runMigrations(old);

    expect(old.prepare('SELECT display_name AS name, selected_enrollment_id AS selected FROM profiles').all()).toEqual([{ name: 'Mila', selected: null }]);
    const insertEnrollment = (id: string, year: string) => old.prepare(`INSERT INTO enrollments VALUES (?, '11111111-1111-4111-8111-111111111111', 'ua', ?, 2, 'uk', 'x')`).run(id, year);
    insertEnrollment('e1', '2026-2027');
    expect(() => insertEnrollment('e2', '2026-2027')).toThrow(/UNIQUE/);
    const insertLesson = (id: string, position: number, current: number) => old.prepare(`INSERT INTO lessons (id, enrollment_id, position, title, school_language, is_current, created_at, updated_at)
      VALUES (?, 'e1', ?, 't', 'uk', ?, 'x', 'x')`).run(id, position, current);
    insertLesson('l1', 1, 1);
    expect(() => insertLesson('l2', 2, 1)).toThrow(/UNIQUE/);
    old.close();
  });
});
