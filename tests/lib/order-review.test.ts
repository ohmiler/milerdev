import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOrderReview } from '@/lib/order-review';

const mocks = vi.hoisted(() => ({ course: vi.fn(), bundle: vi.fn(), enrollment: vi.fn(), coupon: vi.fn(), select: vi.fn(), insert: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: { courses: { findFirst: mocks.course }, bundles: { findFirst: mocks.bundle }, enrollments: { findFirst: mocks.enrollment }, coupons: { findFirst: mocks.coupon } }, select: mocks.select, insert: mocks.insert } }));
const results: unknown[][] = [];
function chain(rows: unknown[]) {
  const query: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'innerJoin', 'groupBy']) query[method] = () => query;
  query.then = (resolve: (rows: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
  return query;
}
const course = { id: 'course-1', slug: 'thai-course', title: 'คอร์สภาษาไทย', status: 'published', price: '1500.00', promoPrice: '1000.00', promoStartsAt: null, promoEndsAt: null, lessons: [{ id: 'lesson-1' }] };
const coupon = { id: 'coupon-1', code: 'SAVE25', description: null, isActive: true, startsAt: null, expiresAt: null, courseId: null, usageLimit: null, usageCount: 0, perUserLimit: 1, minPurchase: null, discountType: 'percentage', discountValue: '25', maxDiscount: null };

beforeEach(() => {
  vi.clearAllMocks(); results.length = 0;
  mocks.course.mockResolvedValue(course); mocks.enrollment.mockResolvedValue(undefined); mocks.coupon.mockResolvedValue(coupon);
  mocks.select.mockImplementation(() => chain(results.shift() ?? []));
});

describe('server order review', () => {
  it('derives current promotion and coupon breakdown without writing payment or enrollment', async () => {
    results.push([{ count: 0 }]);
    const review = await loadOrderReview('member-1', { courseId: 'course-1', couponCode: 'save25' });
    expect(review.price).toEqual({ original: '1000.00', discount: '250.00', amountDue: '750.00', currency: 'THB' });
    expect(review.target.title).toBe('คอร์สภาษาไทย');
    expect(review.action).toBe('pay');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('uses regular price after the promotion ends', async () => {
    mocks.course.mockResolvedValue({ ...course, promoEndsAt: new Date('2000-01-01') });
    expect((await loadOrderReview('member-1', { courseId: 'course-1' })).price.amountDue).toBe('1500.00');
  });

  it('keeps an exact satang amount', async () => {
    mocks.course.mockResolvedValue({ ...course, promoPrice: '990.25' });
    expect((await loadOrderReview('member-1', { courseId: 'course-1' })).price.amountDue).toBe('990.25');
  });

  it.each([
    [{ expiresAt: new Date('2000-01-01') }, 'คูปองนี้หมดอายุแล้ว'],
    [{ courseId: 'another-course' }, 'คูปองนี้ไม่สามารถใช้กับคอร์สนี้ได้'],
    [{ isActive: false }, 'คูปองนี้ถูกปิดใช้งานแล้ว'],
  ])('rejects invalid coupon eligibility', async (changes, message) => {
    mocks.coupon.mockResolvedValue({ ...coupon, ...changes });
    await expect(loadOrderReview('member-1', { courseId: 'course-1', couponCode: 'SAVE25' })).rejects.toThrow(message);
  });

  it('directs a 100% coupon to explicit free enrollment without granting it', async () => {
    mocks.coupon.mockResolvedValue({ ...coupon, discountValue: '100' });
    const result = await loadOrderReview('member-1', { courseId: 'course-1', couponCode: 'FREE' });
    expect(result.action).toBe('enroll-free');
    expect(result.price.amountDue).toBe('0.00');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('prevents an owned course or an unready course from opening payment', async () => {
    mocks.enrollment.mockResolvedValue({ id: 'enrollment-1' });
    expect((await loadOrderReview('member-1', { courseId: 'course-1' })).action).toBe('owned');
    mocks.enrollment.mockResolvedValue(undefined);
    mocks.course.mockResolvedValue({ ...course, lessons: [] });
    expect((await loadOrderReview('member-1', { courseId: 'course-1' })).action).toBe('unavailable');
  });

  it('keeps the full Bundle price and discloses partial ownership from current facts', async () => {
    mocks.bundle.mockResolvedValue({ id: 'bundle-1', slug: 'thai-bundle', title: 'ชุดคอร์ส', price: '1200.00' });
    results.push([{ course, orderIndex: 0 }, { course: { ...course, id: 'course-2' }, orderIndex: 1 }], [{ courseId: 'course-1', count: 1 }, { courseId: 'course-2', count: 1 }], [{ courseId: 'course-1' }]);
    const result = await loadOrderReview('member-1', { bundleId: 'bundle-1' });
    expect(result.price.amountDue).toBe('1200.00');
    expect(result.access.ownedCount).toBe(1);
    expect(result.access.description).toContain('ราคาชุดไม่หักมูลค่าคอร์สที่มีอยู่');
    expect(result.comparison?.separate).toBe('2000.00');
  });
});
