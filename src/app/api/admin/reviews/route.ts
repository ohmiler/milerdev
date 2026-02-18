import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { reviews, users, courses } from '@/lib/db/schema';
import { desc, eq, sql, and, like, or } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/reviews - Get all reviews
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const courseId = searchParams.get('courseId');
    const search = searchParams.get('search');
    const rating = searchParams.get('rating');
    const hidden = searchParams.get('hidden');
    const offset = (page - 1) * limit;

    const conditions = [];
    if (courseId && courseId !== 'all') {
      conditions.push(eq(reviews.courseId, courseId));
    }
    if (rating && rating !== 'all') {
      conditions.push(eq(reviews.rating, parseInt(rating)));
    }
    if (hidden === 'true') {
      conditions.push(eq(reviews.isHidden, true));
    } else if (hidden === 'false') {
      conditions.push(eq(reviews.isHidden, false));
    }
    if (search) {
      conditions.push(
        or(
          like(reviews.displayName, `%${search}%`),
          like(reviews.comment, `%${search}%`),
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(courses.title, `%${search}%`)
        )!
      );
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const [reviewList, totalResult, statsResult, coursesList] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          displayName: reviews.displayName,
          isVerified: reviews.isVerified,
          isHidden: reviews.isHidden,
          createdAt: reviews.createdAt,
          userId: reviews.userId,
          courseId: reviews.courseId,
          userName: users.name,
          userEmail: users.email,
          courseTitle: courses.title,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(courses, eq(reviews.courseId, courses.id))
        .where(whereCondition)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(courses, eq(reviews.courseId, courses.id))
        .where(whereCondition),
      db
        .select({
          total: sql<number>`count(*)`,
          avgRating: sql<number>`ROUND(AVG(rating), 1)`,
          hidden: sql<number>`sum(case when is_hidden = true then 1 else 0 end)`,
          verified: sql<number>`sum(case when is_verified = true then 1 else 0 end)`,
        })
        .from(reviews),
      db
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .orderBy(courses.title),
    ]);

    return NextResponse.json({
      reviews: reviewList,
      courses: coursesList,
      stats: statsResult[0],
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching reviews:' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/reviews - Import reviews (admin only)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { reviews: importReviews } = body;

    if (!Array.isArray(importReviews) || importReviews.length === 0) {
      return NextResponse.json({ error: 'No reviews to import' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const review of importReviews) {
      try {
        if (!review.courseId || !review.rating) {
          errors.push(`Skipped: missing courseId or rating`);
          skipped++;
          continue;
        }

        await db.insert(reviews).values({
          id: createId(),
          userId: review.userId || null,
          courseId: review.courseId,
          rating: Math.min(5, Math.max(1, Math.round(review.rating))),
          comment: review.comment || null,
          displayName: review.displayName || null,
          isVerified: review.isVerified ?? true,
          isHidden: false,
          createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
          updatedAt: new Date(),
        });
        imported++;
      } catch (err) {
        errors.push(`Failed to import review: ${(err as Error).message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} reviews, skipped ${skipped}`,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error importing reviews:' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
