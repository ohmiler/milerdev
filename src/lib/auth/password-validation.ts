import { z } from 'zod';
import { getPasswordPolicyError } from '@/lib/auth/password-policy';

export const newPasswordSchema = z.string().superRefine((password, context) => {
  const message = getPasswordPolicyError(password);
  if (message) context.addIssue({ code: 'custom', message });
});
