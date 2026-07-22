import { describe, expect, it, vi } from 'vitest';

import {
    OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL,
    countDuplicateOAuthAccountGroups,
} from '@/lib/oauth-account-integrity';

describe('OAuth account duplicate preflight', () => {
    it('returns only the aggregate duplicate group count', async () => {
        const query = vi.fn().mockResolvedValue([
            [{ duplicate_group_count: '2' }],
            [],
        ]);

        const result = await countDuplicateOAuthAccountGroups({ query });

        expect(result).toBe(2);
        expect(query).toHaveBeenCalledWith(OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL);
        expect(OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL).toMatch(/SELECT COUNT\(\*\)/i);
        expect(OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL).toMatch(
            /GROUP BY provider, providerAccountId/i
        );
        expect(OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL).not.toMatch(
            /SELECT\s+(provider|providerAccountId)/i
        );
    });

    it('treats an empty aggregate result as zero', async () => {
        const query = vi.fn().mockResolvedValue([[], []]);

        await expect(countDuplicateOAuthAccountGroups({ query })).resolves.toBe(0);
    });

    it('rejects an invalid aggregate result instead of reporting a false pass', async () => {
        const query = vi.fn().mockResolvedValue([
            [{ duplicate_group_count: 'not-a-number' }],
            [],
        ]);

        await expect(countDuplicateOAuthAccountGroups({ query })).rejects.toThrow(
            'Invalid duplicate group count'
        );
    });
});
