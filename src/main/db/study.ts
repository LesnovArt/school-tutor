import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from 'neverthrow';
import type { z } from 'zod';
import type { ApiError, ApiErrorCode } from '../../contracts/api';
import {
  createEnrollmentInputSchema,
  createLessonInputSchema,
  enrollmentIdInputSchema,
  lessonIdInputSchema,
  moveLessonInputSchema,
  profileIdInputSchema,
  studySpaceSchema,
  updateEnrollmentInputSchema,
  updateLessonInputSchema,
  type StudySpace,
} from '../../contracts/study';

type Db = Database.Database;

export const MAX_LESSONS_PER_ENROLLMENT = 200;

class StudyError extends Error {
  constructor(readonly apiError: ApiError) { super(apiError.message); }
}

function fail(code: ApiErrorCode, message: string): never {
  throw new StudyError({ code, message });
}

function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) fail('InvalidInput', 'Check the details and try again.');
  return parsed.data;
}

/** Runs a study operation in one transaction and converts failures to typed results. */
function guarded<T>(db: Db, operation: () => T): Result<T, ApiError> {
  try {
    return ok(db.transaction(operation)());
  } catch (error) {
    if (error instanceof StudyError) return err(error.apiError);
    return err({ code: 'PersistenceFailure', message: 'Could not save study changes.' });
  }
}

function loadSpace(db: Db, profileId: string): StudySpace {
  const profile = db.prepare('SELECT selected_enrollment_id AS selected FROM profiles WHERE id = ?')
    .get(profileId) as { selected: string | null } | undefined;
  if (!profile) fail('InvalidInput', 'Choose an existing profile.');
  const enrollments = db.prepare(`SELECT id, profile_id AS profileId, school_system AS schoolSystem,
    academic_year AS academicYear, grade, homework_language AS homeworkLanguage, created_at AS createdAt
    FROM enrollments WHERE profile_id = ? ORDER BY rowid`).all(profileId) as { id: string }[];
  const rows = db.prepare(`SELECT l.id, l.enrollment_id AS enrollmentId, l.position, l.title,
    l.school_language AS schoolLanguage, l.topic_notes AS topicNotes, l.prerequisite_notes AS prerequisiteNotes,
    l.is_current AS isCurrent, r.id AS relatedId, r.title AS relatedTitle, re.school_system AS relatedSchoolSystem
    FROM lessons l JOIN enrollments e ON e.id = l.enrollment_id
    LEFT JOIN lessons r ON r.id = l.related_lesson_id
    LEFT JOIN enrollments re ON re.id = r.enrollment_id
    WHERE e.profile_id = ? ORDER BY e.rowid, l.position`).all(profileId) as Record<string, unknown>[];
  const lessons = rows.map(({ relatedId, relatedTitle, relatedSchoolSystem, isCurrent, ...lesson }) => ({
    ...lesson,
    isCurrent: isCurrent === 1,
    relatedLesson: relatedId ? { id: relatedId, title: relatedTitle, schoolSystem: relatedSchoolSystem } : null,
  }));
  const selectedEnrollmentId = enrollments.some((enrollment) => enrollment.id === profile.selected)
    ? profile.selected
    : (enrollments[0]?.id ?? null);
  return studySpaceSchema.parse({ profileId, selectedEnrollmentId, enrollments, lessons });
}

function profileIdOfEnrollment(db: Db, enrollmentId: string): string {
  const row = db.prepare('SELECT profile_id AS profileId FROM enrollments WHERE id = ?').get(enrollmentId) as { profileId: string } | undefined;
  if (!row) fail('InvalidInput', 'Choose an existing school.');
  return row.profileId;
}

function findLesson(db: Db, lessonId: string): { enrollmentId: string; profileId: string; schoolSystem: string } {
  const row = db.prepare(`SELECT l.enrollment_id AS enrollmentId, e.profile_id AS profileId, e.school_system AS schoolSystem
    FROM lessons l JOIN enrollments e ON e.id = l.enrollment_id WHERE l.id = ?`).get(lessonId) as
    { enrollmentId: string; profileId: string; schoolSystem: string } | undefined;
  if (!row) fail('InvalidInput', 'Choose an existing lesson.');
  return row;
}

function orderedLessonIds(db: Db, enrollmentId: string): string[] {
  return (db.prepare('SELECT id FROM lessons WHERE enrollment_id = ? ORDER BY position, id').all(enrollmentId) as { id: string }[])
    .map((row) => row.id);
}

function resequence(db: Db, ids: string[]): void {
  const update = db.prepare('UPDATE lessons SET position = ? WHERE id = ?');
  ids.forEach((id, index) => update.run(index + 1, id));
}

function ensureNoDuplicateEnrollment(db: Db, profileId: string, schoolSystem: string, academicYear: string, exceptId = ''): void {
  const duplicate = db.prepare(`SELECT 1 FROM enrollments
    WHERE profile_id = ? AND school_system = ? AND academic_year = ? AND id != ?`).get(profileId, schoolSystem, academicYear, exceptId);
  if (duplicate) fail('InvalidInput', 'This school year is already added for this child.');
}

/** Child-facing read: the space of the profile main already resolved as active. */
export function getActiveSpace(db: Db, activeProfileId: string | null): Result<StudySpace | null, ApiError> {
  if (!activeProfileId) return ok(null);
  return guarded(db, () => loadSpace(db, activeProfileId));
}

