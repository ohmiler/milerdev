import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter for middleware (edge-compatible)
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
if (typeof globalThis !== 'undefined') {
    const cleanup = () => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) rateLimitStore.delete(key);
        }
    };
    setInterval(cleanup, 5 * 60 * 1000);
}

export function middleware(request: NextRequest) {
    const ip = extractClientIP(request);
    const pathname = request.nextUrl.pathname;

    // Rate limit admin API: 60 requests per minute per IP
    if (pathname.startsWith('/api/admin')) {
        if (!middlewareRateLimit(`admin:${ip}`, 60, 60_000)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }
    }

    // Rate limit auth login: 10 requests per minute per IP
    if (pathname === '/api/auth/callback/credentials') {
        if (!middlewareRateLimit(`login:${ip}`, 10, 60_000)) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }
    }

    const response = NextResponse.next();

    // Security Headers
    const securityHeaders = {
        // Prevent XSS attacks
        'X-XSS-Protection': '1; mode=block',
        // Prevent clickjacking
        'X-Frame-Options': 'SAMEORIGIN',
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions policy
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // Content Security Policy
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://player.bunnycdn.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.stripe.com https://*.bunny.net https://*.bunnyinfra.net",
            "frame-src 'self' https://js.stripe.com https://*.bunny.net https://iframe.mediadelivery.net https://www.youtube.com https://player.vimeo.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    };

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // HSTS header (only in production)
    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }

    return response;
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        // Skip internal paths and static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
