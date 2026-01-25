/**
 * Centralized error handling utilities
 * Ready for Sentry integration when needed
 */

type ErrorContext = {
    userId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
};

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
    const timestamp = new Date().toISOString();
    const errorInfo = {
        timestamp,
        message: error.message,
        stack: error.stack,
        ...context,
    };

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
        console.error('[Error]', JSON.stringify(errorInfo, null, 2));
    } else {
        // In production, log structured error
        console.error(JSON.stringify(errorInfo));
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
