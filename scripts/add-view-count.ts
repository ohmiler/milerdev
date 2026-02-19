import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { db } = await import('../src/lib/db/index');
  const { sql } = await import('drizzle-orm');

  await db.execute(sql`
    ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0
  `);
  console.log('✅ view_count column added');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
