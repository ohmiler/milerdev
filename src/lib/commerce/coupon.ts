/**
 * Calculate the discount amount for a coupon.
 * Pure function — no DB dependency, easy to test.
 */
export function calculateDiscount(
    coursePrice: number,
    discountType: 'percentage' | 'fixed',
    discountValue: string,
    maxDiscount?: string | null,
): number {
    let discount: number;

    if (discountType === 'percentage') {
        discount = coursePrice * (parseFloat(discountValue) / 100);
        const maxD = maxDiscount ? parseFloat(maxDiscount) : null;
        if (maxD && discount > maxD) discount = maxD;
    } else {
        discount = parseFloat(discountValue);
    }

    return discount;
}

/**
 * Validate a coupon's eligibility (pure logic, no DB calls).
 * Returns { valid, error } — caller provides DB-fetched coupon + usage count.
 */
export function validateCouponEligibility(
    coupon: {
        isActive: boolean | null;
        startsAt?: Date | null;
        expiresAt?: Date | null;
        courseId?: string | null;
        usageLimit?: number | null;
        usageCount?: number | null;
        perUserLimit?: number | null;
        minPurchase?: string | null;
    },
    opts: {
        targetCourseId?: string;
        userUsageCount: number;
        coursePrice: number;
    },
): { valid: boolean; error?: string } {
    if (!coupon.isActive) {
        return { valid: false, error: 'คูปองนี้ถูกปิดใช้งานแล้ว' };
    }
    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
        return { valid: false, error: 'คูปองนี้ยังไม่เริ่มใช้งาน' };
    }
    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
        return { valid: false, error: 'คูปองนี้หมดอายุแล้ว' };
    }
    if (coupon.courseId && opts.targetCourseId && coupon.courseId !== opts.targetCourseId) {
        return { valid: false, error: 'คูปองนี้ไม่สามารถใช้กับคอร์สนี้ได้' };
    }
    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        return { valid: false, error: 'คูปองนี้ถูกใช้ครบจำนวนแล้ว' };
    }
    if (coupon.perUserLimit && opts.userUsageCount >= coupon.perUserLimit) {
        return { valid: false, error: 'คุณใช้คูปองนี้ครบจำนวนแล้ว' };
    }
    const minPurchase = parseFloat(coupon.minPurchase || '0');
    if (opts.coursePrice < minPurchase) {
        return { valid: false, error: `คูปองนี้ใช้ได้กับราคาขั้นต่ำ ฿${minPurchase.toLocaleString()}` };
    }
    return { valid: true };
}

/**
 * Check if a coupon makes the course completely free.
 */
export function isCouponFullDiscount(
    coursePrice: number,
    discountType: 'percentage' | 'fixed',
    discountValue: string,
    maxDiscount?: string | null,
): boolean {
    const discount = calculateDiscount(coursePrice, discountType, discountValue, maxDiscount);
    return discount >= coursePrice;
}
