import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { rateLimitBuckets } from '@/lib/db/schema';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const EXPIRED_RETENTION_HOURS = 24;
const CLEANUP_BATCH_SIZE = 500;

let nextCleanupAt = 0;

export type ConsumeRateLimitBucketInput = {
    keyHash: string;
    windowMs: number;
};

export type RateLimitBucketState = {
    count: number;
    resetTime: number;
};

export async function consumeRateLimitBucket({
    keyHash,
    windowMs,
}: ConsumeRateLimitBucketInput): Promise<RateLimitBucketState> {
    const windowMicros = windowMs * 1000;

    return db.transaction(async (transaction) => {
        await transaction
            .insert(rateLimitBuckets)
            .values({
                keyHash,
                count: 1,
                resetAt: sql`DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ${windowMicros} MICROSECOND)`,
            })
            .onDuplicateKeyUpdate({
                set: {
                    count: sql`IF(${rateLimitBuckets.resetAt} <= UTC_TIMESTAMP(3), 1, ${rateLimitBuckets.count} + 1)`,
                    resetAt: sql`IF(${rateLimitBuckets.resetAt} <= UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ${windowMicros} MICROSECOND), ${rateLimitBuckets.resetAt})`,
                },
            });

        const [bucket] = await transaction
            .select({
                count: rateLimitBuckets.count,
                resetTime: sql<string>`CAST(UNIX_TIMESTAMP(${rateLimitBuckets.resetAt}) * 1000 AS UNSIGNED)`,
            })
            .from(rateLimitBuckets)
            .where(eq(rateLimitBuckets.keyHash, keyHash))
            .for('update');

        if (!bucket) {
            throw new Error('Rate limit bucket missing after atomic update');
        }

        return {
            count: bucket.count,
            resetTime: Number(bucket.resetTime),
        };
    });
}

export async function cleanupExpiredRateLimitBuckets(): Promise<void> {
    const now = Date.now();
    if (now < nextCleanupAt) return;

    nextCleanupAt = now + CLEANUP_INTERVAL_MS;

    await db.execute(sql`
        DELETE FROM ${rateLimitBuckets}
        WHERE ${rateLimitBuckets.resetAt} < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${EXPIRED_RETENTION_HOURS} HOUR)
        LIMIT ${CLEANUP_BATCH_SIZE}
    `);
}
