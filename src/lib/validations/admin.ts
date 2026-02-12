import { z } from 'zod';

// Course validation
export const createCourseSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุชื่อคอร์ส').max(255),
    description: z.string().max(50000).optional().nullable(),
    price: z.union([z.string(), z.number()]).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    thumbnailUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
    slug: z.string().max(255).optional().nullable(),
    tagIds: z.array(z.string()).optional(),
    certificateColor: z.string().max(20).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
    previewVideoUrl: z.string().max(2000).optional().nullable().or(z.literal('')),
    promoPrice: z.union([z.string(), z.number()]).optional().nullable(),
    promoStartsAt: z.string().optional().nullable(),
    promoEndsAt: z.string().optional().nullable(),
    certificateHeaderImage: z.string().max(2000).optional().nullable().or(z.literal('')),
    certificateBadge: z.string().max(50).optional().nullable(),
});

// Lesson validation
export const createLessonSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุชื่อบทเรียน').max(255),
    content: z.string().max(100000).optional().nullable(),
    videoUrl: z.string().max(2000).optional().nullable().or(z.literal('')),
    videoDuration: z.union([z.string(), z.number()]).optional(),
    orderIndex: z.number().int().min(0).optional(),
    isFreePreview: z.boolean().optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

// User validation
export const updateUserSchema = z.object({
    name: z.string().max(255).optional(),
    role: z.enum(['student', 'instructor', 'admin']).optional(),
});

// Payment validation
export const updatePaymentSchema = z.object({
    status: z.enum(['pending', 'completed', 'failed', 'refunded']),
});

// Coupon validation
export const createCouponSchema = z.object({
    code: z.string().min(1, 'กรุณาระบุรหัสคูปอง').max(50),
    description: z.string().max(500).optional().nullable(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.union([z.string(), z.number()]),
    minPurchase: z.union([z.string(), z.number()]).optional().nullable(),
    maxDiscount: z.union([z.string(), z.number()]).optional().nullable(),
    usageLimit: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().optional(),
    courseId: z.string().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
});

export const updateCouponSchema = createCouponSchema.partial().extend({
    isActive: z.boolean().optional(),
});

// Announcement validation
export const createAnnouncementSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุหัวข้อ').max(255),
    content: z.string().min(1, 'กรุณาระบุเนื้อหา').max(50000),
    type: z.enum(['info', 'warning', 'success', 'error']).optional(),
    targetRole: z.enum(['all', 'student', 'instructor', 'admin']).optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Bundle validation
export const createBundleSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุชื่อ Bundle').max(255),
    description: z.string().max(50000).optional().nullable(),
    price: z.union([z.string(), z.number()]),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    thumbnailUrl: z.string().max(2000).optional().nullable().or(z.literal('')),
    slug: z.string().max(255).optional().nullable(),
    courseIds: z.array(z.string()).min(2, 'Bundle ต้องมีอย่างน้อย 2 คอร์ส'),
});

export const updateBundleSchema = createBundleSchema.partial();

// Tag validation
export const createTagSchema = z.object({
    name: z.string().min(1, 'กรุณาระบุชื่อแท็ก').max(100).trim(),
});

// Blog validation
export const createBlogSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุชื่อบทความ').max(255),
    slug: z.string().max(255).optional().nullable(),
    excerpt: z.string().max(500).optional().nullable(),
    content: z.string().max(200000).optional().nullable(),
    thumbnailUrl: z.string().max(2000).optional().nullable().or(z.literal('')),
    status: z.enum(['draft', 'published']).optional(),
    tagIds: z.array(z.string()).optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

/**
 * Helper to validate request body with a Zod schema.
 * Returns { data, error } — if error, return it as NextResponse.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(body);
    if (!result.success) {
        return { success: false, error: result.error.issues[0].message };
    }
    return { success: true, data: result.data };
}
