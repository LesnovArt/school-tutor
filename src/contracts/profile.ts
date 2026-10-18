import { z } from 'zod';

export const uiLanguageSchema = z.enum(['uk', 'bg', 'en']);
export const ageBandSchema = z.enum(['6-8', '9-11', '12-14', '15+']);
export const profileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(40),
  ageBand: ageBandSchema,
  preferredLanguage: uiLanguageSchema,
  learningPreferences: z.string().max(240),
  createdAt: z.string().datetime(),
});
export const createProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  ageBand: ageBandSchema,
  preferredLanguage: uiLanguageSchema,
  learningPreferences: z.string().trim().max(240).default(''),
});
export type UiLanguage = z.infer<typeof uiLanguageSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;

export type ApiErrorCode = 'InvalidInput' | 'PersistenceFailure' | 'UnauthorizedAction' | 'InternalError';
export type ApiError = { code: ApiErrorCode; message: string };
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
