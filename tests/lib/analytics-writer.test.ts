import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insert, insertValues } = vi.hoisted(() => {
  const values = vi.fn();
  return {
    insertValues: values,
    insert: vi.fn(() => ({ values })),
  };
});

vi.mock('@/lib/analytics-control', () => ({
  getAnalyticsControlState: vi.fn(),
  isAnalyticsEventEnabled: vi.fn(),
  resetAnalyticsControlCache: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: { insert, select: vi.fn() } }));
vi.mock('@/lib/db/safe-insert', () => ({ isDuplicateKeyError: vi.fn().mockReturnValue(false) }));
vi.mock('@/lib/error-handler', () => ({ logEvent: vi.fn() }));

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import {
  recordClientAnalyticsEvent,
  recordServerAnalyticsEvent,
} from '@/lib/analytics';

const checkoutEvent = {
  eventName: 'checkout_opened' as const,
  courseId: 'course-1',
  placement: 'course_detail' as const,
};

describe('analytics writer boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(true);
    insertValues.mockResolvedValue(undefined);
  });

  it('does not write when the operational or event-class gate is disabled', async () => {
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(false);

    await expect(recordClientAnalyticsEvent(checkoutEvent, 'user-1')).resolves.toBe(false);

    expect(isAnalyticsEventEnabled).toHaveBeenCalledWith('checkout_opened');
    expect(insert).not.toHaveBeenCalled();
  });

  it('keeps product views behind MeasurementRecorder eligibility and idempotency', async () => {
    await expect(recordClientAnalyticsEvent({
      eventName: 'course_viewed',
      exposureId: '11111111-1111-4111-8111-111111111111',
      courseId: 'course-1',
      placement: 'course_detail',
    }, 'user-1')).resolves.toBe(false);

    expect(isAnalyticsEventEnabled).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects runtime server payload extensions before checking the gate or writing', async () => {
    await expect(recordServerAnalyticsEvent({
      eventName: 'purchase_completed',
      userId: 'user-1',
      courseId: 'course-1',
      paymentId: 'payment-1',
      paymentPayload: { secret: true },
    } as never)).resolves.toBe(false);

    expect(isAnalyticsEventEnabled).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('routes purchase completion through the transactional outbox instead of the legacy writer', async () => {
    await expect(recordServerAnalyticsEvent({
      eventName: 'purchase_completed',
      userId: 'user-1',
      courseId: 'course-1',
      paymentId: 'payment-1',
    })).resolves.toBe(false);

    expect(isAnalyticsEventEnabled).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('routes free enrollment completion through the transactional outbox', async () => {
    await expect(recordServerAnalyticsEvent({
      eventName: 'free_enrollment_completed',
      userId: 'user-1',
      courseId: 'course-1',
      enrollmentId: 'enrollment-1',
    })).resolves.toBe(false);

    expect(isAnalyticsEventEnabled).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('stores only allow-listed fields with null network identifiers', async () => {
    await expect(recordClientAnalyticsEvent(checkoutEvent, 'user-1')).resolves.toBe(true);

    expect(insertValues).toHaveBeenCalledWith({
      eventName: 'checkout_opened',
      source: 'client',
      userId: 'user-1',
      courseId: 'course-1',
      bundleId: null,
      paymentId: null,
      enrollmentId: null,
      metadata: JSON.stringify({ placement: 'course_detail' }),
      ipAddress: null,
      userAgent: null,
    });
  });
});
