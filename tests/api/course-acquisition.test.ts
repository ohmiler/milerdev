import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  course: vi.fn(), enrollment: vi.fn(), coupon: vi.fn(), usage: vi.fn(), payment: vi.fn(),
  insert: vi.fn(), stripe: vi.fn(), free: vi.fn(), paid: vi.fn(),
}));
vi.mock('@/lib/db', async () => {
  const { coupons, couponUsages } = await import('@/lib/db/schema');
  return { db: {
    query: {
      courses: { findFirst: fixtures.course }, enrollments: { findFirst: fixtures.enrollment },
      coupons: { findFirst: fixtures.coupon }, payments: { findFirst: fixtures.payment },
    },
    select: () => ({ from: (table: unknown) => ({ where: () => {
      const rows = table === coupons ? Promise.resolve(fixtures.coupon()).then((coupon) => coupon ? [coupon] : [])
        : table === couponUsages ? Promise.resolve([{ count: fixtures.usage() }])
          : Promise.reject(new Error('Unexpected query'));
      return Object.assign(rows, { limit: () => rows });
    } }) }),
    insert: () => ({ values: fixtures.insert }),
  } };
});
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'member-1' } }) }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true }), rateLimits: { sensitive: {} }, rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: fixtures.stripe } } } }));
vi.mock('@/lib/free-enrollment-fulfillment', () => ({ fulfillFreeEnrollment: fixtures.free }));
vi.mock('@/lib/db/safe-insert', () => ({ safeInsertEnrollment: fixtures.paid }));
vi.mock('@/lib/email', () => ({ sendEnrollmentEmail: vi.fn() }));
vi.mock('@/lib/privacy-consent', () => ({ withBrowserConsent: vi.fn() }));
vi.mock('@/lib/measurement-recorder', () => ({ measurementRecorder: { resolveProductExposureAttribution: vi.fn() } }));

import { loadOrderReview } from '@/lib/order-review';
import { POST as checkout } from '@/app/api/stripe/checkout/route';
import { POST as enroll } from '@/app/api/enroll/route';

const course = {
  id: 'course-1', title: 'Course', slug: 'course', description: null, thumbnailUrl: null,
  status: 'published', price: '1500.00', promoPrice: '1000.00',
  promoStartsAt: null, promoEndsAt: null, lessons: [{ id: 'lesson-1' }],
};
const coupon = {
  id: 'coupon-1', code: 'SAVE25', description: null, isActive: true, startsAt: null, expiresAt: null,
  courseId: null, usageLimit: null, usageCount: 0, perUserLimit: 1, minPurchase: null,
  discountType: 'percentage', discountValue: '25', maxDiscount: null,
};
function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const target = { courseId: 'course-1' };
const discounted = { ...target, couponId: 'coupon-1' };
function expectNoAcquisition() {
  expect(fixtures.insert).not.toHaveBeenCalled();
  expect(fixtures.stripe).not.toHaveBeenCalled();
  expect(fixtures.free).not.toHaveBeenCalled();
  expect(fixtures.paid).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-18T10:00:00Z'));
  fixtures.course.mockResolvedValue({ ...course });
  fixtures.enrollment.mockResolvedValue(null);
  fixtures.coupon.mockResolvedValue({ ...coupon });
  fixtures.usage.mockReturnValue(0);
  fixtures.payment.mockResolvedValue(null);
  fixtures.insert.mockResolvedValue(undefined);
  fixtures.stripe.mockResolvedValue({ id: 'session-1', url: 'https://checkout.stripe.com/test' });
  fixtures.free.mockResolvedValue({ created: [{ id: 'enrollment-1', courseId: 'course-1' }], existing: [] });
  fixtures.paid.mockResolvedValue({ created: true, enrollment: { id: 'enrollment-1' } });
});
afterEach(() => { vi.useRealTimers(); });

