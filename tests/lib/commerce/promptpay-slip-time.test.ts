import { describe, expect, it } from 'vitest';

import {
  SLIP_FUTURE_TOLERANCE_MS,
  SLIP_MAX_AGE_BEFORE_INTENT_MS,
  slipTimeProblem,
  slipTransferredAt,
} from '@/lib/commerce/promptpay-slip-time';

describe('slipTransferredAt', () => {
  it('reads the ISO transTimestamp', () => {
    expect(slipTransferredAt({ transTimestamp: '2020-04-01T03:15:07.000Z' })?.toISOString())
      .toBe('2020-04-01T03:15:07.000Z');
  });

  it('falls back to transDate and transTime in Thai time', () => {
    // SlipOK's documented example: 20200401 10:15:07 in Thailand is 03:15:07 UTC.
    expect(slipTransferredAt({ transDate: '20200401', transTime: '10:15:07' })?.toISOString())
      .toBe('2020-04-01T03:15:07.000Z');
  });

  it('prefers transTimestamp over the date and time fields', () => {
    expect(slipTransferredAt({
      transTimestamp: '2026-10-11T01:00:00Z', transDate: '20200101', transTime: '00:00:00',
    })?.toISOString()).toBe('2026-10-11T01:00:00.000Z');
  });

  it('returns null for missing or malformed times instead of guessing', () => {
    expect(slipTransferredAt(undefined)).toBeNull();
    expect(slipTransferredAt({})).toBeNull();
    // Date('1') would parse leniently as the year 2001; only full ISO timestamps count.
    expect(slipTransferredAt({ transTimestamp: '1' })).toBeNull();
    expect(slipTransferredAt({ transTimestamp: 'not a date' })).toBeNull();
    expect(slipTransferredAt({ transDate: '2020-04-01', transTime: '10:15:07' })).toBeNull();
    expect(slipTransferredAt({ transDate: '20200401', transTime: '10:15' })).toBeNull();
    expect(slipTransferredAt({ transDate: '20201341', transTime: '10:15:07' })).toBeNull();
  });
});

describe('slipTimeProblem', () => {
  const intentCreatedAt = new Date('2026-10-11T12:00:00Z');
  const now = new Date('2026-10-11T12:10:00Z');
  const at = (ms: number) => new Date(intentCreatedAt.getTime() + ms);

  it('accepts a transfer after the intent was created', () => {
    expect(slipTimeProblem(at(60_000), intentCreatedAt, now)).toBeNull();
  });

  it('accepts a transfer up to a day before the intent', () => {
    expect(slipTimeProblem(at(-SLIP_MAX_AGE_BEFORE_INTENT_MS), intentCreatedAt, now)).toBeNull();
  });

  it('rejects a transfer more than a day before the intent', () => {
    expect(slipTimeProblem(at(-SLIP_MAX_AGE_BEFORE_INTENT_MS - 1), intentCreatedAt, now)).toBe('too_old');
  });

  it('rejects a transfer later than now beyond the clock tolerance', () => {
    expect(slipTimeProblem(new Date(now.getTime() + SLIP_FUTURE_TOLERANCE_MS), intentCreatedAt, now)).toBeNull();
    expect(slipTimeProblem(new Date(now.getTime() + SLIP_FUTURE_TOLERANCE_MS + 1), intentCreatedAt, now)).toBe('in_future');
  });

  it('cannot judge a slip without both times', () => {
    expect(slipTimeProblem(null, intentCreatedAt, now)).toBe('unknown_time');
    expect(slipTimeProblem(at(0), null, now)).toBe('unknown_time');
  });
});
