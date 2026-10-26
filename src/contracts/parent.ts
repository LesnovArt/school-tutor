import { z } from 'zod';

export const pinSchema = z.string().regex(/^\d{4,8}$/);
export const pinInputSchema = z.object({ pin: pinSchema });
export const parentStatusSchema = z.object({ pinSet: z.boolean(), unlocked: z.boolean() });
export const unlockResultSchema = z.object({
  outcome: z.enum(['unlocked', 'incorrect', 'throttled']),
  retryAfterSeconds: z.number().int().min(0),
});
export type PinInput = z.infer<typeof pinInputSchema>;
export type ParentStatus = z.infer<typeof parentStatusSchema>;
export type UnlockResult = z.infer<typeof unlockResultSchema>;
