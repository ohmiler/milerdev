import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const state = vi.hoisted(() => ({
    results: [] as unknown[][],
    whereArguments: [] as unknown[],
    insertValues: [] as Array<Record<string, unknown>>,
}));

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    logError: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-password'),
}));

function queryChain(result: unknown[]) {
    const promise = Promise.resolve(result);
    const chain: Record<string, unknown> = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        groupBy: vi.fn(() => chain),
        where: vi.fn((condition: unknown) => {
            state.whereArguments.push(condition);
            return chain;
        }),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        offset: vi.fn(() => chain),
        as: vi.fn(() => ({ userId: 'user_id', enrollmentCount: 'enrollment_count' })),
        then: promise.then.bind(promise),
    };
    return chain;
}

const dbMock = vi.hoisted(() => ({
    select: vi.fn((selection?: Record<string, unknown>) => {
        if (selection && 'userId' in selection && 'enrollmentCount' in selection) {
            return queryChain([]);
        }
        return queryChain(state.results.shift() ?? []);
    }),
    insert: vi.fn(() => ({
        values: vi.fn(async (values: Record<string, unknown>) => {
            state.insertValues.push(values);
        }),
    })),
}));

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/error-handler', () => ({ logError: mocks.logError }));
vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('bcryptjs', () => ({ default: { hash: mocks.hash } }));

const session = {
    user: { id: 'admin-a', role: 'admin', name: 'Admin', email: 'admin@example.com' },
    expires: '2026-07-25T00:00:00.000Z',
};

describe('Admin user lifecycle data contracts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.results = [];
        state.whereArguments = [];
        state.insertValues = [];
        mocks.requireAdmin.mockResolvedValue({ session });
    });

    it('rejects an invalid lifecycle filter before querying users', async () => {
        const route = await import('@/app/api/admin/users/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users?status=disabled'));

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: 'INVALID_FILTER' });
        expect(dbMock.select).not.toHaveBeenCalled();
    });

    it('returns lifecycle state, global lifecycle stats, and filtered pagination totals', async () => {
        const deactivatedAt = new Date('2026-07-20T00:00:00.000Z');
        state.results = [
            [{
                id: 'student-a',
                name: 'Student',
                email: 'student@example.com',
                role: 'student',
                avatarUrl: null,
                emailVerifiedAt: null,
                createdAt: new Date('2026-07-01T00:00:00.000Z'),
                deactivatedAt,
                enrollmentCount: 2,
            }],
            [{ count: 1 }],
            [{ total: 3, active: 2, inactive: 1, admins: 1, instructors: 0, students: 2 }],
        ];

        const route = await import('@/app/api/admin/users/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users?status=inactive'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.users).toEqual([
            expect.objectContaining({
                id: 'student-a',
                lifecycleStatus: 'inactive',
                deactivatedAt: deactivatedAt.toISOString(),
                enrollmentCount: 2,
            }),
        ]);
        expect(data.pagination).toMatchObject({ total: 1, totalPages: 1 });
        expect(data.stats).toMatchObject({ total: 3, active: 2, inactive: 1 });
        expect(state.whereArguments.filter(Boolean).length).toBeGreaterThanOrEqual(2);
    });

    it('returns a safe detail shape with lifecycle state and no auth internals', async () => {
        state.results = [[{
            id: 'student-a',
            name: 'Student',
            email: 'student@example.com',
            role: 'student',
            avatarUrl: null,
            emailVerifiedAt: null,
            createdAt: new Date('2026-07-01T00:00:00.000Z'),
            updatedAt: new Date('2026-07-20T00:00:00.000Z'),
            deactivatedAt: new Date('2026-07-19T00:00:00.000Z'),
        }]];

        const route = await import('@/app/api/admin/users/[id]/route');
        const response = await route.GET(
            new Request('http://localhost/api/admin/users/student-a'),
            { params: Promise.resolve({ id: 'student-a' }) },
        );
        const data = await response.json();

        expect(data.user).toMatchObject({ id: 'student-a', lifecycleStatus: 'inactive' });
        expect(data.user).not.toHaveProperty('passwordHash');
        expect(data.user).not.toHaveProperty('resetToken');
        expect(data.user).not.toHaveProperty('resetExpires');
        expect(data.user).not.toHaveProperty('sessionVersion');
    });

    it('exports lifecycle state and deactivation time', async () => {
        state.results = [[{
            id: 'student-a',
            name: 'Student',
            email: 'student@example.com',
            role: 'student',
            emailVerifiedAt: null,
            createdAt: new Date('2026-07-01T00:00:00.000Z'),
            deactivatedAt: new Date('2026-07-19T00:00:00.000Z'),
            enrollmentCount: 2,
        }]];

        const route = await import('@/app/api/admin/users/export/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users/export?status=inactive'));
        const csv = await response.text();

        expect(response.status).toBe(200);
        expect(csv).toContain('lifecycle_status,deactivated_at');
        expect(csv).toContain('inactive,2026-07-19T00:00:00.000Z');
    });

    it('rejects an invalid lifecycle export filter before reading users', async () => {
        const route = await import('@/app/api/admin/users/export/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users/export?status=disabled'));

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: 'INVALID_FILTER' });
        expect(dbMock.select).not.toHaveBeenCalled();
    });

    it('skips an existing inactive email during import without updating or inserting it', async () => {
        state.results = [[{
            id: 'student-a',
            deactivatedAt: new Date('2026-07-19T00:00:00.000Z'),
        }]];
        const form = new FormData();
        form.set('file', new File([
            'email,name,role\nstudent@example.com,Student,student',
        ], 'users.csv', { type: 'text/csv' }));

        const route = await import('@/app/api/admin/users/import/route');
        const response = await route.POST(new Request('http://localhost/api/admin/users/import', {
            method: 'POST',
            body: form,
        }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toMatchObject({ success: 0, skipped: 1, failed: 0 });
        expect(state.insertValues).toHaveLength(0);
    });

    it('short-circuits unauthorized list access', async () => {
        mocks.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        const route = await import('@/app/api/admin/users/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users'));

        expect(response.status).toBe(401);
        expect(dbMock.select).not.toHaveBeenCalled();
    });

    it('returns the stable generic failure shape when the list query fails', async () => {
        dbMock.select.mockImplementationOnce(() => {
            throw new Error('database unavailable');
        });
        const route = await import('@/app/api/admin/users/route');
        const response = await route.GET(new Request('http://localhost/api/admin/users'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: expect.any(String) });
        expect(data.error).not.toContain('database unavailable');
    });
});
