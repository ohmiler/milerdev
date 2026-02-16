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
function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) return false;
        const value = Number(part);
        return value >= 0 && value <= 255;
    });
}

function isValidIPv6(ip: string): boolean {
    if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
    if (ip.includes(':::')) return false;

    const parts = ip.split(':');
    if (ip.includes('::')) {
        if (parts.length > 8) return false;
    } else if (parts.length !== 8) {
        return false;
    }

    return parts.every((part) => part === '' || /^[0-9a-fA-F]{1,4}$/.test(part));
}

function normalizeIP(raw: string | null | undefined): string | null {
    if (!raw) return null;

    const value = raw.trim().replace(/^for=/i, '').replace(/^"|"$/g, '');
    if (!value || value.toLowerCase() === 'unknown') return null;

    // [IPv6]:port
    const bracketedIPv6 = value.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
    const withoutBrackets = bracketedIPv6 ? bracketedIPv6[1] : value;

    // IPv4:port
    const ipv4WithPort = withoutBrackets.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    let candidate = ipv4WithPort ? ipv4WithPort[1] : withoutBrackets;

    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (candidate.toLowerCase().startsWith('::ffff:')) {
        const mapped = candidate.slice(7);
        if (isValidIPv4(mapped)) {
            return mapped;
        }
    }

    if (isValidIPv4(candidate)) {
        return candidate;
    }

    candidate = candidate.toLowerCase();
    if (isValidIPv6(candidate)) {
        return candidate;
    }

    return null;
}

export function getClientIPFromHeaders(headers: Pick<Headers, 'get'>): string {
    // Prefer single-IP headers set by trusted edge/load balancer when available
    const directHeaders = ['cf-connecting-ip', 'x-real-ip', 'x-client-ip', 'fly-client-ip'];
    for (const header of directHeaders) {
        const ip = normalizeIP(headers.get(header));
        if (ip) {
            return ip;
        }
    }

    // For X-Forwarded-For chains, use the right-most valid IP
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        const forwardedParts = forwarded
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);

        for (let i = forwardedParts.length - 1; i >= 0; i--) {
            const ip = normalizeIP(forwardedParts[i]);
            if (ip) {
                return ip;
            }
        }
    }

    return "unknown";
}

export function getClientIP(request: Request): string {
    return getClientIPFromHeaders(request.headers);
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
