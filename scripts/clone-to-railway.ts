/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Clone all data from local DB to Railway DB.
 * 
 * Requires two env vars in .env.local:
 *   DATABASE_URL_LOCAL = mysql://... (local/source DB)
 *   DATABASE_URL       = mysql://... (Railway/target DB)
 * 
 * Usage: npx tsx scripts/clone-to-railway.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Tables in dependency order (parents before children)
const TABLES = [
    'users',
    'courses',
    'lessons',
    'enrollments',
    'lesson_progress',
    'payments',
    'announcements',
    'notifications',
    'settings',
    'audit_logs',
    'media',
    'tags',
    'course_tags',
    'reviews',
    'certificates',
    'coupons',
    'coupon_usages',
    'bundles',
    'bundle_courses',
    'blog_posts',
    'blog_post_tags',
];

async function main() {
    console.log('🚀 Clone Local DB → Railway DB');
    console.log('================================\n');

    const localUrl = process.env.DATABASE_URL_LOCAL;
    const railwayUrl = process.env.DATABASE_URL;

    if (!localUrl) {
        console.error('❌ DATABASE_URL_LOCAL not set in .env.local');
        console.error('   Add: DATABASE_URL_LOCAL=mysql://... (your local DB URL)');
        process.exit(1);
    }
    if (!railwayUrl) {
        console.error('❌ DATABASE_URL not set in .env.local');
        process.exit(1);
    }

    console.log('📡 Connecting to databases...');
    const source = await mysql.createConnection(localUrl);
    const target = await mysql.createConnection(railwayUrl);
    console.log('   ✅ Connected to both databases\n');

    try {
        // Disable foreign key checks on target
        await target.execute('SET FOREIGN_KEY_CHECKS = 0');
        await target.execute('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');

        for (const table of TABLES) {
            // Check if table exists in source
            try {
                const [rows] = await source.execute(`SELECT COUNT(*) as cnt FROM \`${table}\``);
                const count = (rows as any[])[0].cnt;

                if (count === 0) {
                    console.log(`⏭️  ${table}: 0 rows (skipped)`);
                    continue;
                }

                // Check if target already has data
                let targetCount = 0;
                try {
                    const [targetRows] = await target.execute(`SELECT COUNT(*) as cnt FROM \`${table}\``);
                    targetCount = (targetRows as any[])[0].cnt;
                } catch {
                    console.log(`⚠️  ${table}: table not found in target (skipped)`);
                    continue;
                }

                if (targetCount > 0) {
                    console.log(`⏭️  ${table}: target already has ${targetCount} rows (skipped)`);
                    continue;
                }

                // Fetch all rows from source
                const [data] = await source.execute(`SELECT * FROM \`${table}\``);
                const rows2 = data as any[];

                if (rows2.length === 0) {
                    console.log(`⏭️  ${table}: 0 rows (skipped)`);
                    continue;
                }

                // Get column names from first row
                const columns = Object.keys(rows2[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const columnList = columns.map(c => `\`${c}\``).join(', ');
                const insertSQL = `INSERT INTO \`${table}\` (${columnList}) VALUES (${placeholders})`;

                // Insert in batches of 100
                const batchSize = 100;
                let inserted = 0;

                for (let i = 0; i < rows2.length; i += batchSize) {
                    const batch = rows2.slice(i, i + batchSize);
                    for (const row of batch) {
                        const values = columns.map(col => row[col]);
                        try {
                            await target.execute(insertSQL, values);
                            inserted++;
                        } catch (err: any) {
                            // Skip duplicate key errors
                            if (err.errno === 1062) continue;
                            throw err;
                        }
                    }
                }

                console.log(`✅ ${table}: ${inserted} rows copied`);
            } catch (err: any) {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log(`⚠️  ${table}: not found in source (skipped)`);
                } else {
                    console.error(`❌ ${table}: ${err.message}`);
                }
            }
        }

        // Re-enable foreign key checks
        await target.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n================================');
        console.log('✅ Clone completed!');
        console.log('================================');
    } finally {
        await source.end();
        await target.end();
    }
}

main().catch(err => {
    console.error('❌ Clone failed:', err);
    process.exit(1);
});
