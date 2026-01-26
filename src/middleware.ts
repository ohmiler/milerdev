import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.stripe.com https://*.bunny.net",
            "frame-src 'self' https://js.stripe.com https://*.bunny.net",
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
