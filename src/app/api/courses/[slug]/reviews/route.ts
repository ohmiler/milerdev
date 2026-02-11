import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reviews, courses, users, enrollments } from '@/lib/db/schema';
import { eq, and, desc, sql, avg, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/courses/[slug]/reviews - Get reviews for a course (public)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sort') || 'latest';
    const filterRating = searchParams.get('rating');
    const offset = (page - 1) * limit;

    // Find course by slug
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Build conditions - only show non-hidden reviews
    const conditions = [
      eq(reviews.courseId, course.id),
      eq(reviews.isHidden, false),
    ];

    if (filterRating) {
      conditions.push(eq(reviews.rating, parseInt(filterRating)));
    }

    const whereCondition = and(...conditions);

    // Sort
    const orderBy = sortBy === 'highest' 
      ? desc(reviews.rating)
      : sortBy === 'lowest'
        ? reviews.rating
        : desc(reviews.createdAt);

    const [reviewList, totalResult, statsResult] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          displayName: reviews.displayName,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          userName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(whereCondition),
      db
        .select({
          avgRating: avg(reviews.rating),
          totalReviews: count(),
          star5: sql<number>`sum(case when rating = 5 then 1 else 0 end)`,
          star4: sql<number>`sum(case when rating = 4 then 1 else 0 end)`,
          star3: sql<number>`sum(case when rating = 3 then 1 else 0 end)`,
          star2: sql<number>`sum(case when rating = 2 then 1 else 0 end)`,
          star1: sql<number>`sum(case when rating = 1 then 1 else 0 end)`,
        })
        .from(reviews)
        .where(and(eq(reviews.courseId, course.id), eq(reviews.isHidden, false))),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const stats = statsResult[0];

    return NextResponse.json({
      reviews: reviewList.map(r => ({
        ...r,
        displayName: r.displayName || r.userName || 'ผู้ใช้',
      })),
      stats: {
        avgRating: stats?.avgRating ? parseFloat(String(stats.avgRating)) : 0,
        totalReviews: stats?.totalReviews ?? 0,
        distribution: {
          5: stats?.star5 ?? 0,
          4: stats?.star4 ?? 0,
          3: stats?.star3 ?? 0,
          2: stats?.star2 ?? 0,
          1: stats?.star1 ?? 0,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/courses/[slug]/reviews - Create a review (enrolled users only)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`review:${session.user.id}`, rateLimits.sensitive);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime);
    }

    const { slug } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'กรุณาให้คะแนน 1-5 ดาว' }, { status: 400 });
    }

    // Find course
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบคอร์ส' }, { status: 404 });
    }

    // Check enrollment
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, session.user.id!),
        eq(enrollments.courseId, course.id)
      ))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'คุณต้องลงทะเบียนเรียนก่อนจึงจะรีวิวได้' }, { status: 403 });
    }

    // Check if already reviewed
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(
        eq(reviews.userId, session.user.id!),
        eq(reviews.courseId, course.id)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'คุณรีวิวคอร์สนี้แล้ว' }, { status: 409 });
    }

    // Get user name
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id!))
      .limit(1);

    const newReview = {
      id: createId(),
      userId: session.user.id!,
      courseId: course.id,
      rating: Math.round(rating),
      comment: comment?.trim() || null,
      displayName: user?.name || null,
      isVerified: true,
      isHidden: false,
    };

    await db.insert(reviews).values(newReview);

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
