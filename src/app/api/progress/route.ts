import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonProgress, lessons, enrollments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

// POST /api/progress - Update lesson progress
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lessonId, watchTimeSeconds, completed } = await request.json();

        // Get lesson to check course enrollment
        const lesson = await db.query.lessons.findFirst({
            where: eq(lessons.id, lessonId),
            with: {
                course: true,
            },
        });

        if (!lesson) {
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        // Check enrollment
        const enrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.userId, session.user.id),
                eq(enrollments.courseId, lesson.courseId)
            ),
        });

        if (!enrollment && !lesson.isFreePreview) {
            return NextResponse.json(
                { error: "Not enrolled in this course" },
                { status: 403 }
            );
        }

        // Update or create progress
        const existingProgress = await db.query.lessonProgress.findFirst({
            where: and(
                eq(lessonProgress.userId, session.user.id),
                eq(lessonProgress.lessonId, lessonId)
            ),
        });

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

        // Get all lesson progress for this course
        const courseLessons = await db.query.lessons.findMany({
            where: eq(lessons.courseId, courseId),
            with: {
                progress: {
                    where: eq(lessonProgress.userId, session.user.id),
                },
            },
        });

        const progressMap = courseLessons.map((lesson) => ({
            lessonId: lesson.id,
            completed: lesson.progress[0]?.completed || false,
            watchTimeSeconds: lesson.progress[0]?.watchTimeSeconds || 0,
        }));

        return NextResponse.json({ progress: progressMap });
    } catch (error) {
        console.error("Error getting progress:", error);
        return NextResponse.json(
            { error: "Failed to get progress" },
            { status: 500 }
        );
    }
}
