import { z } from 'zod';

import {
    COURSE_CONTENT_ITEM_MAX,
    COURSE_CONTENT_LIST_MAX,
    COURSE_SUMMARY_MAX,
} from '@/lib/courses/content';
import { normalizeImageUrl } from '@/lib/url';

// Accepts exactly what course pages can display (see normalizeImageUrl): full http(s) URLs,
// URLs that older uploads saved without a scheme, and site-relative paths. Saves the
// normalized form, so a legacy value is repaired on the next save instead of blocking it.
const imageUrlSchema = (label: string) => z.string()
    .max(2000, `${label}ยาวเกิน 2,000 ตัวอักษร`)
    .transform((value, ctx) => {
        if (!value.trim()) return '';
        const normalized = normalizeImageUrl(value);
        if (!normalized) {
            ctx.addIssue({
                code: 'custom',
                message: `${label}ไม่ใช่ลิงก์รูปภาพที่ใช้ได้ กรุณาอัปโหลดรูปใหม่หรือกดลบรูป แล้วบันทึกอีกครั้ง`,
            });
            return z.NEVER;
        }
        return normalized;
    });

// Course validation
export const createCourseSchema = z.object({
    title: z.string().min(1, 'กรุณาระบุชื่อคอร์ส').max(255, 'ชื่อคอร์สยาวเกิน 255 ตัวอักษร'),
    description: z.string().max(50000, 'คำอธิบายยาวเกิน 50,000 ตัวอักษร').optional().nullable(),
    price: z.union([z.string(), z.number()]).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    thumbnailUrl: imageUrlSchema('รูปภาพปก').optional().nullable(),
    slug: z.string().max(255, 'Slug ยาวเกิน 255 ตัวอักษร').optional().nullable(),
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

const courseContentListSchema = (label: string) => z.array(
    z.string().max(COURSE_CONTENT_ITEM_MAX, `${label}แต่ละข้อยาวเกิน ${COURSE_CONTENT_ITEM_MAX} ตัวอักษร`),
).max(COURSE_CONTENT_LIST_MAX, `${label}ใส่ได้ไม่เกิน ${COURSE_CONTENT_LIST_MAX} ข้อ`).optional().nullable();

export const updateCourseSchema = createCourseSchema.omit({ status: true }).partial().extend({
    previewVideoUrl: z.string().max(2000, 'ลิงก์วิดีโอแนะนำยาวเกิน 2,000 ตัวอักษร').optional().nullable().or(z.literal('')),
    promoPrice: z.union([z.string(), z.number()]).optional().nullable(),
    promoStartsAt: promoTimeSchema,
    promoEndsAt: promoTimeSchema,
    certificateHeaderImage: z.string().max(2000, 'ลิงก์รูป Header ใบรับรองยาวเกิน 2,000 ตัวอักษร').optional().nullable().or(z.literal('')),
    certificateBadge: z.string().max(50).optional().nullable(),
    instructorId: z.string().min(1).max(36).optional().nullable(),
    summary: z.string().max(COURSE_SUMMARY_MAX, `คำโปรยยาวเกิน ${COURSE_SUMMARY_MAX} ตัวอักษร`).optional().nullable(),
    learningOutcomes: courseContentListSchema('สิ่งที่ผู้เรียนจะได้'),
    targetAudience: courseContentListSchema('กลุ่มผู้เรียนที่เหมาะ'),
    prerequisites: courseContentListSchema('สิ่งที่ควรรู้ก่อนเรียน'),
    prerequisiteCourseId: z.string().min(1).max(36).optional().nullable(),
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

// Course structure validation
const courseRowIdSchema = z.string().min(1).max(36);

export const courseStructureSchema = z.object({
    unsectionedLessonIds: z.array(courseRowIdSchema).max(1000),
    sections: z.array(z.object({
        id: courseRowIdSchema,
        lessonIds: z.array(courseRowIdSchema).max(1000),
    }).strict()).max(200),
}).strict();

export const courseSectionSchema = z.object({
    title: z.string().trim().min(1, 'กรุณาระบุชื่อหมวด').max(255),
}).strict();

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

// The public instructor card on a course page. Links open from a public page, so only https.
export const adminInstructorProfileSchema = z.object({
    headline: z.string().trim().max(160, 'ตำแหน่งยาวเกิน 160 ตัวอักษร').nullable(),
    bio: z.string().trim().max(1000, 'ประวัติยาวเกิน 1,000 ตัวอักษร').nullable(),
    profileLinks: z.array(z.object({
        label: z.string().trim().min(1, 'กรุณาระบุชื่อลิงก์').max(40, 'ชื่อลิงก์ยาวเกิน 40 ตัวอักษร'),
        url: z.string().trim().max(500, 'ลิงก์ยาวเกิน 500 ตัวอักษร').refine((value) => {
            try {
                return new URL(value).protocol === 'https:';
            } catch {
                return false;
            }
        }, 'ลิงก์ต้องขึ้นต้นด้วย https://'),
    }).strict()).max(4, 'ใส่ลิงก์ได้ไม่เกิน 4 ลิงก์'),
}).strict();

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
