import { z } from 'zod';

export const CONSENT_VERSION = 1;
export const CONSENT_COOKIE = 'milerdev_consent';
export const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
export const consentChoiceSchema = z.object({ analytics: z.boolean() }).strict();
export type ConsentStatus = { analytics: boolean; decided: boolean; expiresAt: string | null };
export const UNKNOWN_CONSENT: ConsentStatus = { analytics: false, decided: false, expiresAt: null };

export function isConsentCurrent(record: {
  version: number; analytics: boolean; expiresAt: Date; revokedAt: Date | null;
} | null | undefined, now = new Date()): boolean {
  return !!record && record.version === CONSENT_VERSION && record.analytics
    && record.revokedAt === null && record.expiresAt > now;
}
