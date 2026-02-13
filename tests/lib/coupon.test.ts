import { describe, it, expect } from 'vitest';
import { calculateDiscount, isCouponFullDiscount, validateCouponEligibility } from '@/lib/coupon';

describe('Coupon Business Logic', () => {
    describe('calculateDiscount', () => {
        // Percentage discount
        it('should calculate percentage discount correctly', () => {
            expect(calculateDiscount(1000, 'percentage', '10')).toBe(100);
            expect(calculateDiscount(1000, 'percentage', '50')).toBe(500);
            expect(calculateDiscount(1000, 'percentage', '100')).toBe(1000);
        });

        it('should handle percentage with maxDiscount cap', () => {
            // 50% of 1000 = 500, but capped at 200
            expect(calculateDiscount(1000, 'percentage', '50', '200')).toBe(200);
        });

        it('should not cap when maxDiscount is higher than calculated discount', () => {
            // 10% of 1000 = 100, maxDiscount 500 — no cap needed
            expect(calculateDiscount(1000, 'percentage', '10', '500')).toBe(100);
        });

        it('should handle maxDiscount as null', () => {
            expect(calculateDiscount(1000, 'percentage', '50', null)).toBe(500);
        });

        // Fixed discount
        it('should calculate fixed discount correctly', () => {
            expect(calculateDiscount(1000, 'fixed', '100')).toBe(100);
            expect(calculateDiscount(1000, 'fixed', '1000')).toBe(1000);
            expect(calculateDiscount(1000, 'fixed', '1500')).toBe(1500); // over price is allowed
        });

        it('should ignore maxDiscount for fixed type', () => {
            expect(calculateDiscount(1000, 'fixed', '500', '200')).toBe(500);
        });

        // Edge cases
        it('should handle zero price', () => {
            expect(calculateDiscount(0, 'percentage', '50')).toBe(0);
            expect(calculateDiscount(0, 'fixed', '100')).toBe(100);
        });

        it('should handle decimal prices', () => {
            expect(calculateDiscount(299.5, 'percentage', '10')).toBeCloseTo(29.95);
        });

        it('should handle string discount values with decimals', () => {
            expect(calculateDiscount(1000, 'percentage', '33.33')).toBeCloseTo(333.3);
            expect(calculateDiscount(1000, 'fixed', '199.99')).toBeCloseTo(199.99);
        });
    });

    describe('isCouponFullDiscount', () => {
        it('should return true for 100% coupon', () => {
            expect(isCouponFullDiscount(1000, 'percentage', '100')).toBe(true);
        });

        it('should return true for fixed discount >= price', () => {
            expect(isCouponFullDiscount(1000, 'fixed', '1000')).toBe(true);
            expect(isCouponFullDiscount(1000, 'fixed', '1500')).toBe(true);
        });

        it('should return false for partial percentage discount', () => {
            expect(isCouponFullDiscount(1000, 'percentage', '50')).toBe(false);
        });

        it('should return false for partial fixed discount', () => {
            expect(isCouponFullDiscount(1000, 'fixed', '500')).toBe(false);
        });

        it('should return false when maxDiscount caps below price', () => {
            // 100% of 1000 = 1000, but capped at 500
            expect(isCouponFullDiscount(1000, 'percentage', '100', '500')).toBe(false);
        });

        it('should return true for free course (price 0)', () => {
            expect(isCouponFullDiscount(0, 'percentage', '10')).toBe(true);
        });

        // Edge case: promo price + coupon
        it('should return true for fixed coupon covering promo price', () => {
            // Course promo ฿990, coupon fixed ฿1000 → free
            expect(isCouponFullDiscount(990, 'fixed', '1000')).toBe(true);
        });

        it('should return false for fixed coupon not covering promo price', () => {
            // Course promo ฿990, coupon fixed ฿500 → not free
            expect(isCouponFullDiscount(990, 'fixed', '500')).toBe(false);
        });
    });

    describe('validateCouponEligibility', () => {
        const baseCoupon = {
            isActive: true,
            startsAt: null,
            expiresAt: null,
            courseId: null,
            usageLimit: null,
            usageCount: 0,
            perUserLimit: null,
            minPurchase: null,
        };
        const baseOpts = { targetCourseId: 'course-1', userUsageCount: 0, coursePrice: 1000 };

        // isActive
        it('should reject inactive coupon', () => {
            const result = validateCouponEligibility({ ...baseCoupon, isActive: false }, baseOpts);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('ปิดใช้งาน');
        });

        it('should reject null isActive', () => {
            const result = validateCouponEligibility({ ...baseCoupon, isActive: null }, baseOpts);
            expect(result.valid).toBe(false);
        });

        it('should accept active coupon', () => {
            const result = validateCouponEligibility(baseCoupon, baseOpts);
            expect(result.valid).toBe(true);
        });

        // Date range
        it('should reject coupon that has not started yet', () => {
            const tomorrow = new Date(Date.now() + 86400000);
            const result = validateCouponEligibility({ ...baseCoupon, startsAt: tomorrow }, baseOpts);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('ยังไม่เริ่ม');
        });

        it('should reject expired coupon', () => {
            const yesterday = new Date(Date.now() - 86400000);
            const result = validateCouponEligibility({ ...baseCoupon, expiresAt: yesterday }, baseOpts);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('หมดอายุ');
        });

        it('should accept coupon within date range', () => {
            const yesterday = new Date(Date.now() - 86400000);
            const tomorrow = new Date(Date.now() + 86400000);
            const result = validateCouponEligibility(
                { ...baseCoupon, startsAt: yesterday, expiresAt: tomorrow },
                baseOpts,
            );
            expect(result.valid).toBe(true);
        });

        it('should accept coupon with no date restrictions', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, startsAt: null, expiresAt: null },
                baseOpts,
            );
            expect(result.valid).toBe(true);
        });

        // Course restriction
        it('should reject coupon for wrong course', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, courseId: 'course-99' },
                { ...baseOpts, targetCourseId: 'course-1' },
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('ไม่สามารถใช้กับคอร์สนี้');
        });

        it('should accept coupon for matching course', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, courseId: 'course-1' },
                { ...baseOpts, targetCourseId: 'course-1' },
            );
            expect(result.valid).toBe(true);
        });

        it('should accept global coupon (no courseId) for any course', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, courseId: null },
                { ...baseOpts, targetCourseId: 'course-1' },
            );
            expect(result.valid).toBe(true);
        });

        // Usage limits
        it('should reject coupon when total usage limit reached', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, usageLimit: 10, usageCount: 10 },
                baseOpts,
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('ครบจำนวน');
        });

        it('should accept coupon when under total usage limit', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, usageLimit: 10, usageCount: 9 },
                baseOpts,
            );
            expect(result.valid).toBe(true);
        });

        it('should accept coupon with no usage limit', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, usageLimit: null, usageCount: 999 },
                baseOpts,
            );
            expect(result.valid).toBe(true);
        });

        // Per-user limit
        it('should reject coupon when per-user limit reached', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, perUserLimit: 1 },
                { ...baseOpts, userUsageCount: 1 },
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('คุณใช้คูปองนี้ครบ');
        });

        it('should accept coupon when under per-user limit', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, perUserLimit: 3 },
                { ...baseOpts, userUsageCount: 2 },
            );
            expect(result.valid).toBe(true);
        });

        it('should accept coupon with no per-user limit', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, perUserLimit: null },
                { ...baseOpts, userUsageCount: 100 },
            );
            expect(result.valid).toBe(true);
        });

        // Minimum purchase
        it('should reject coupon when course price below minPurchase', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, minPurchase: '2000' },
                { ...baseOpts, coursePrice: 1000 },
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('ราคาขั้นต่ำ');
        });

        it('should accept coupon when course price meets minPurchase', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, minPurchase: '500' },
                { ...baseOpts, coursePrice: 1000 },
            );
            expect(result.valid).toBe(true);
        });

        it('should accept coupon when minPurchase is null', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, minPurchase: null },
                { ...baseOpts, coursePrice: 1 },
            );
            expect(result.valid).toBe(true);
        });

        // Combined: multiple conditions
        it('should reject expired coupon even if everything else is valid', () => {
            const result = validateCouponEligibility(
                { ...baseCoupon, expiresAt: new Date(Date.now() - 1000), usageLimit: 100, usageCount: 0 },
                { ...baseOpts, userUsageCount: 0 },
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('หมดอายุ');
        });

        // Edge case: promo price + coupon combined
        it('should validate against promo price (not original)', () => {
            // Course: original ฿1990, promo ฿990, coupon minPurchase ฿500
            // Should pass because promo price ฿990 >= minPurchase ฿500
            const result = validateCouponEligibility(
                { ...baseCoupon, minPurchase: '500' },
                { ...baseOpts, coursePrice: 990 }, // promo price, not original
            );
            expect(result.valid).toBe(true);
        });

        it('should reject when promo price below minPurchase', () => {
            // Course: promo ฿200, coupon minPurchase ฿500
            const result = validateCouponEligibility(
                { ...baseCoupon, minPurchase: '500' },
                { ...baseOpts, coursePrice: 200 },
            );
            expect(result.valid).toBe(false);
        });

        it('should accept coupon when all conditions are met', () => {
            const result = validateCouponEligibility(
                {
                    ...baseCoupon,
                    startsAt: new Date(Date.now() - 86400000),
                    expiresAt: new Date(Date.now() + 86400000),
                    courseId: 'course-1',
                    usageLimit: 100,
                    usageCount: 50,
                    perUserLimit: 3,
                    minPurchase: '500',
                },
                { targetCourseId: 'course-1', userUsageCount: 1, coursePrice: 1990 },
            );
            expect(result.valid).toBe(true);
        });
    });
});
