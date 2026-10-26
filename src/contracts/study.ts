import { z } from 'zod';
import { uiLanguageSchema } from './profile';

export const schoolSystemSchema = z.enum(['ua', 'bg']);
export const academicYearSchema = z.string().regex(/^\d{4}-\d{4}$/).refine((value) => {
  const start = Number(value.slice(0, 4));
  const end = Number(value.slice(5));
  return start >= 2000 && start <= 2100 && end === start + 1;
});
export const gradeSchema = z.number().int().min(1).max(12);

const enrollmentFieldsSchema = z.object({
  academicYear: academicYearSchema,
  grade: gradeSchema,
  homeworkLanguage: uiLanguageSchema,
});
export const createEnrollmentInputSchema = enrollmentFieldsSchema.extend({
  profileId: z.uuid(),
  schoolSystem: schoolSystemSchema,
});
export const updateEnrollmentInputSchema = enrollmentFieldsSchema.extend({ enrollmentId: z.uuid() });
export const enrollmentSchema = createEnrollmentInputSchema.extend({ id: z.uuid(), createdAt: z.iso.datetime() });

const lessonFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  schoolLanguage: uiLanguageSchema,
  topicNotes: z.string().trim().max(1000).default(''),
  prerequisiteNotes: z.string().trim().max(500).default(''),
});
export const createLessonInputSchema = lessonFieldsSchema.extend({ enrollmentId: z.uuid() });
export const updateLessonInputSchema = lessonFieldsSchema.extend({
  lessonId: z.uuid(),
  relatedLessonId: z.uuid().nullable(),
});
export const moveLessonInputSchema = z.object({ lessonId: z.uuid(), direction: z.enum(['up', 'down']) });
export const lessonIdInputSchema = z.object({ lessonId: z.uuid() });
export const enrollmentIdInputSchema = z.object({ enrollmentId: z.uuid() });
export const profileIdInputSchema = z.object({ profileId: z.uuid() });

export const lessonSchema = lessonFieldsSchema.extend({
  id: z.uuid(),
  enrollmentId: z.uuid(),
  position: z.number().int().min(1),
  isCurrent: z.boolean(),
  relatedLesson: z.object({ id: z.uuid(), title: z.string(), schoolSystem: schoolSystemSchema }).nullable(),
});
export const studySpaceSchema = z.object({
  profileId: z.uuid(),
  selectedEnrollmentId: z.uuid().nullable(),
  enrollments: z.array(enrollmentSchema),
  lessons: z.array(lessonSchema),
});

export type SchoolSystem = z.infer<typeof schoolSystemSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type StudySpace = z.infer<typeof studySpaceSchema>;
export type CreateEnrollmentInput = z.input<typeof createEnrollmentInputSchema>;
export type UpdateEnrollmentInput = z.input<typeof updateEnrollmentInputSchema>;
export type CreateLessonInput = z.input<typeof createLessonInputSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonInputSchema>;
export type MoveLessonInput = z.input<typeof moveLessonInputSchema>;
