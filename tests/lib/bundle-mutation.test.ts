import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectQueue: unknown[][] = [];
const inserted: unknown[] = [];
const queryChains: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

function queryChain(result: unknown[]) {
  const chain = {} as Record<string, ReturnType<typeof vi.fn>>;
  for (const method of ['from', 'where', 'orderBy']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.for = vi.fn(() => Promise.resolve(result));
  queryChains.push(chain);
  return chain;
}

const tx = {
  select: vi.fn(() => queryChain(selectQueue.shift() ?? [])),
  insert: vi.fn(() => ({
    values: vi.fn((value: unknown) => {
      inserted.push(value);
      return Promise.resolve();
    }),
  })),
};

vi.mock('@/lib/db', () => ({
  db: { transaction: vi.fn((work: (transaction: typeof tx) => unknown) => work(tx)) },
}));

import {
  BundleMutationError,
  createBundleWithIntegrity,
} from '@/lib/bundle-mutation';

const input = {
  title: 'Bundle',
  slug: 'bundle',
  description: null,
  thumbnailUrl: null,
  price: '1990.00',
  status: 'published' as const,
  courseIds: ['course-b', 'course-a'],
};

describe('Admin Bundle mutation transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    inserted.length = 0;
    queryChains.length = 0;
  });

  it('locks active Admin and all child courses before publishing and preserves display order', async () => {
    selectQueue.push(
      [{ id: 'admin-1' }],
      [
        { id: 'course-a', status: 'published' },
        { id: 'course-b', status: 'published' },
      ],
    );

    await createBundleWithIntegrity({
      actorId: 'admin-1',
      bundleId: 'bundle-1',
      input,
      auditContext: { ipAddress: null, userAgent: null },
    });

    expect(queryChains[1]?.orderBy).toHaveBeenCalledTimes(1);
    expect(inserted[1]).toEqual([
      expect.objectContaining({ courseId: 'course-b', orderIndex: 0 }),
      expect.objectContaining({ courseId: 'course-a', orderIndex: 1 }),
    ]);
  });

  it('rolls back before any insert when a child is archived', async () => {
    selectQueue.push(
      [{ id: 'admin-1' }],
      [
        { id: 'course-a', status: 'published' },
        { id: 'course-b', status: 'archived' },
      ],
    );

    await expect(createBundleWithIntegrity({
      actorId: 'admin-1',
      bundleId: 'bundle-1',
      input,
      auditContext: { ipAddress: null, userAgent: null },
    })).rejects.toEqual(expect.objectContaining<Partial<BundleMutationError>>({
      code: 'BUNDLE_CHILD_NOT_PUBLISHED',
      blockingCourseIds: ['course-b'],
    }));
    expect(inserted).toHaveLength(0);
  });

  it('rejects a stale or deactivated Admin inside the transaction', async () => {
    selectQueue.push([]);
    await expect(createBundleWithIntegrity({
      actorId: 'admin-1',
      bundleId: 'bundle-1',
      input,
      auditContext: { ipAddress: null, userAgent: null },
    })).rejects.toEqual(expect.objectContaining({ code: 'ACTOR_FORBIDDEN' }));
    expect(inserted).toHaveLength(0);
  });
});
