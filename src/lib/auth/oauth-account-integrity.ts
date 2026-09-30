type QueryExecutor = {
    query: (sql: string) => Promise<[unknown, unknown]>;
};

export const OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL = `
SELECT COUNT(*) AS duplicate_group_count
FROM (
    SELECT 1
    FROM accounts
    GROUP BY provider, providerAccountId
    HAVING COUNT(*) > 1
) AS duplicate_groups
`.trim();

export async function countDuplicateOAuthAccountGroups(
    executor: QueryExecutor
): Promise<number> {
    const [rows] = await executor.query(OAUTH_ACCOUNT_DUPLICATE_GROUP_COUNT_SQL);
    if (!Array.isArray(rows) || rows.length === 0) return 0;

    const firstRow = rows[0];
    const rawCount = firstRow && typeof firstRow === 'object'
        ? (firstRow as { duplicate_group_count?: unknown }).duplicate_group_count
        : undefined;
    const count = Number(rawCount);

    if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error('Invalid duplicate group count');
    }

    return count;
}
