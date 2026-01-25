/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solution
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (entry.resetTime < now) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

interface RateLimitConfig {
    maxRequests: number;  // Maximum requests allowed
    windowMs: number;     // Time window in milliseconds
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const entry = rateLimitMap.get(key);

    // If no entry exists or window has expired, create new entry
    if (!entry || entry.resetTime < now) {
        rateLimitMap.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetTime: now + config.windowMs,
        };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.maxRequests) {
        return {
            success: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    return {
        success: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
        return realIP;
    }
    return "unknown";
}

// Pre-configured rate limiters for common use cases
export const rateLimits = {
    // Auth endpoints: 5 requests per minute
    auth: { maxRequests: 5, windowMs: 60 * 1000 },
    
    // API endpoints: 30 requests per minute
    api: { maxRequests: 30, windowMs: 60 * 1000 },
    
    // Sensitive endpoints (payment, etc.): 10 requests per minute
    sensitive: { maxRequests: 10, windowMs: 60 * 1000 },
    
    // General: 100 requests per minute
    general: { maxRequests: 100, windowMs: 60 * 1000 },
};

/**
 * Create rate limit response
 */
export function rateLimitResponse(resetTime: number) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    return new Response(
        JSON.stringify({ 
            error: "Too many requests. Please try again later.",
            retryAfter,
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(retryAfter),
            },
        }
    );
}
