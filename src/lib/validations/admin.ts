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

// Promotion times must carry their offset (the editor sends Thai time as an ISO instant), so
// the server never guesses a time zone. A form from before this rule gets a reload prompt.
const isoInstantSchema = z.iso.datetime({ offset: true });
const promoTimeSchema = z.string()
    .refine((value) => value === '' || isoInstantSchema.safeParse(value).success, {
        message: 'เวลาโปรโมชั่นไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง',
    })
    .optional()
    .nullable();

export const updateCourseSchema = createCourseSchema.omit({ status: true }).partial().extend({
    previewVideoUrl: z.string().max(2000).optional().nullable().or(z.literal('')),
    promoPrice: z.union([z.string(), z.number()]).optional().nullable(),
    promoStartsAt: promoTimeSchema,
    promoEndsAt: promoTimeSchema,
    certificateHeaderImage: z.string().max(2000).optional().nullable().or(z.literal('')),
    certificateBadge: z.string().max(50).optional().nullable(),
    instructorId: z.string().min(1).max(36).optional().nullable(),
}).strict().refine(
    ({ promoStartsAt, promoEndsAt }) => !promoStartsAt || !promoEndsAt
        || new Date(promoEndsAt).getTime() > new Date(promoStartsAt).getTime(),
    { message: 'เวลาสิ้นสุดโปรโมชั่นต้องอยู่หลังเวลาเริ่มต้น', path: ['promoEndsAt'] },
);

export const adminCourseLifecycleSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('archive'),
        expectedStatus: z.enum(['draft', 'published']),
    }).strict(),
    z.object({
        action: z.literal('restore'),
        expectedStatus: z.literal('archived'),
    }).strict(),
    z.object({
        action: z.literal('publish'),
        expectedStatus: z.literal('draft'),
    }).strict(),
]);

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

const adminUserIdSchema = z.string().min(1).max(36);
const adminUserIdsSchema = z.array(adminUserIdSchema)
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, 'userIds ต้องไม่ซ้ำกัน');

export const adminUserUpdateSchema = updateUserSchema
    .strict()
    .refine(
        ({ name, role }) => name !== undefined || role !== undefined,
        'กรุณาระบุข้อมูลที่ต้องการแก้ไข',
    );

export const adminUserLifecycleSchema = z.object({
    action: z.enum(['deactivate', 'reactivate']),
}).strict();

export const adminUserLifecycleFilterSchema = z.enum(['all', 'active', 'inactive']);

export const adminBulkUserActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.enum(['delete', 'deactivate', 'reactivate']),
        userIds: adminUserIdsSchema,
    }).strict(),
    z.object({
        action: z.literal('updateRole'),
        userIds: adminUserIdsSchema,
        data: z.object({
            role: z.enum(['student', 'instructor', 'admin']),
        }).strict(),
    }).strict(),
]);

// Payment validation
export const updatePaymentSchema = z.object({
    status: z.enum(['pending', 'completed', 'failed', 'refunded']),
});

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
