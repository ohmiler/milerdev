import { describe, expect, it, vi } from 'vitest';

import { transitionAdminCourse } from '@/lib/admin-course-lifecycle-client';

describe('Admin course lifecycle client', () => {
  it('sends the expected state and returns the authoritative course status', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      course: { id: 'course-a', title: 'Course A', status: 'archived' },
      changedCount: 1,
      skippedCount: 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await transitionAdminCourse({
      courseId: 'course-a',
      action: 'archive',
      expectedStatus: 'published',
      request,
    });

    expect(request).toHaveBeenCalledWith('/api/admin/courses/course-a', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ action: 'archive', expectedStatus: 'published' }),
    }));
    expect(result).toEqual({
      ok: true,
      course: { id: 'course-a', status: 'archived' },
    });
  });

  it('returns published Bundle titles in the safe conflict message', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'ต้องนำคอร์สออกจาก Bundle ที่เผยแพร่อยู่ก่อน',
      code: 'PUBLISHED_BUNDLE_DEPENDENCY',
      blockingBundles: [{ id: 'bundle-a', title: 'Bundle A' }],
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await transitionAdminCourse({
      courseId: 'course-a',
      action: 'archive',
      expectedStatus: 'published',
      request,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PUBLISHED_BUNDLE_DEPENDENCY',
      message: 'ต้องนำคอร์สออกจาก Bundle ที่เผยแพร่อยู่ก่อน: Bundle A',
    });
  });

  it('rejects a success response that does not identify the requested course', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      course: { id: 'course-b', status: 'archived' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await transitionAdminCourse({
      courseId: 'course-a',
      action: 'archive',
      expectedStatus: 'published',
      request,
    });

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_RESPONSE',
      message: 'เซิร์ฟเวอร์ส่งสถานะคอร์สที่ไม่ถูกต้อง กรุณาโหลดหน้าใหม่',
    });
  });
});
