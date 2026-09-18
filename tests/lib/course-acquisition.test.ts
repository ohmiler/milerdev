import { describe, expect, it } from 'vitest';
import { resolveCourseAcquisition, type CourseAcquisitionStore } from '@/lib/course-acquisition';

class MemoryAcquisitionStore implements CourseAcquisitionStore {
  course: Awaited<ReturnType<CourseAcquisitionStore['readCourse']>> = {
    id: 'course-1', title: 'Course', slug: 'course', description: null, thumbnailUrl: null,
    status: 'published', price: '1000.00', promoPrice: null, promoStartsAt: null, promoEndsAt: null,
    lessons: [{ id: 'lesson-1' }],
  };
  coupon: Awaited<ReturnType<CourseAcquisitionStore['readCoupon']>> = {
    id: 'coupon-1', code: 'FREE', description: null, discountType: 'percentage', discountValue: '100',
    minPurchase: null, maxDiscount: null, usageLimit: null, usageCount: 0, perUserLimit: 1,
    courseId: null, isActive: true, startsAt: null, expiresAt: null, createdAt: null,
  };
  owners = new Set<string>();
  usage = new Map<string, number>();
  async readCourse(id: string) { return this.course?.id === id ? this.course : null; }
  async hasEnrollment(userId: string) { return this.owners.has(userId); }
  async readCoupon(selection: Parameters<CourseAcquisitionStore['readCoupon']>[0]) {
    return ('id' in selection ? this.coupon?.id === selection.id : this.coupon?.code === selection.code)
      ? this.coupon : null;
  }
  async readCouponUsage(userId: string) { return this.usage.get(userId) ?? 0; }
}

const target = { userId: 'member-1', courseId: 'course-1' };

describe('course acquisition with an in-memory adapter', () => {
  it('resolves coupon code and identity to the same decision without granting access', async () => {
    const store = new MemoryAcquisitionStore();
    const review = await resolveCourseAcquisition({ ...target, kind: 'review', couponCode: 'free' }, store);
    const enrollment = await resolveCourseAcquisition({ ...target, kind: 'enroll', couponId: 'coupon-1' }, store);
    expect(review).toEqual(enrollment);
    expect(review).toMatchObject({ kind: 'ready', action: 'enroll-free', price: { amountDue: '0.00' } });
    expect(store.owners.size).toBe(0);
    expect(store.usage.size).toBe(0);
  });

  it('uses the requesting member usage and never reuses a previous eligibility decision', async () => {
    const store = new MemoryAcquisitionStore();
    store.usage.set('another-member', 1);
    const request = { ...target, kind: 'enroll', couponId: 'coupon-1' } as const;
    expect(await resolveCourseAcquisition(request, store)).toMatchObject({ kind: 'ready', action: 'enroll-free' });
    store.usage.set('member-1', 1);
    expect(await resolveCourseAcquisition(request, store)).toMatchObject({ kind: 'invalid_coupon' });
    expect(await resolveCourseAcquisition({ ...request, userId: 'new-member' }, store)).toMatchObject({ kind: 'ready', action: 'enroll-free' });
  });

  it('does not substitute a different coupon when a requested identity is missing', async () => {
    const store = new MemoryAcquisitionStore();
    expect(await resolveCourseAcquisition({ ...target, kind: 'checkout', couponId: 'deleted' }, store))
      .toEqual({ kind: 'coupon_not_found' });
    expect(store.owners.size).toBe(0);
  });

  it.each(['-1.00', 'invalid'])('fails closed for corrupt pricing (%s) rather than granting free enrollment', async (price) => {
    const store = new MemoryAcquisitionStore();
    store.course = { ...store.course!, price };
    await expect(resolveCourseAcquisition({ ...target, kind: 'enroll' }, store)).rejects.toThrow(TypeError);
    expect(store.owners.size).toBe(0);
  });
});
