import { beforeEach, describe, expect, it, vi } from 'vitest';

const { paymentInsert, resolveProductExposureAttribution } = vi.hoisted(() => ({
  paymentInsert: vi.fn(),
  resolveProductExposureAttribution: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 9, resetTime: Date.now() + 60_000 }),
  rateLimits: { sensitive: { maxRequests: 10, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/coupon', () => ({
  calculateDiscount: vi.fn(),
  validateCouponEligibility: vi.fn(),
}));
vi.mock('@/lib/measurement-recorder', () => ({
  measurementRecorder: { resolveProductExposureAttribution },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test',
          url: 'https://checkout.stripe.test/session',
        }),
      },
    },
  },
}));
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      courses: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'course-1',
          slug: 'course-one',
          title: 'Course One',
          description: null,
          thumbnailUrl: null,
          price: '990.00',
          promoPrice: null,
          promoStartsAt: null,
          promoEndsAt: null,
          status: 'published',
          lessons: [{ id: 'lesson-1' }],
        }),
      },
      enrollments: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    select: vi.fn(),
    insert: vi.fn(() => ({ values: paymentInsert })),
  },
}));

import { db } from '@/lib/db';

const exposureId = '11111111-1111-4111-8111-111111111111';

describe('Stripe payment-attempt attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentInsert.mockResolvedValue(undefined);
    resolveProductExposureAttribution.mockResolvedValue(exposureId);
  });

  it('stores only the server-validated Course exposure on the immutable payment attempt', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const response = await POST(new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: 'course-1', exposureId }),
    }));

    expect(response.status).toBe(200);
    expect(resolveProductExposureAttribution).toHaveBeenCalledWith({
      exposureId,
      productType: 'course',
      productId: 'course-1',
    });
    expect(paymentInsert).toHaveBeenCalledWith(expect.objectContaining({
      courseId: 'course-1',
      attributedExposureId: exposureId,
      status: 'pending',
    }));
  });

  it('stores only the server-validated Bundle exposure on the immutable payment attempt', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'bundle-1',
              slug: 'bundle-one',
              title: 'Bundle One',
              description: null,
              thumbnailUrl: null,
              price: '1990.00',
              status: 'published',
            }]),
          })),
        })),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([{
                courseId: 'course-1',
                courseTitle: 'Course One',
                courseStatus: 'published',
              }]),
            })),
          })),
        })),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn().mockResolvedValue([{ courseId: 'course-1', lessonCount: 1 }]),
          })),
        })),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      } as never);

    const { POST } = await import('@/app/api/stripe/bundle-checkout/route');
    const response = await POST(new Request('http://localhost/api/stripe/bundle-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'bundle-1', exposureId }),
    }));

    expect(response.status).toBe(200);
    expect(resolveProductExposureAttribution).toHaveBeenCalledWith({
      exposureId,
      productType: 'bundle',
      productId: 'bundle-1',
    });
    expect(paymentInsert).toHaveBeenCalledWith(expect.objectContaining({
      bundleId: 'bundle-1',
      attributedExposureId: exposureId,
      status: 'pending',
    }));
  });
});
