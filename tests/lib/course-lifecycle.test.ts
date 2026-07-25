import { describe, expect, it } from 'vitest';

import {
    CourseLifecycleError,
    createCourseLifecycleService,
    type CourseLifecycleAuditEntry,
    type CourseLifecycleRecord,
    type CourseLifecycleStore,
    type CourseLifecycleTransaction,
    type CourseStatus,
    type PublishedBundleReference,
} from '@/lib/course-lifecycle';

const auditContext = { ipAddress: null, userAgent: 'vitest' };

class InMemoryCourseLifecycleStore implements CourseLifecycleStore {
    course: CourseLifecycleRecord | null;
    activeAdmins = new Set(['admin-a']);
    publishedBundles: PublishedBundleReference[] = [];
    audits: CourseLifecycleAuditEntry[] = [];
    linkedRows = {
        lessons: ['lesson-1'],
        enrollments: ['enrollment-1'],
        progress: ['progress-1'],
        payments: ['payment-1'],
        reviews: ['review-1'],
        certificates: ['certificate-1'],
    };
    failAudit = false;
    private queue = Promise.resolve();

    constructor(status: CourseStatus = 'published') {
        this.course = { id: 'course-a', slug: 'course-a', title: 'Course A', status };
    }

    async transaction<T>(work: (tx: CourseLifecycleTransaction) => Promise<T>): Promise<T> {
        const previous = this.queue;
        let release: () => void = () => undefined;
        this.queue = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;

        const courseSnapshot = structuredClone(this.course);
        const auditSnapshot = structuredClone(this.audits);
        const tx: CourseLifecycleTransaction = {
            lockActiveAdmin: async (actorId) => this.activeAdmins.has(actorId),
            lockCourse: async (courseId) => (
                this.course?.id === courseId ? structuredClone(this.course) : null
            ),
            lockPublishedBundles: async () => structuredClone(this.publishedBundles),
            updateCourseStatus: async (courseId, expectedStatus, nextStatus) => {
                if (this.course?.id !== courseId || this.course.status !== expectedStatus) return 0;
                this.course.status = nextStatus;
                return 1;
            },
            insertAudit: async (entry) => {
                if (this.failAudit) throw new Error('audit unavailable');
                this.audits.push(structuredClone(entry));
            },
        };

        try {
            return await work(tx);
        } catch (error) {
            this.course = courseSnapshot;
            this.audits = auditSnapshot;
            throw error;
        } finally {
            release();
        }
    }
}

describe('course lifecycle service', () => {
    it('archives once, converges on retry, and preserves every linked row', async () => {
        const store = new InMemoryCourseLifecycleStore('published');
        const linkedRows = structuredClone(store.linkedRows);
        const service = createCourseLifecycleService(store);

        const results = await Promise.all([
            service.transition({
                actorId: 'admin-a',
                courseId: 'course-a',
                action: 'archive',
                expectedStatus: 'published',
                auditContext,
            }),
            service.transition({
                actorId: 'admin-a',
                courseId: 'course-a',
                action: 'archive',
                expectedStatus: 'published',
                auditContext,
            }),
        ]);

        expect(results.map((result) => result.changedCount).sort()).toEqual([0, 1]);
        expect(results.every((result) => result.course.status === 'archived')).toBe(true);
        expect(store.course?.status).toBe('archived');
        expect(store.audits).toEqual([
            expect.objectContaining({
                userId: 'admin-a',
                entityType: 'course',
                entityId: 'course-a',
                oldValue: 'lifecycle:published',
                newValue: 'lifecycle:archived',
            }),
        ]);
        expect(store.linkedRows).toEqual(linkedRows);
    });

    it('rolls the status mutation back when the audit write fails', async () => {
        const store = new InMemoryCourseLifecycleStore('published');
        store.failAudit = true;
        const service = createCourseLifecycleService(store);

        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            expectedStatus: 'published',
            auditContext,
        })).rejects.toThrow('audit unavailable');

        expect(store.course?.status).toBe('published');
        expect(store.audits).toHaveLength(0);
    });

    it('blocks archive while a published bundle contains the course', async () => {
        const store = new InMemoryCourseLifecycleStore('published');
        store.publishedBundles = [{ id: 'bundle-a', title: 'Bundle A' }];
        const service = createCourseLifecycleService(store);

        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            expectedStatus: 'published',
            auditContext,
        })).rejects.toMatchObject({
            code: 'PUBLISHED_BUNDLE_DEPENDENCY',
            status: 409,
            blockingBundles: [{ id: 'bundle-a', title: 'Bundle A' }],
        });

        expect(store.course?.status).toBe('published');
        expect(store.audits).toHaveLength(0);
    });

    it('rejects inactive Admin authority, stale state, and invalid transitions', async () => {
        const store = new InMemoryCourseLifecycleStore('published');
        const service = createCourseLifecycleService(store);
        store.activeAdmins.clear();

        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            expectedStatus: 'published',
            auditContext,
        })).rejects.toMatchObject({ code: 'ACTOR_FORBIDDEN', status: 403 });

        store.activeAdmins.add('admin-a');
        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            expectedStatus: 'draft',
            auditContext,
        })).rejects.toMatchObject({ code: 'STATE_CONFLICT', status: 409 });

        store.course!.status = 'archived';
        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'publish',
            expectedStatus: 'archived',
            auditContext,
        })).rejects.toMatchObject({ code: 'INVALID_TRANSITION', status: 409 });
    });

    it('restores archived courses to draft and publishes only from draft', async () => {
        const store = new InMemoryCourseLifecycleStore('archived');
        const service = createCourseLifecycleService(store);

        const restored = await service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'restore',
            expectedStatus: 'archived',
            auditContext,
        });
        const published = await service.transition({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'publish',
            expectedStatus: 'draft',
            auditContext,
        });

        expect(restored.course.status).toBe('draft');
        expect(published.course.status).toBe('published');
        expect(store.audits).toHaveLength(2);
    });

    it('returns not found without mutating when the course does not exist', async () => {
        const store = new InMemoryCourseLifecycleStore();
        store.course = null;
        const service = createCourseLifecycleService(store);

        await expect(service.transition({
            actorId: 'admin-a',
            courseId: 'missing-course',
            action: 'archive',
            expectedStatus: 'published',
            auditContext,
        })).rejects.toBeInstanceOf(CourseLifecycleError);
        expect(store.audits).toHaveLength(0);
    });
});
