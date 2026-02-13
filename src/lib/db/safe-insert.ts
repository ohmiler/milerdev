import { db } from '@/lib/db';
import { enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

/**
 * Check if a MySQL error is a duplicate key error (ER_DUP_ENTRY).
 */
export function isDuplicateKeyError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message || '';
        return msg.includes('Duplicate entry') || msg.includes('ER_DUP_ENTRY') || msg.includes('UNIQUE constraint');
    }
    return false;
}

/**
 * Safely insert an enrollment, handling concurrent duplicate attempts.
 * Returns { created: boolean, enrollment } — if duplicate, returns existing.
 */
export async function safeInsertEnrollment(userId: string, courseId: string): Promise<{
    created: boolean;
    enrollment: { id: string; userId: string; courseId: string };
}> {
    try {
        const enrollmentId = createId();
        await db.insert(enrollments).values({
            id: enrollmentId,
            userId,
            courseId,
        });
        return { created: true, enrollment: { id: enrollmentId, userId, courseId } };
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            // Another request won the race — return existing enrollment
            const existing = await db.query.enrollments.findFirst({
                where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
            });
            if (existing) {
                return { created: false, enrollment: { id: existing.id, userId, courseId } };
            }
        }
        throw error; // Re-throw non-duplicate errors
    }
}