export function selectEnrollment(db: Db, activeProfileId: string | null, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const { enrollmentId } = parseInput(enrollmentIdInputSchema, input);
    if (!activeProfileId) fail('InvalidInput', 'Choose a child profile first.');
    const owner = db.prepare('SELECT profile_id AS profileId FROM enrollments WHERE id = ?').get(enrollmentId) as { profileId: string } | undefined;
    if (owner?.profileId !== activeProfileId) fail('UnauthorizedAction', 'This school space belongs to another child.');
    db.prepare('UPDATE profiles SET selected_enrollment_id = ? WHERE id = ?').run(enrollmentId, activeProfileId);
    return loadSpace(db, activeProfileId);
  });
}

/** Parent-only reads and mutations; callers must have verified parent authorization. */
export function getParentSpace(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => loadSpace(db, parseInput(profileIdInputSchema, input).profileId));
}

export function createEnrollment(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const data = parseInput(createEnrollmentInputSchema, input);
    const space = loadSpace(db, data.profileId);
    ensureNoDuplicateEnrollment(db, data.profileId, data.schoolSystem, data.academicYear);
    const id = randomUUID();
    db.prepare(`INSERT INTO enrollments (id, profile_id, school_system, academic_year, grade, homework_language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, data.profileId, data.schoolSystem, data.academicYear, data.grade, data.homeworkLanguage, new Date().toISOString());
    if (space.enrollments.length === 0) db.prepare('UPDATE profiles SET selected_enrollment_id = ? WHERE id = ?').run(id, data.profileId);
    return loadSpace(db, data.profileId);
  });
}

export function updateEnrollment(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const data = parseInput(updateEnrollmentInputSchema, input);
    const profileId = profileIdOfEnrollment(db, data.enrollmentId);
    const { schoolSystem } = db.prepare('SELECT school_system AS schoolSystem FROM enrollments WHERE id = ?').get(data.enrollmentId) as { schoolSystem: string };
    ensureNoDuplicateEnrollment(db, profileId, schoolSystem, data.academicYear, data.enrollmentId);
    db.prepare('UPDATE enrollments SET academic_year = ?, grade = ?, homework_language = ? WHERE id = ?')
      .run(data.academicYear, data.grade, data.homeworkLanguage, data.enrollmentId);
    return loadSpace(db, profileId);
  });
}

export function createLesson(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const data = parseInput(createLessonInputSchema, input);
    const profileId = profileIdOfEnrollment(db, data.enrollmentId);
    const ids = orderedLessonIds(db, data.enrollmentId);
    if (ids.length >= MAX_LESSONS_PER_ENROLLMENT) fail('InvalidInput', 'This school has the maximum number of lessons.');
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO lessons (id, enrollment_id, position, title, school_language, topic_notes, prerequisite_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), data.enrollmentId, ids.length + 1, data.title, data.schoolLanguage, data.topicNotes, data.prerequisiteNotes, now, now);
    return loadSpace(db, profileId);
  });
}

export function updateLesson(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const data = parseInput(updateLessonInputSchema, input);
    const lesson = findLesson(db, data.lessonId);
    if (data.relatedLessonId) {
      const related = findLesson(db, data.relatedLessonId);
      // Links connect the same child's lessons across school systems (UA <-> BG), not across years of one school.
      if (related.profileId !== lesson.profileId || related.schoolSystem === lesson.schoolSystem) {
        fail('InvalidInput', 'A related lesson must be in the other school system of the same child.');
      }
    }
    db.prepare(`UPDATE lessons SET title = ?, school_language = ?, topic_notes = ?, prerequisite_notes = ?,
      related_lesson_id = ?, updated_at = ? WHERE id = ?`).run(data.title, data.schoolLanguage, data.topicNotes, data.prerequisiteNotes,
      data.relatedLessonId, new Date().toISOString(), data.lessonId);
    return loadSpace(db, lesson.profileId);
  });
}

export function moveLesson(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const data = parseInput(moveLessonInputSchema, input);
    const lesson = findLesson(db, data.lessonId);
    const ids = orderedLessonIds(db, lesson.enrollmentId);
    const from = ids.indexOf(data.lessonId);
    const to = data.direction === 'up' ? from - 1 : from + 1;
    const neighbour = ids[to];
    if (neighbour !== undefined) {
      ids.splice(from, 1);
      ids.splice(to, 0, data.lessonId);
      resequence(db, ids);
    }
    return loadSpace(db, lesson.profileId);
  });
}

export function setCurrentLesson(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const { lessonId } = parseInput(lessonIdInputSchema, input);
    const lesson = findLesson(db, lessonId);
    db.prepare('UPDATE lessons SET is_current = 0 WHERE enrollment_id = ?').run(lesson.enrollmentId);
    db.prepare('UPDATE lessons SET is_current = 1 WHERE id = ?').run(lessonId);
    return loadSpace(db, lesson.profileId);
  });
}

export function deleteLesson(db: Db, input: unknown): Result<StudySpace, ApiError> {
  return guarded(db, () => {
    const { lessonId } = parseInput(lessonIdInputSchema, input);
    const lesson = findLesson(db, lessonId);
    db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);
    resequence(db, orderedLessonIds(db, lesson.enrollmentId));
    return loadSpace(db, lesson.profileId);
  });
}
