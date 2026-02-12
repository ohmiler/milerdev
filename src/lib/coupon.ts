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
