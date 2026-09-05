import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, resetTime: Date.now() + 60_000 })),
  rateLimits: { sensitive: { maxRequests: 10, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/coupon', () => ({
  calculateDiscount: vi.fn(),
  validateCouponEligibility: vi.fn(),
}));

const selectQueue: unknown[][] = [];
const inserted: Record<string, unknown>[] = [];

function queryChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'where', 'orderBy', 'groupBy']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.limit = vi.fn(() => Promise.resolve(result));
  chain.for = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve(result));
  return chain;
}

const tx = {
  select: vi.fn(() => queryChain(selectQueue.shift() ?? [])),
  insert: vi.fn(() => ({
    values: vi.fn((value: Record<string, unknown>) => {
      inserted.push(value);
      return Promise.resolve();
    }),
  })),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((work: (transaction: typeof tx) => unknown) => work(tx)),
  },
}));

import { auth } from '@/lib/auth';

const studentSession = { user: { id: 'student-1' } };

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/promptpay/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PromptPay intent creation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    inserted.length = 0;
    vi.mocked(auth).mockResolvedValue(studentSession as never);
  });

  it('creates an immutable owner-bound course attempt before transfer', async () => {
    selectQueue.push(
      [{
        id: 'course-1', title: 'Course', price: '990.00', promoPrice: null,
        promoStartsAt: null, promoEndsAt: null, status: 'published',
      }],
      [{ lessonCount: 1 }],
      [],
    );
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ courseId: 'course-1' }));

    expect(response.status).toBe(201);
    expect(inserted).toContainEqual(expect.objectContaining({
      userId: 'student-1',
      courseId: 'course-1',
      couponId: null,
      amount: '990.00',
      method: 'promptpay',
      status: 'pending',
    }));
    const body = await response.json();
    expect(body.paymentId).toBeTruthy();
    expect(body.expiresAt).toBeTruthy();
  });

  it('rejects a stale reviewed amount without inserting an attempt', async () => {
    selectQueue.push(
      [{ id: 'course-1', title: 'Course', price: '990.00', promoPrice: null, promoStartsAt: null, promoEndsAt: null, status: 'published' }],
      [{ lessonCount: 1 }], [],
    );
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ courseId: 'course-1', expectedAmount: '490.00' }));
    expect(response.status).toBe(409);
    expect(inserted).toHaveLength(0);
  });

  it('does not create an intent for an archived course', async () => {
    selectQueue.push([{
      id: 'course-1', title: 'Course', price: '990.00', promoPrice: null,
      promoStartsAt: null, promoEndsAt: null, status: 'archived',
    }]);
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ courseId: 'course-1' }));

    expect(response.status).toBe(404);
    expect(inserted).toHaveLength(0);
  });

  it('does not create an intent for a course with no lessons', async () => {
    selectQueue.push(
      [{
        id: 'course-1', title: 'Course', price: '990.00', promoPrice: null,
        promoStartsAt: null, promoEndsAt: null, status: 'published',
      }],
      [{ lessonCount: 0 }],
    );
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ courseId: 'course-1' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'COURSE_NOT_READY' });
    expect(inserted).toHaveLength(0);
  });

  it('rejects a bundle before payment creation when any locked child is not published', async () => {
    selectQueue.push([
      { id: 'course-1', status: 'published' },
      { id: 'course-2', status: 'archived' },
    ]);
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ bundleId: 'bundle-1' }));

    expect(response.status).toBe(409);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a bundle when any published child has no lessons', async () => {
    selectQueue.push(
      [
        { id: 'course-1', status: 'published' },
        { id: 'course-2', status: 'published' },
      ],
      [{ courseId: 'course-1', lessonCount: 2 }],
    );
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ bundleId: 'bundle-1' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'BUNDLE_NOT_READY' });
    expect(inserted).toHaveLength(0);
  });

  it('rejects ambiguous targets', async () => {
    const { POST } = await import('@/app/api/promptpay/intents/route');
    const response = await POST(request({ courseId: 'course-1', bundleId: 'bundle-1' }));

    expect(response.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});
