import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  updates: [] as Record<string, unknown>[],
  selectResults: [] as unknown[][],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auditLog')>()),
  logAudit: vi.fn(),
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => {
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit']) chain[method] = () => chain;
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  const update = () => ({
    set: (values: Record<string, unknown>) => {
      mocks.updates.push(values);
      return { where: async () => undefined };
    },
  });
  return { db: { select, update, insert: () => ({ values: async () => undefined }), delete: () => ({ where: async () => undefined }) } };
});

import { PUT } from '@/app/api/admin/courses/[id]/route';

const session = { user: { id: 'admin-a', role: 'admin' } };
const existingCourse = {
  id: 'course-a', slug: 'course-a', title: 'Course A', description: null, price: '1290.00',
  thumbnailUrl: null, certificateColor: '#2563eb', certificateHeaderImage: null, previewVideoUrl: null,
  promoPrice: '890.00', promoStartsAt: null, promoEndsAt: null, instructorId: null,
};
const put = (body: unknown) => PUT(
  new Request('http://localhost/api/admin/courses/course-a', { method: 'PUT', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: 'course-a' }) },
);

describe('PUT /api/admin/courses/[id] promotion times', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updates.length = 0;
    mocks.selectResults.length = 0;
    mocks.requireAdmin.mockResolvedValue({ session });
  });

  it('stores the exact instant the editor sends, independent of the server time zone', async () => {
    mocks.selectResults.push([existingCourse]);

    const response = await put({ promoStartsAt: '2026-10-05T17:00:00.000Z', promoEndsAt: '2026-10-16T16:59:00.000Z' });

    expect(response.status).toBe(200);
    expect((mocks.updates[0].promoStartsAt as Date).toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect((mocks.updates[0].promoEndsAt as Date).toISOString()).toBe('2026-10-16T16:59:00.000Z');
  });

  it('clears the window when the editor sends empty values', async () => {
    mocks.selectResults.push([{ ...existingCourse, promoStartsAt: new Date(), promoEndsAt: new Date() }]);

    expect((await put({ promoStartsAt: '', promoEndsAt: '' })).status).toBe(200);
    expect(mocks.updates[0]).toMatchObject({ promoStartsAt: null, promoEndsAt: null });
  });

  it('rejects an offset-less time from an old form without writing anything', async () => {
    const response = await put({ promoStartsAt: '2026-10-06T00:00' });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('เวลาโปรโมชั่นไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง');
    expect(mocks.updates).toHaveLength(0);
  });
});
