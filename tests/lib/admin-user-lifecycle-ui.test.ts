import { describe, expect, it } from 'vitest';

import {
    applyAuthoritativeLifecycleState,
    buildAdminUsersSearchParams,
    getLifecyclePresentation,
    lifecycleDeactivationDialog,
    lifecycleMutationFeedback,
} from '@/lib/admin-user-lifecycle-ui';

describe('Admin user lifecycle UI contract', () => {
    it('maps active and inactive states to truthful reversible actions', () => {
        expect(getLifecyclePresentation('active')).toMatchObject({
            badgeLabel: 'ใช้งาน',
            action: 'deactivate',
            actionLabel: 'ปิดใช้งาน',
            tone: 'success',
        });
        expect(getLifecyclePresentation('inactive')).toMatchObject({
            badgeLabel: 'ปิดใช้งาน',
            action: 'reactivate',
            actionLabel: 'เปิดใช้งาน',
            tone: 'warning',
        });
    });

    it('keeps lifecycle filtering in the Admin Users request contract', () => {
        const params = buildAdminUsersSearchParams({
            page: 2,
            role: 'student',
            status: 'inactive',
            search: 'learner@example.com',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });

        expect(params.get('page')).toBe('2');
        expect(params.get('status')).toBe('inactive');
        expect(params.get('search')).toBe('learner@example.com');
    });

    it('states the deactivation impact without implying data deletion', () => {
        expect(lifecycleDeactivationDialog.message).toContain('เข้าสู่ระบบ');
        expect(lifecycleDeactivationDialog.message).toContain('การลงทะเบียน');
        expect(lifecycleDeactivationDialog.message).toContain('ใบรับรอง');
        expect(lifecycleDeactivationDialog.message).not.toContain('ลบถาวร');
    });

    it('applies server-authoritative states and reports actual changed counts', () => {
        const current = [{
            id: 'student-a',
            name: 'Student',
            lifecycleStatus: 'active' as const,
            deactivatedAt: null,
        }];
        const updated = applyAuthoritativeLifecycleState(current, [{
            id: 'student-a',
            name: 'Student',
            role: 'student',
            lifecycleStatus: 'inactive',
            deactivatedAt: '2026-07-24T00:00:00.000Z',
        }]);

        expect(updated[0]).toMatchObject({
            lifecycleStatus: 'inactive',
            deactivatedAt: '2026-07-24T00:00:00.000Z',
        });
        expect(lifecycleMutationFeedback('deactivate', 1, 2)).toContain('1');
        expect(lifecycleMutationFeedback('deactivate', 1, 2)).toContain('2');
        expect(lifecycleMutationFeedback('reactivate', 0, 1)).toContain('ไม่มีรายการเปลี่ยนแปลง');
    });
});
