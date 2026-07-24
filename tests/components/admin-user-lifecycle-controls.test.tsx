import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
    AdminUserLifecycleAction,
    AdminUserLifecycleBadge,
} from '@/components/admin/AdminUserLifecycleControls';

describe('Admin user lifecycle controls', () => {
    it('renders an active status with a deactivation action and non-color text', () => {
        const markup = renderToStaticMarkup(
            <>
                <AdminUserLifecycleBadge status="active" />
                <AdminUserLifecycleAction status="active" pending={false} onRequest={vi.fn()} />
            </>,
        );

        expect(markup).toContain('ใช้งาน');
        expect(markup).toContain('ปิดใช้งาน');
        expect(markup).toContain('aria-label="ปิดใช้งานบัญชี"');
    });

    it('renders an inactive status with a disabled pending reactivation action', () => {
        const markup = renderToStaticMarkup(
            <>
                <AdminUserLifecycleBadge status="inactive" detail="ตั้งแต่ 24 ก.ค. 2569" />
                <AdminUserLifecycleAction status="inactive" pending={true} onRequest={vi.fn()} />
            </>,
        );

        expect(markup).toContain('ปิดใช้งาน');
        expect(markup).toContain('ตั้งแต่ 24 ก.ค. 2569');
        expect(markup).toContain('กำลังบันทึก...');
        expect(markup).toContain('disabled');
    });
});
