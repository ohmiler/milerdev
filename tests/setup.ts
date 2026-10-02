import { vi } from 'vitest';

// Testing Library gives findBy*/waitFor 1s by default. Role queries and dynamic imports can
// take longer than that when the whole suite runs in parallel, which made component tests
// fail on a loaded machine and pass on rerun. A test that is correct returns as soon as its
// condition holds, so a longer ceiling only affects tests that would have failed.
if (typeof document !== 'undefined') {
    const { configure } = await import('@testing-library/dom');
    configure({ asyncUtilTimeout: 5_000 });
}

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
