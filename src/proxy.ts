import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type ProxyGlobal = typeof globalThis & {
    __milerdevProxyCleanupStarted?: boolean;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const SERVER_ACTION_HEADER = 'next-action';
const GENERIC_AUTH_SIGNIN_PATH = '/api/auth/signin';
const proxyGlobal = globalThis as ProxyGlobal;
const baseSecurityHeaders: Record<string, string> = {
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const documentSecurityHeaders: Record<string, string> = {
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://player.bunnycdn.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.stripe.com https://*.bunny.net https://*.bunnyinfra.net",
        "frame-src 'self' https://js.stripe.com https://*.bunny.net https://iframe.mediadelivery.net https://www.youtube.com https://player.vimeo.com",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; '),
};

// Simple in-memory rate limiter for proxy
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function middlewareRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }
    entry.count++;
    return entry.count <= maxRequests;
}

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

    const bracketedIPv6 = value.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
    const withoutBrackets = bracketedIPv6 ? bracketedIPv6[1] : value;

    const ipv4WithPort = withoutBrackets.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    let candidate = ipv4WithPort ? ipv4WithPort[1] : withoutBrackets;

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

function extractClientIP(request: NextRequest): string {
    const directHeaders = ['cf-connecting-ip', 'x-real-ip', 'x-client-ip', 'fly-client-ip'];
    for (const header of directHeaders) {
        const ip = normalizeIP(request.headers.get(header));
        if (ip) {
            return ip;
        }
    }

    const forwarded = request.headers.get('x-forwarded-for');
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

    return 'unknown';
}

// Cleanup stale entries every 5 minutes
if (!proxyGlobal.__milerdevProxyCleanupStarted) {
    const cleanup = () => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) rateLimitStore.delete(key);
        }
    };
    setInterval(cleanup, RATE_LIMIT_CLEANUP_INTERVAL_MS);
    proxyGlobal.__milerdevProxyCleanupStarted = true;
}

function isDocumentRequest(request: NextRequest): boolean {
    const accept = request.headers.get('accept');
    return request.method === 'GET' && !!accept && accept.includes('text/html');
}

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
    Object.entries(baseSecurityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    if (isDocumentRequest(request)) {
        Object.entries(documentSecurityHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
    }

    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }

    return response;
}

function createRateLimitResponse(request: NextRequest, message: string): NextResponse {
    const response = NextResponse.json(
        { error: message },
        { status: 429 }
    );

    response.headers.set('Retry-After', String(RATE_LIMIT_WINDOW_MS / 1000));

    return applySecurityHeaders(request, response);
}

function isUnsupportedServerActionRequest(request: NextRequest): boolean {
    if (request.method !== 'POST') return false;

    // MilerDev does not define Server Actions. Mutations go through route
    // handlers/client fetch, so any next-action POST is either a scanner probe or
    // a stale browser tab from another deployment.
    return request.headers.has(SERVER_ACTION_HEADER);
}

function createInvalidServerActionResponse(request: NextRequest): NextResponse {
    const response = new NextResponse('Server action not found.', {
        status: 404,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-MilerDev-Blocked': 'invalid-server-action',
        },
    });

    return applySecurityHeaders(request, response);
}

function isUnsupportedAuthSigninPost(request: NextRequest, pathname: string): boolean {
    return request.method === 'POST' && pathname === GENERIC_AUTH_SIGNIN_PATH;
}

function createInvalidAuthSigninResponse(request: NextRequest): NextResponse {
    const response = new NextResponse('Invalid auth request.', {
        status: 400,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-MilerDev-Blocked': 'invalid-auth-signin',
        },
    });

    return applySecurityHeaders(request, response);
}

export function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const isAdminApiRoute = pathname.startsWith('/api/admin');
    const isCredentialsCallbackRoute = pathname === '/api/auth/callback/credentials';

    if (isUnsupportedServerActionRequest(request)) {
        return createInvalidServerActionResponse(request);
    }

    if (isUnsupportedAuthSigninPost(request, pathname)) {
        return createInvalidAuthSigninResponse(request);
    }

    // Rate limit admin API: 60 requests per minute per IP
    if (isAdminApiRoute) {
        const ip = extractClientIP(request);
        if (!middlewareRateLimit(`admin:${ip}`, 60, RATE_LIMIT_WINDOW_MS)) {
            return createRateLimitResponse(request, 'Too many requests. Please try again later.');
        }
    }

    // Rate limit auth login: 10 requests per minute per IP
    if (isCredentialsCallbackRoute) {
        const ip = extractClientIP(request);
        if (!middlewareRateLimit(`login:${ip}`, 10, RATE_LIMIT_WINDOW_MS)) {
            return createRateLimitResponse(request, 'Too many login attempts. Please try again later.');
        }
    }

    const response = NextResponse.next();

    return applySecurityHeaders(request, response);
}

// Configure which paths the proxy runs on
export const config = {
    matcher: [
        // Skip internal paths and static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
