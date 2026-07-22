import mysql from 'mysql2/promise';

import { countDuplicateOAuthAccountGroups } from '../src/lib/oauth-account-integrity';

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set');
    }

    const connection = await mysql.createConnection(databaseUrl);
    try {
        const duplicateGroupCount = await countDuplicateOAuthAccountGroups(connection);
        console.log(`OAuth account duplicate groups: ${duplicateGroupCount}`);

        if (duplicateGroupCount > 0) {
            process.exitCode = 2;
        }
    } finally {
        await connection.end();
    }
}

main().catch(() => {
    console.error('OAuth account duplicate preflight failed');
    process.exitCode = 1;
});
