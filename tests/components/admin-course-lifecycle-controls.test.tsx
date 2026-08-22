import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  AdminCourseLifecycleActions,
  AdminCourseLifecycleBadge,
  getCourseLifecyclePresentation,
} from '@/components/admin/AdminCourseLifecycleControls';

describe('Admin course lifecycle controls', () => {
  it.each([
    ['draft', 'แบบร่าง'],
    ['published', 'เผยแพร่'],
    ['archived', 'เก็บเข้าคลัง'],
  ] as const)('renders the %s status with non-color text', (status, label) => {
    const markup = renderToStaticMarkup(<AdminCourseLifecycleBadge status={status} />);
    expect(markup).toContain(label);
    expect(markup).toContain(`data-course-status="${status}"`);
  });

  it('offers only valid explicit transitions for every status', () => {
    const onRequest = vi.fn();
    const draft = renderToStaticMarkup(<AdminCourseLifecycleActions status="draft" pending={false} onRequest={onRequest} />);
    const published = renderToStaticMarkup(<AdminCourseLifecycleActions status="published" pending={false} onRequest={onRequest} />);
    const archived = renderToStaticMarkup(<AdminCourseLifecycleActions status="archived" pending={false} onRequest={onRequest} />);

    expect(draft).toContain('เผยแพร่คอร์ส');
    expect(draft).toContain('เก็บเข้าคลัง');
    expect(published).toContain('เก็บเข้าคลัง');
    expect(published).not.toContain('เผยแพร่คอร์ส');
    expect(archived).toContain('นำกลับเป็นแบบร่าง');
    expect(archived).not.toContain('ลบคอร์ส');
  });

  it('explains archive retention, stopped sales, payment checks, and bundle conflicts', () => {
    const presentation = getCourseLifecyclePresentation('archive');
    const impacts = presentation.impacts.join(' ');

    expect(presentation.confirmLabel).toBe('ยืนยันเก็บเข้าคลัง');
    expect(presentation.summary).toContain('หยุดรับการขายใหม่');
    expect(impacts).toContain('ผู้เรียนเดิมยังเข้าเรียนได้');
    expect(impacts).toContain('รายการชำระเงินที่เริ่มไว้');
    expect(impacts).toContain('Bundle ที่เผยแพร่');
  });

  it('disables lifecycle actions while an authoritative request is pending', () => {
    const markup = renderToStaticMarkup(<AdminCourseLifecycleActions status="draft" pending onRequest={vi.fn()} />);
    expect(markup).toContain('กำลังเปลี่ยนสถานะ...');
    expect(markup).toContain('disabled');
  });
});
