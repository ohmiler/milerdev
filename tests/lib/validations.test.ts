import { describe, it, expect } from 'vitest';
import {
    createCourseSchema,
    updateCourseSchema,
    createCouponSchema,
    updateUserSchema,
    updatePaymentSchema,
    createAnnouncementSchema,
    createBundleSchema,
    createTagSchema,
    createBlogSchema,
    createLessonSchema,
    validateBody,
} from '@/lib/validations/admin';

describe('Admin Validation Schemas', () => {

    describe('createCourseSchema', () => {
        it('should accept valid course data', () => {
            const result = createCourseSchema.safeParse({
                title: 'React Fundamentals',
                description: 'Learn React from scratch',
                price: '1990',
                status: 'draft',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty title', () => {
            const result = createCourseSchema.safeParse({ title: '' });
            expect(result.success).toBe(false);
        });

        it('should reject missing title', () => {
            const result = createCourseSchema.safeParse({ description: 'No title' });
            expect(result.success).toBe(false);
        });

        it('should reject invalid status', () => {
            const result = createCourseSchema.safeParse({
                title: 'Test',
                status: 'invalid_status',
            });
            expect(result.success).toBe(false);
        });

        it('should accept price as number or string', () => {
            expect(createCourseSchema.safeParse({ title: 'Test', price: 1990 }).success).toBe(true);
            expect(createCourseSchema.safeParse({ title: 'Test', price: '1990' }).success).toBe(true);
        });

        it('should accept empty thumbnailUrl', () => {
            const result = createCourseSchema.safeParse({ title: 'Test', thumbnailUrl: '' });
            expect(result.success).toBe(true);
        });

        it('should reject title longer than 255 chars', () => {
            const result = createCourseSchema.safeParse({ title: 'x'.repeat(256) });
            expect(result.success).toBe(false);
        });
    });

    describe('updateCourseSchema', () => {
        it('should accept partial update (only title)', () => {
            const result = updateCourseSchema.safeParse({ title: 'New Title' });
            expect(result.success).toBe(true);
        });

        it('should accept empty object (no changes)', () => {
            const result = updateCourseSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should accept promoPrice field', () => {
            const result = updateCourseSchema.safeParse({ promoPrice: '990' });
            expect(result.success).toBe(true);
        });
    });

    describe('createCouponSchema', () => {
        it('should accept valid coupon', () => {
            const result = createCouponSchema.safeParse({
                code: 'SAVE50',
                discountType: 'percentage',
                discountValue: '50',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty code', () => {
            const result = createCouponSchema.safeParse({
                code: '',
                discountType: 'percentage',
                discountValue: '50',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid discountType', () => {
            const result = createCouponSchema.safeParse({
                code: 'TEST',
                discountType: 'half_price',
                discountValue: '50',
            });
            expect(result.success).toBe(false);
        });

        it('should reject code longer than 50 chars', () => {
            const result = createCouponSchema.safeParse({
                code: 'X'.repeat(51),
                discountType: 'fixed',
                discountValue: 100,
            });
            expect(result.success).toBe(false);
        });
    });

    describe('updateUserSchema', () => {
        it('should accept valid role change', () => {
            const result = updateUserSchema.safeParse({ role: 'admin' });
            expect(result.success).toBe(true);
        });

        it('should reject invalid role', () => {
            const result = updateUserSchema.safeParse({ role: 'superadmin' });
            expect(result.success).toBe(false);
        });

        it('should accept name update only', () => {
            const result = updateUserSchema.safeParse({ name: 'John Doe' });
            expect(result.success).toBe(true);
        });
    });

    describe('updatePaymentSchema', () => {
        it('should accept valid payment status', () => {
            expect(updatePaymentSchema.safeParse({ status: 'completed' }).success).toBe(true);
            expect(updatePaymentSchema.safeParse({ status: 'refunded' }).success).toBe(true);
        });

        it('should reject invalid payment status', () => {
            expect(updatePaymentSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
        });

        it('should reject missing status', () => {
            expect(updatePaymentSchema.safeParse({}).success).toBe(false);
        });
    });

    describe('createAnnouncementSchema', () => {
        it('should accept valid announcement', () => {
            const result = createAnnouncementSchema.safeParse({
                title: 'System Update',
                content: 'We will be performing maintenance.',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty content', () => {
            const result = createAnnouncementSchema.safeParse({
                title: 'Test',
                content: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid type', () => {
            const result = createAnnouncementSchema.safeParse({
                title: 'Test',
                content: 'Body',
                type: 'danger',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createBundleSchema', () => {
        it('should accept valid bundle', () => {
            const result = createBundleSchema.safeParse({
                title: 'Full Stack Bundle',
                price: '4990',
                courseIds: ['course-1', 'course-2'],
            });
            expect(result.success).toBe(true);
        });

        it('should reject bundle with less than 2 courses', () => {
            const result = createBundleSchema.safeParse({
                title: 'Solo Bundle',
                price: '1990',
                courseIds: ['course-1'],
            });
            expect(result.success).toBe(false);
        });

        it('should reject missing courseIds', () => {
            const result = createBundleSchema.safeParse({
                title: 'No Courses',
                price: '1990',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createTagSchema', () => {
        it('should accept valid tag', () => {
            expect(createTagSchema.safeParse({ name: 'React' }).success).toBe(true);
        });

        it('should reject empty tag name', () => {
            expect(createTagSchema.safeParse({ name: '' }).success).toBe(false);
        });

        it('should reject tag name over 100 chars', () => {
            expect(createTagSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
        });

        it('should trim whitespace', () => {
            const result = createTagSchema.safeParse({ name: '  React  ' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('React');
            }
        });
    });

    describe('createBlogSchema', () => {
        it('should accept valid blog post', () => {
            const result = createBlogSchema.safeParse({
                title: 'My First Post',
                content: '<p>Hello World</p>',
                status: 'draft',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid status', () => {
            const result = createBlogSchema.safeParse({
                title: 'Test',
                status: 'archived',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createLessonSchema', () => {
        it('should accept valid lesson', () => {
            const result = createLessonSchema.safeParse({
                title: 'Introduction to React',
                content: 'Learn the basics',
                isFreePreview: true,
            });
            expect(result.success).toBe(true);
        });

        it('should reject negative orderIndex', () => {
            const result = createLessonSchema.safeParse({
                title: 'Test',
                orderIndex: -1,
            });
            expect(result.success).toBe(false);
        });
    });

    describe('validateBody helper', () => {
        it('should return success with data on valid input', () => {
            const result = validateBody(createTagSchema, { name: 'React' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('React');
            }
        });

        it('should return error message on invalid input', () => {
            const result = validateBody(createTagSchema, { name: '' });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeTruthy();
                expect(typeof result.error).toBe('string');
            }
        });

        it('should return error on completely wrong input', () => {
            const result = validateBody(createCouponSchema, { random: 'data' });
            expect(result.success).toBe(false);
        });
    });
});
