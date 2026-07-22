import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onDuplicateKeyUpdate });
    const insert = vi.fn().mockReturnValue({ values });
    const forUpdate = vi.fn();
    const where = vi.fn().mockReturnValue({ for: forUpdate });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const transaction = vi.fn(async (callback: (transaction: unknown) => unknown) =>
        callback({ insert, select })
    );
    const execute = vi.fn().mockResolvedValue(undefined);

    return {
        execute,
        forUpdate,
        from,
        insert,
        onDuplicateKeyUpdate,
        select,
        transaction,
        values,
        where,
    };
});

vi.mock('@/lib/db', () => ({
    db: {
        execute: mocks.execute,
        transaction: mocks.transaction,
    },
}));

import {
    cleanupExpiredRateLimitBuckets,
    consumeRateLimitBucket,
} from '@/lib/auth-rate-limit-store';

describe('MySQL auth rate-limit store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.forUpdate.mockResolvedValue([{
            count: 2,
            resetTime: '1800000000000',
        }]);
    });

    it('updates and reads the exact bucket inside one locking transaction', async () => {
        const result = await consumeRateLimitBucket({
            keyHash: 'a'.repeat(64),
            windowMs: 60_000,
        });

        expect(result).toEqual({ count: 2, resetTime: 1_800_000_000_000 });
        expect(mocks.transaction).toHaveBeenCalledOnce();
        expect(mocks.insert).toHaveBeenCalledOnce();
        expect(mocks.onDuplicateKeyUpdate).toHaveBeenCalledOnce();
        expect(mocks.forUpdate).toHaveBeenCalledWith('update');
    });

    it('fails closed when the locked row cannot be read', async () => {
        mocks.forUpdate.mockResolvedValue([]);

        await expect(consumeRateLimitBucket({
            keyHash: 'b'.repeat(64),
            windowMs: 60_000,
        })).rejects.toThrow('Rate limit bucket missing after atomic update');
    });

    it('bounds cleanup frequency within a process', async () => {
        await cleanupExpiredRateLimitBuckets();
        await cleanupExpiredRateLimitBuckets();

        expect(mocks.execute).toHaveBeenCalledTimes(1);
    });
});
