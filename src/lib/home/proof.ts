// Real evidence Home may show: verified reviews, and whether any published course has a practice quiz.
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { courses, lessonQuizQuestions, lessons, reviews, users } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';

export interface HomeReview {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  courseTitle: string;
  courseSlug: string;
}

const HOME_REVIEW_LIMIT = 3;
const HOME_REVIEW_MIN_RATING = 4;

/**
 * The best recent reviews that the course page already shows publicly: verified, not hidden,
 * with a written comment, on a published course. Named the same way the course page names them.
 */
export async function getHomeReviews(): Promise<HomeReview[]> {
  try {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        displayName: reviews.displayName,
        userName: users.name,
        courseTitle: courses.title,
        courseSlug: courses.slug,
      })
      .from(reviews)
      .innerJoin(courses, eq(reviews.courseId, courses.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(
        eq(reviews.isVerified, true),
        eq(reviews.isHidden, false),
        eq(courses.status, 'published'),
        gte(reviews.rating, HOME_REVIEW_MIN_RATING),
        sql`trim(coalesce(${reviews.comment}, '')) <> ''`,
      ))
      .orderBy(desc(reviews.rating), desc(reviews.createdAt))
      .limit(HOME_REVIEW_LIMIT);

    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: (row.comment ?? '').trim(),
      reviewerName: row.displayName || row.userName || 'ผู้ใช้',
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
    }));
  } catch (error) {
    logError(error, { action: 'home.reviews.load_failed' });
    return [];
  }
}

/** Home only mentions practice quizzes once a learner could actually meet one. */
export async function hasPublishedLessonQuiz(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: lessonQuizQuestions.id })
      .from(lessonQuizQuestions)
      .innerJoin(lessons, eq(lessonQuizQuestions.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(eq(courses.status, 'published'))
      .limit(1);
    return Boolean(row);
  } catch (error) {
    logError(error, { action: 'home.quiz_presence.load_failed' });
    return false;
  }
}
