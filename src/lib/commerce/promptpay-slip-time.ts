/**
 * Whether a SlipOK-verified transfer happened at a time that can pay for a PromptPay intent.
 *
 * SlipOK checks that the receiver is the account bound to the branch (error 1014), because the
 * slip handler sends `log=true`. It does not know when the intent was created, so this module
 * adds the time binding: a transfer may predate its intent by at most a day (a buyer who paid,
 * let the 30-minute intent expire, and started a new one), and it may not be in the future.
 */

export const SLIP_MAX_AGE_BEFORE_INTENT_MS = 24 * 60 * 60 * 1000;
export const SLIP_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type SlipTimeFields = {
  transTimestamp?: unknown;
  transDate?: unknown;
  transTime?: unknown;
};

export type SlipTimeProblem = 'unknown_time' | 'too_old' | 'in_future';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function validDate(value: Date): Date | null {
  return Number.isNaN(value.getTime()) ? null : value;
}

/** The transfer instant: `transTimestamp` (ISO 8601), else `transDate` (yyyyMMdd) + `transTime` in Thai time. */
export function slipTransferredAt(data: SlipTimeFields | undefined): Date | null {
  if (typeof data?.transTimestamp === 'string' && ISO_TIMESTAMP.test(data.transTimestamp)) {
    const at = validDate(new Date(data.transTimestamp));
    if (at) return at;
  }
  if (typeof data?.transDate === 'string' && typeof data.transTime === 'string') {
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(data.transDate);
    if (date && /^\d{2}:\d{2}:\d{2}$/.test(data.transTime)) {
      return validDate(new Date(`${date[1]}-${date[2]}-${date[3]}T${data.transTime}+07:00`));
    }
  }
  return null;
}

export function slipTimeProblem(
  transferredAt: Date | null,
  intentCreatedAt: Date | null,
  now: Date,
): SlipTimeProblem | null {
  if (!transferredAt || !intentCreatedAt) return 'unknown_time';
  if (transferredAt.getTime() < intentCreatedAt.getTime() - SLIP_MAX_AGE_BEFORE_INTENT_MS) return 'too_old';
  if (transferredAt.getTime() > now.getTime() + SLIP_FUTURE_TOLERANCE_MS) return 'in_future';
  return null;
}
