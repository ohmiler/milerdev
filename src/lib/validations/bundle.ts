import { z } from 'zod';

const bundlePriceSchema = z.union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value >= 0, 'Invalid price')
  .transform((value) => value.toFixed(2));

export const adminBundleMutationSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().max(255).optional(),
  description: z.string().max(100_000).nullish(),
  thumbnailUrl: z.string().max(2_000).nullish(),
  price: bundlePriceSchema,
  status: z.enum(['draft', 'published', 'archived']),
  courseIds: z.array(z.string().min(1).max(36)).min(2),
}).strict().superRefine((value, context) => {
  if (new Set(value.courseIds).size !== value.courseIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['courseIds'],
      message: 'Duplicate course IDs are not allowed',
    });
  }
});
