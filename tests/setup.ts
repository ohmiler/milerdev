import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.AUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock next/headers
vi.mock('next/headers', () => ({
    headers: () => new Map(),
    cookies: () => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    }),
}));

// Mock next-auth
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        query: {
            courses: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
            },
            enrollments: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
            },
        },
    },
}));
