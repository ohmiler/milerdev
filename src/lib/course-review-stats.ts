import { and, avg, count, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';

export type CourseReviewStats = {
  avgRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

type CourseReviewStatsRow = {
  avgRating: number | string | null;
  totalReviews: number | string | null;
  star5: number | string | null;
  star4: number | string | null;
  star3: number | string | null;
  star2: number | string | null;
  star1: number | string | null;
};

function countValue(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function normalizeCourseReviewStats(
  row: CourseReviewStatsRow | undefined,
): CourseReviewStats {
  const average = Number(row?.avgRating ?? 0);

  return {
    avgRating: Number.isFinite(average) && average >= 1 && average <= 5 ? average : 0,
    totalReviews: countValue(row?.totalReviews),
    distribution: {
      5: countValue(row?.star5),
      4: countValue(row?.star4),
      3: countValue(row?.star3),
      2: countValue(row?.star2),
      1: countValue(row?.star1),
    },
  };
}

export async function getCourseReviewStats(
  courseId: string,
): Promise<CourseReviewStats> {
  const [row] = await db
    .select({
      avgRating: avg(reviews.rating),
      totalReviews: count(),
      star5: sql<number>`sum(case when ${reviews.rating} = 5 then 1 else 0 end)`,
      star4: sql<number>`sum(case when ${reviews.rating} = 4 then 1 else 0 end)`,
      star3: sql<number>`sum(case when ${reviews.rating} = 3 then 1 else 0 end)`,
      star2: sql<number>`sum(case when ${reviews.rating} = 2 then 1 else 0 end)`,
      star1: sql<number>`sum(case when ${reviews.rating} = 1 then 1 else 0 end)`,
    })
    .from(reviews)
    .where(and(
      eq(reviews.courseId, courseId),
      eq(reviews.isHidden, false),
      eq(reviews.isVerified, true),
    ));

  return normalizeCourseReviewStats(row);
}
