import { NextResponse } from 'next/server';
import { formatErrorResponse, logError } from './error-handler';

/**
 * Standardized API response utilities
 */

type SuccessResponse<T> = {
    success: true;
    data: T;
};

type ErrorResponse = {
    success: false;
    error: string;
    code?: string;
};

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Success response helpers
export function ok<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
    return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
}

// Error response helpers
export function badRequest(message: string, code?: string): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { success: false, error: message, code },
        { status: 400 }
    );
}

export function unauthorized(message: string = 'Unauthorized'): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { success: false, error: message, code: 'UNAUTHORIZED' },
        { status: 401 }
    );
}

export function forbidden(message: string = 'Forbidden'): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { success: false, error: message, code: 'FORBIDDEN' },
        { status: 403 }
    );
}

export function notFound(resource: string = 'Resource'): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { success: false, error: `${resource} not found`, code: 'NOT_FOUND' },
        { status: 404 }
    );
}

export function conflict(message: string): NextResponse<ErrorResponse> {
    return NextResponse.json(
        { success: false, error: message, code: 'CONFLICT' },
        { status: 409 }
    );
}

export function tooManyRequests(retryAfter?: number): NextResponse<ErrorResponse> {
    const headers: HeadersInit = {};
    if (retryAfter) {
        headers['Retry-After'] = String(retryAfter);
    }
    
    return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
        { status: 429, headers }
    );
}

export function serverError(
    error: unknown,
    context?: { userId?: string; action?: string }
): NextResponse<ErrorResponse> {
    // Log the error
    logError(
        error instanceof Error ? error : new Error(String(error)),
        context
    );

    const formatted = formatErrorResponse(error);
    
    return NextResponse.json(
        { success: false, error: formatted.error, code: formatted.code },
        { status: formatted.statusCode }
    );
}

// Wrapper for API route handlers with automatic error handling
export function apiHandler<T>(
    handler: () => Promise<NextResponse<ApiResponse<T>>>,
    context?: { userId?: string; action?: string }
): Promise<NextResponse<ApiResponse<T> | ErrorResponse>> {
    return handler().catch((error) => serverError(error, context));
}
