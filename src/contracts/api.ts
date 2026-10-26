export type ApiErrorCode = 'InvalidInput' | 'PersistenceFailure' | 'UnauthorizedAction' | 'InternalError';
export type ApiError = { code: ApiErrorCode; message: string };
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
