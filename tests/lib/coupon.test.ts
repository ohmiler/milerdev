import { describe, it, expect } from 'vitest';
import { calculateDiscount, isCouponFullDiscount } from '@/lib/coupon';

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
    });
});