describe('course acquisition across real callers', () => {
  it.each([
    ['percentage', { discountType: 'percentage', discountValue: '25' }, '750.00'],
    ['capped percentage', { discountType: 'percentage', discountValue: '50', maxDiscount: '100.00' }, '900.00'],
    ['fixed', { discountType: 'fixed', discountValue: '100.25' }, '899.75'],
  ])('uses the same %s quote in review and Stripe, and refuses unpaid enrollment', async (_name, changes, amount) => {
    fixtures.coupon.mockResolvedValue({ ...coupon, ...changes });
    const review = await loadOrderReview('member-1', { ...target, couponCode: 'save25' });
    expect(review.price.amountDue).toBe(amount);
    expect(review.action).toBe('pay');
    expectNoAcquisition();
    expect((await enroll(request(discounted))).status).toBe(402);
    expectNoAcquisition();
    expect((await checkout(request({ ...discounted, expectedAmount: review.price.amountDue }))).status).toBe(200);
    expect(fixtures.insert).toHaveBeenCalledWith(expect.objectContaining({ amount, couponId: coupon.id, status: 'pending', currency: 'THB' }));
    expect(fixtures.stripe.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(Math.round(Number(amount) * 100));
    expect(fixtures.free).not.toHaveBeenCalled();
  });

  it('routes a full discount only to explicit free fulfillment', async () => {
    fixtures.coupon.mockResolvedValue({ ...coupon, discountValue: '100' });
    const review = await loadOrderReview('member-1', { ...target, couponCode: 'FREE' });
    expect(review.action).toBe('enroll-free');
    expect(review.price.amountDue).toBe('0.00');
    expect((await checkout(request(discounted))).status).toBe(400);
    expectNoAcquisition();
    expect((await enroll(request(discounted))).status).toBe(201);
    expect(fixtures.free).toHaveBeenCalledWith({ userId: 'member-1', courseIds: ['course-1'], coupon: { id: 'coupon-1', discountAmount: '1000' } });
    expect(fixtures.paid).not.toHaveBeenCalled();
  });

  it.each([
    { isActive: false }, { expiresAt: new Date('2026-09-17') },
    { startsAt: new Date('2026-09-19') }, { courseId: 'another-course' },
    { usageLimit: 2, usageCount: 2 }, { minPurchase: '1500.00' },
  ])('rejects invalid coupons in all callers without side effects: %j', async (changes) => {
    fixtures.coupon.mockResolvedValue({ ...coupon, ...changes });
    await expect(loadOrderReview('member-1', { ...target, couponCode: 'SAVE25' })).rejects.toThrow();
    expect((await checkout(request(discounted))).status).toBe(400);
    expect((await enroll(request(discounted))).status).toBe(400);
    expectNoAcquisition();
  });

  it('rechecks coupon usage after review before either initiation', async () => {
    fixtures.coupon.mockResolvedValue({ ...coupon, discountValue: '100' });
    expect((await loadOrderReview('member-1', { ...target, couponCode: 'FREE' })).action).toBe('enroll-free');
    fixtures.usage.mockReturnValue(1);
    expect((await checkout(request(discounted))).status).toBe(400);
    expect((await enroll(request(discounted))).status).toBe(400);
    expectNoAcquisition();
  });

  it('rechecks the promotion clock after review and preserves the expected-amount rejection', async () => {
    fixtures.course.mockResolvedValue({ ...course, promoEndsAt: new Date('2026-09-18T11:00:00Z') });
    const review = await loadOrderReview('member-1', target);
    expect(review.price.amountDue).toBe('1000.00');
    vi.setSystemTime(new Date('2026-09-18T12:00:00Z'));
    expect((await checkout(request({ ...target, expectedAmount: review.price.amountDue }))).status).toBe(409);
    expect((await enroll(request(target))).status).toBe(402);
    expect((await loadOrderReview('member-1', target)).price.amountDue).toBe('1500.00');
    expectNoAcquisition();
  });

  it('rejects acquisition after ownership changes following a review', async () => {
    await loadOrderReview('member-1', target);
    fixtures.enrollment.mockResolvedValue({ id: 'enrollment-1' });
    expect((await loadOrderReview('member-1', target)).action).toBe('owned');
    expect((await checkout(request(target))).status).toBe(400);
    expect((await enroll(request(target))).status).toBe(400);
    expectNoAcquisition();
  });

  it('checks readiness again at initiation, while review still displays unavailable facts', async () => {
    await loadOrderReview('member-1', target);
    fixtures.course.mockResolvedValue({ ...course, lessons: [] });
    expect((await loadOrderReview('member-1', target)).action).toBe('unavailable');
    for (const initiate of [checkout, enroll]) {
      const response = await initiate(request(discounted));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: 'COURSE_NOT_READY' });
    }
    expectNoAcquisition();
  });

  it.each([null, { ...course, status: 'draft' }])('does not expose or initiate an unavailable course', async (value) => {
    fixtures.course.mockResolvedValue(value);
    await expect(loadOrderReview('member-1', target)).rejects.toThrow();
    expect((await checkout(request(target))).status).toBe(404);
    expect((await enroll(request(target))).status).toBe(404);
    expectNoAcquisition();
  });

  it('requires verified payment recovery even when the course is no longer ready', async () => {
    fixtures.course.mockResolvedValue({ ...course, lessons: [] });
    expect((await enroll(request({ ...discounted, paymentId: 'payment-1' }))).status).toBe(402);
    expectNoAcquisition();
    fixtures.payment.mockResolvedValue({ id: 'payment-1', status: 'completed' });
    expect((await enroll(request({ ...discounted, paymentId: 'payment-1' }))).status).toBe(201);
    expect(fixtures.coupon).not.toHaveBeenCalled();
    expect(fixtures.free).not.toHaveBeenCalled();
    expect(fixtures.paid).toHaveBeenCalledWith('member-1', 'course-1');
  });

  it('keeps free courses independent of irrelevant coupons during free enrollment', async () => {
    fixtures.course.mockResolvedValue({ ...course, price: '0.00', promoPrice: null });
    fixtures.coupon.mockResolvedValue(null);
    expect((await loadOrderReview('member-1', target)).action).toBe('enroll-free');
    expect((await enroll(request(discounted))).status).toBe(201);
    expect(fixtures.coupon).not.toHaveBeenCalled();
    expect(fixtures.free).toHaveBeenCalledWith({ userId: 'member-1', courseIds: ['course-1'] });
  });

  it('preserves the full-discount requirement before rounding a sub-satang remainder', async () => {
    fixtures.course.mockResolvedValue({ ...course, price: '0.01', promoPrice: null });
    fixtures.coupon.mockResolvedValue({ ...coupon, discountValue: '99' });
    expect((await loadOrderReview('member-1', { ...target, couponCode: 'SAVE25' })).price.amountDue).toBe('0.00');
    expect((await enroll(request(discounted))).status).toBe(402);
    expectNoAcquisition();
  });
});

it('blocks revoked access in review, checkout, and paid recovery without creating payment', async () => {
  fixtures.enrollment.mockResolvedValue({ id: 'enrollment-1', revokedAt: new Date() });
  await expect(loadOrderReview('member-1', target)).rejects.toMatchObject({ status: 403 });
  expect((await checkout(request(target))).status).toBe(403);
  expect((await enroll(request({ ...target, paymentId: 'old-payment' }))).status).toBe(403);
  expectNoAcquisition();
});
