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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-real-ip') 
        || 'unknown';
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
