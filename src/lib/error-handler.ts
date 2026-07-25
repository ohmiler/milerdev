/**
 * Centralized error handling utilities
 * Ready for Sentry integration when needed
 */

type ErrorContext = {
    action?: string;
};

type LogLevel = 'info' | 'warn' | 'error';

function normalizeLogLabel(value: string | undefined, fallback: string): string {
    return value && /^[a-zA-Z0-9._:-]{1,100}$/.test(value)
        ? value
        : fallback;
}

export function logEvent(event: string, level: LogLevel = 'info'): void {
    const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event: normalizeLogLabel(event, 'application.event'),
    });

    if (level === 'error') {
        console.error(payload);
    } else if (level === 'warn') {
        console.warn(payload);
    } else {
        console.log(payload);
    }
}

// Custom application error class
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code?: string,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error types
export const errors = {
    unauthorized: (message = 'Unauthorized') => 
        new AppError(message, 401, 'UNAUTHORIZED'),
    
    forbidden: (message = 'Forbidden') => 
        new AppError(message, 403, 'FORBIDDEN'),
    
    notFound: (resource = 'Resource') => 
        new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
    
    badRequest: (message = 'Bad request') => 
        new AppError(message, 400, 'BAD_REQUEST'),
    
    conflict: (message = 'Conflict') => 
        new AppError(message, 409, 'CONFLICT'),
    
    rateLimited: (message = 'Too many requests') => 
        new AppError(message, 429, 'RATE_LIMITED'),
    
    internal: (message = 'Internal server error') => 
        new AppError(message, 500, 'INTERNAL_ERROR', false),
};

// Log error (can be extended to send to Sentry)
export function logError(error: Error, context?: ErrorContext): void {
    const productionErrorInfo = {
        timestamp: new Date().toISOString(),
        level: 'error',
        event: normalizeLogLabel(context?.action, 'application.error'),
        errorType: normalizeLogLabel(error.name, 'Error'),
    };

    if (process.env.NODE_ENV === 'development') {
        console.error('[Error]', JSON.stringify({
            ...productionErrorInfo,
            message: error.message,
            stack: error.stack,
        }, null, 2));
    } else {
        console.error(JSON.stringify(productionErrorInfo));
    }

    // TODO: Add Sentry integration
    // if (process.env.SENTRY_DSN) {
    //     Sentry.captureException(error, {
    //         extra: context,
    //     });
    // }
}

// Format error for API response
export function formatErrorResponse(error: unknown): {
    error: string;
    code?: string;
    statusCode: number;
} {
    if (error instanceof AppError) {
        return {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
        };
    }

    if (error instanceof Error) {
        // Don't expose internal error details in production
        const message = process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Internal server error';
        
        return {
            error: message,
            statusCode: 500,
        };
    }

    return {
        error: 'Unknown error occurred',
        statusCode: 500,
    };
}

// Async error wrapper for API routes
export function withErrorHandling<T>(
    handler: () => Promise<T>,
    context?: ErrorContext
): Promise<T> {
    return handler().catch((error) => {
        logError(error instanceof Error ? error : new Error(String(error)), context);
        throw error;
    });
}
