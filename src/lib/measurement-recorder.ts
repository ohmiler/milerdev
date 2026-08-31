import { count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { requireReadyBundleCourses } from '@/lib/bundle-commerce';
import { requireCourseHasLessons } from '@/lib/course-availability';
import { db } from '@/lib/db';
import {
  analyticsEvents,
  bundleCourses,
  bundles,
  courses,
  lessons,
} from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

export type ProductType = 'course' | 'bundle';
type ProductStatus = 'draft' | 'published' | 'archived';

const productExposureFactSchema = z.object({
  exposureId: z.string().uuid().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ),
  productType: z.enum(['course', 'bundle']),
  productId: z.string().trim().min(1).max(36),
}).strict();

export type ProductEligibility =
  | {
    productType: 'course';
    productId: string;
    status: ProductStatus;
    lessonCount: number;
  }
  | {
    productType: 'bundle';
    productId: string;
    status: ProductStatus;
    courses: Array<{
      id: string;
      status: ProductStatus;
      lessonCount: number;
    }>;
  };

export type ProductExposureRow = {
  exposureId: string;
  eventName: 'course_viewed' | 'bundle_viewed';
  courseId: string | null;
  bundleId: string | null;
  placement: 'course_detail' | 'bundle_detail';
};

export interface MeasurementStore {
  readProductEligibility(
    productType: ProductType,
    productId: string,
  ): Promise<ProductEligibility | null>;
  insertProductExposure(row: ProductExposureRow): Promise<'inserted' | 'duplicate'>;
}

export interface MeasurementRecorder {
  recordProductExposure(fact: {
    exposureId: string;
    productType: ProductType;
    productId: string;
  }): Promise<{ status: 'recorded' | 'duplicate' | 'disabled' | 'ineligible' }>;
}

export class MeasurementRecorderError extends Error {
  constructor(readonly code: 'INVALID_FACT') {
    super(code);
    this.name = 'MeasurementRecorderError';
  }
}

function isEligibleProduct(eligibility: ProductEligibility | null): boolean {
  if (!eligibility || eligibility.status !== 'published') return false;

  try {
    if (eligibility.productType === 'course') {
      requireCourseHasLessons(eligibility.lessonCount);
    } else {
      requireReadyBundleCourses(eligibility.courses);
    }
    return true;
  } catch {
    return false;
  }
}

export function createMeasurementRecorder(input: {
  store: MeasurementStore;
  isEventEnabled(eventName: ProductExposureRow['eventName']): Promise<boolean>;
}): MeasurementRecorder {
  return {
    async recordProductExposure(fact) {
      const parsed = productExposureFactSchema.safeParse(fact);
      if (!parsed.success) throw new MeasurementRecorderError('INVALID_FACT');

      const eventName = parsed.data.productType === 'course' ? 'course_viewed' : 'bundle_viewed';
      if (!(await input.isEventEnabled(eventName))) return { status: 'disabled' };

      const eligibility = await input.store.readProductEligibility(
        parsed.data.productType,
        parsed.data.productId,
      );
      if (!isEligibleProduct(eligibility)) return { status: 'ineligible' };

      const inserted = await input.store.insertProductExposure({
        exposureId: parsed.data.exposureId,
        eventName,
        courseId: parsed.data.productType === 'course' ? parsed.data.productId : null,
        bundleId: parsed.data.productType === 'bundle' ? parsed.data.productId : null,
        placement: parsed.data.productType === 'course' ? 'course_detail' : 'bundle_detail',
      });
      return { status: inserted === 'inserted' ? 'recorded' : 'duplicate' };
    },
  };
}

const drizzleMeasurementStore: MeasurementStore = {
  async readProductEligibility(productType, productId) {
    if (productType === 'course') {
      const [row] = await db
        .select({
          productId: courses.id,
          status: courses.status,
          lessonCount: count(lessons.id),
        })
        .from(courses)
        .leftJoin(lessons, eq(lessons.courseId, courses.id))
        .where(eq(courses.id, productId))
        .groupBy(courses.id, courses.status)
        .limit(1);
      return row ? { productType: 'course', ...row } : null;
    }

    const [bundleRows, courseRows] = await Promise.all([
      db
        .select({ productId: bundles.id, status: bundles.status })
        .from(bundles)
        .where(eq(bundles.id, productId))
        .limit(1),
      db
        .select({
          id: courses.id,
          status: courses.status,
          lessonCount: count(lessons.id),
        })
        .from(bundleCourses)
        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
        .leftJoin(lessons, eq(lessons.courseId, courses.id))
        .where(eq(bundleCourses.bundleId, productId))
        .groupBy(courses.id, courses.status),
    ]);
    const bundle = bundleRows[0];
    return bundle ? { productType: 'bundle', ...bundle, courses: courseRows } : null;
  },

  async insertProductExposure(row) {
    try {
      await db.insert(analyticsEvents).values({
        exposureId: row.exposureId,
        eventName: row.eventName,
        source: 'client',
        userId: null,
        courseId: row.courseId,
        bundleId: row.bundleId,
        paymentId: null,
        metadata: JSON.stringify({ placement: row.placement }),
        ipAddress: null,
        userAgent: null,
      });
      return 'inserted';
    } catch (error) {
      if (isDuplicateKeyError(error)) return 'duplicate';
      throw error;
    }
  },
};

export const measurementRecorder = createMeasurementRecorder({
  store: drizzleMeasurementStore,
  isEventEnabled: isAnalyticsEventEnabled,
});
