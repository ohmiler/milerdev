import { createHmac } from 'node:crypto';

import {
    cleanupExpiredRateLimitBuckets,
    consumeRateLimitBucket,
    type ConsumeRateLimitBucketInput,
    type RateLimitBucketState,
} from '@/lib/auth-rate-limit-store';

type AuthRateLimitInput = {
    namespace: string;
    identifier: string;
    maxRequests: number;
    windowMs: number;
};

export type AuthRateLimitResult = {
    success: boolean;
    remaining: number;
    resetTime: number;
};

type AuthRateLimitDependencies = {
    secret: string | undefined;
    consumeBucket: (input: ConsumeRateLimitBucketInput) => Promise<RateLimitBucketState>;
    cleanupExpiredBuckets: () => Promise<void>;
};

const defaultDependencies: AuthRateLimitDependencies = {
    secret: process.env.AUTH_SECRET,
    consumeBucket: consumeRateLimitBucket,
    cleanupExpiredBuckets: cleanupExpiredRateLimitBuckets,
};

function unavailable(): Error {
    return new Error('Auth rate limiter unavailable');
}

export function createRateLimitKey(
    namespace: string,
    identifier: string,
    secret: string | undefined
): string {
    if (!namespace || !identifier || !secret) throw unavailable();

    return createHmac('sha256', secret)
        .update(namespace)
        .update('\0')
        .update(identifier)
        .digest('hex');
}

export async function consumeAuthRateLimit(
    input: AuthRateLimitInput,
    dependencies: AuthRateLimitDependencies = defaultDependencies
): Promise<AuthRateLimitResult> {
    if (
        !Number.isSafeInteger(input.maxRequests)
        || input.maxRequests <= 0
        || !Number.isSafeInteger(input.windowMs)
        || input.windowMs <= 0
    ) {
        throw unavailable();
    }

    try {
        const keyHash = createRateLimitKey(
            input.namespace,
            input.identifier,
            dependencies.secret
        );
        const bucket = await dependencies.consumeBucket({
            keyHash,
            windowMs: input.windowMs,
        });

        if (
            !Number.isSafeInteger(bucket.count)
            || bucket.count < 1
            || !Number.isSafeInteger(bucket.resetTime)
            || bucket.resetTime <= 0
        ) {
            throw unavailable();
        }

        await dependencies.cleanupExpiredBuckets().catch(() => undefined);

        return {
            success: bucket.count <= input.maxRequests,
            remaining: Math.max(0, input.maxRequests - bucket.count),
            resetTime: bucket.resetTime,
        };
    } catch {
        throw unavailable();
    }
}

export function authRateLimitUnavailableResponse(): Response {
    return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable.' }),
        {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60',
            },
        }
    );
}
