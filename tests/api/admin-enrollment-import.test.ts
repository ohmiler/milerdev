import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * POST /api/admin/enrollments/import grants enrollments in bulk from a LearnDash CSV.
 * It is an explicit-admin-intent path that bypasses payment, so these tests pin which rows
 * become enrollments. KNOWN DEFECT marks behavior that is documented, not endorsed.
 */

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    logAudit: vi.fn(),
    users: [] as Array<{ id: string; email: string }>,
    courses: [] as Array<{ id: string; title: string }>,
    existing: [] as Array<{ userId: string; courseId: string }>,
    inserted: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', async () => {
    const schema = await import('@/lib/db/schema');
    const rowsFor = (table: unknown) => {
        if (table === schema.users) return mocks.users;
        if (table === schema.courses) return mocks.courses;
        if (table === schema.enrollments) return mocks.existing;
        throw new Error('unexpected table');
    };
    return {
        db: {
            select: () => ({ from: async (table: unknown) => rowsFor(table) }),
            insert: (table: unknown) => ({
                values: async (values: Record<string, unknown>) => {
                    if (table !== schema.enrollments) throw new Error('unexpected insert');
                    mocks.inserted.push(values);
                },
            }),
        },
    };
});

import { POST } from '@/app/api/admin/enrollments/import/route';

const HEADER = 'user_email,course_title,activity_started,activity_completed,activity_status';

function upload(csv: string | null) {
    const form = new FormData();
    if (csv !== null) form.append('file', new File([csv], 'enrollments.csv', { type: 'text/csv' }));
    return POST(new Request('http://localhost/api/admin/enrollments/import', { method: 'POST', body: form }));
}

describe('POST /api/admin/enrollments/import', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.users = [
            { id: 'user-a', email: 'a@example.test' },
            { id: 'user-b', email: 'b@example.test' },
        ];
        mocks.courses = [
            { id: 'course-react', title: 'React Fundamentals' },
            { id: 'course-django', title: 'Django for Beginners' },
        ];
        mocks.existing = [];
        mocks.inserted = [];
        mocks.requireAdmin.mockResolvedValue({ session: { user: { id: 'admin-a', role: 'admin' } } });
    });

    it('rejects a request without a file, without rows, or without the required columns', async () => {
        expect((await upload(null)).status).toBe(400);
        expect((await upload(HEADER)).status).toBe(400);
        expect((await upload('email_address,title\na@example.test,React Fundamentals')).status).toBe(400);
        expect(mocks.inserted).toEqual([]);
    });

    it('grants one enrollment per matched learner and course, matching email case-insensitively', async () => {
        const res = await upload([
            HEADER,
            'A@Example.TEST,React Fundamentals,1767225600,0,0',
            'b@example.test,react fundamentals,,,',
        ].join('\n'));

        expect(res.status).toBe(200);
        expect(mocks.inserted.map((row) => [row.userId, row.courseId])).toEqual([
            ['user-a', 'course-react'],
            ['user-b', 'course-react'],
        ]);
        expect(mocks.inserted[0]).toMatchObject({
            enrolledAt: new Date(1767225600 * 1000),
            progressPercent: 0,
            completedAt: null,
        });
        expect((await res.json()).results).toMatchObject({ success: 2, skipped: 0, total: 2 });
    });

    it('carries completion from the CSV without issuing anything else', async () => {
        await upload([HEADER, 'a@example.test,React Fundamentals,1767225600,1767312000,1'].join('\n'));

        expect(mocks.inserted).toEqual([expect.objectContaining({
            progressPercent: 100,
            completedAt: new Date(1767312000 * 1000),
        })]);
    });

    it('skips unknown learners, unknown courses, existing enrollments, and repeated rows', async () => {
        mocks.existing = [{ userId: 'user-b', courseId: 'course-react' }];

        const res = await upload([
            HEADER,
            'ghost@example.test,React Fundamentals,,,',
            'ghost@example.test,Django for Beginners,,,',
            'a@example.test,Rust in Production,,,',
            'b@example.test,React Fundamentals,,,',
            'a@example.test,React Fundamentals,,,',
            'a@example.test,React Fundamentals,,,',
        ].join('\n'));

        expect(mocks.inserted.map((row) => [row.userId, row.courseId])).toEqual([['user-a', 'course-react']]);
        expect((await res.json()).results).toMatchObject({
            success: 1,
            skipped: 5,
            userNotFound: 1,
            courseNotFound: 1,
            missingUsers: ['ghost@example.test'],
            missingCourses: ['Rust in Production'],
        });
    });

    it('grants a different course whose title merely contains the CSV title (KNOWN DEFECT: substring matching)', async () => {
        // "Go" is not a course here, but "django for beginners" contains "go".
        const res = await upload([HEADER, 'a@example.test,Go,,,'].join('\n'));

        expect(mocks.inserted).toEqual([expect.objectContaining({ userId: 'user-a', courseId: 'course-django' })]);
        expect((await res.json()).results.matchedAliases).toEqual(['"Go" → "Django for Beginners"']);
    });

    it('writes no audit entry for a bulk grant (KNOWN DEFECT: the single grant route audits)', async () => {
        await upload([HEADER, 'a@example.test,React Fundamentals,,,'].join('\n'));

        expect(mocks.inserted).toHaveLength(1);
        expect(mocks.logAudit).not.toHaveBeenCalled();
    });
});
