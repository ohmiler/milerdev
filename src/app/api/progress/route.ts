import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonProgress, lessons, enrollments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { issueCertificate } from "@/lib/certificate";

// POST /api/progress - Update lesson progress
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lessonId, watchTimeSeconds, completed } = await request.json();

        // Get lesson
        const [lesson] = await db
            .select()
            .from(lessons)
            .where(eq(lessons.id, lessonId))
            .limit(1);

        if (!lesson) {
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        // Check enrollment
        const [enrollment] = await db
            .select()
            .from(enrollments)
            .where(
                and(
                    eq(enrollments.userId, session.user.id),
                    eq(enrollments.courseId, lesson.courseId)
                )
            )
            .limit(1);

        if (!enrollment && !lesson.isFreePreview) {
            return NextResponse.json(
                { error: "Not enrolled in this course" },
                { status: 403 }
            );
        }

        // Update or create progress
        const [existingProgress] = await db
            .select()
            .from(lessonProgress)
            .where(
                and(
                    eq(lessonProgress.userId, session.user.id),
                    eq(lessonProgress.lessonId, lessonId)
                )
            )
            .limit(1);

        if (existingProgress) {
            await db
                .update(lessonProgress)
                .set({
                    watchTimeSeconds: watchTimeSeconds || existingProgress.watchTimeSeconds,
                    completed: completed ?? existingProgress.completed,
                    lastWatchedAt: new Date(),
                })
                .where(eq(lessonProgress.id, existingProgress.id));
        } else {
            await db.insert(lessonProgress).values({
                userId: session.user.id,
                lessonId,
                watchTimeSeconds: watchTimeSeconds || 0,
                completed: completed || false,
                lastWatchedAt: new Date(),
            });
        }

        // Calculate and update course progress
        if (enrollment) {
            const [{ totalLessons }] = await db
                .select({ totalLessons: count() })
                .from(lessons)
                .where(eq(lessons.courseId, lesson.courseId));

            const [{ completedLessons }] = await db
                .select({ completedLessons: count() })
                .from(lessonProgress)
                .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
                .where(
                    and(
                        eq(lessonProgress.userId, session.user.id),
                        eq(lessons.courseId, lesson.courseId),
                        eq(lessonProgress.completed, true)
                    )
                );

            const progressPercent = Math.round((completedLessons / totalLessons) * 100);

            await db
                .update(enrollments)
                .set({
                    progressPercent,
                    completedAt: progressPercent === 100 ? new Date() : null,
                })
                .where(eq(enrollments.id, enrollment.id));

            // Auto-issue certificate on course completion
            if (progressPercent === 100) {
                try {
                    const { certificate, isNew } = await issueCertificate(session.user.id, lesson.courseId);
                    if (isNew) {
                        console.log('[Certificate] Issued:', certificate.certificateCode, 'for user:', session.user.id);
                    }
                } catch (certError) {
                    console.error('[Certificate] Error issuing:', certError);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating progress:", error);
        return NextResponse.json(
            { error: "Failed to update progress" },
            { status: 500 }
        );
    }
}

// GET /api/progress?courseId=xxx - Get course progress
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");

        if (!courseId) {
            return NextResponse.json(
                { error: "Course ID required" },
                { status: 400 }
            );
        }

        // Get all lessons for this course
        const courseLessons = await db
            .select({ id: lessons.id })
            .from(lessons)
            .where(eq(lessons.courseId, courseId));

        // Get progress for these lessons
        const userProgress = await db
            .select({
                lessonId: lessonProgress.lessonId,
                completed: lessonProgress.completed,
                watchTimeSeconds: lessonProgress.watchTimeSeconds,
            })
            .from(lessonProgress)
            .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
            .where(
                and(
                    eq(lessonProgress.userId, session.user.id),
                    eq(lessons.courseId, courseId)
                )
            );

        const progressLookup = new Map(userProgress.map(p => [p.lessonId, p]));

        const progressMap = courseLessons.map((lesson) => {
            const p = progressLookup.get(lesson.id);
            return {
                lessonId: lesson.id,
                completed: p?.completed || false,
                watchTimeSeconds: p?.watchTimeSeconds || 0,
            };
        });

        return NextResponse.json({ progress: progressMap });
    } catch (error) {
        console.error("Error getting progress:", error);
        return NextResponse.json(
            { error: "Failed to get progress" },
            { status: 500 }
        );
    }
}
