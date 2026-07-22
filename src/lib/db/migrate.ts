import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

import { getSafeMigrationFailureMessage } from './migration-error';

// Load .env.local only in development (production uses real env vars)
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: '.env.local' });
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set');
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Resolve drizzle folder relative to project root
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

    console.log('Running migrations...');
    await migrate(db, { migrationsFolder });
    console.log('Migrations complete!');

    await connection.end();
}

main().catch((err) => {
    console.error(getSafeMigrationFailureMessage(err));
    process.exit(1);
});
