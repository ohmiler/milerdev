import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { reviews, users, courses } from '@/lib/db/schema';
import { desc, eq, sql, and, like, or } from 'drizzle-orm';

// GET /api/admin/reviews - Get all reviews
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

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
          courseSlug: courses.slug,
          courseStatus: courses.status,
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
          // SUM over zero rows is NULL; the page formats these as numbers.
          hidden: sql<number>`coalesce(sum(case when is_hidden = true then 1 else 0 end), 0)`,
          verified: sql<number>`coalesce(sum(case when is_verified = true then 1 else 0 end), 0)`,
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
      stats: {
        total: Number(statsResult[0]?.total ?? 0),
        avgRating: statsResult[0]?.avgRating == null ? null : Number(statsResult[0].avgRating),
        hidden: Number(statsResult[0]?.hidden ?? 0),
        verified: Number(statsResult[0]?.verified ?? 0),
      },
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'admin.reviews.fetch_failed' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
