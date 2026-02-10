import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await c.execute('SELECT id, title, LEFT(content, 500) as content_preview FROM blog_posts LIMIT 1') as any;
  if (rows.length > 0) {
    console.log('Title:', rows[0].title);
    console.log('Content preview (first 500 chars):');
    console.log(JSON.stringify(rows[0].content_preview));
  } else {
    console.log('No blog posts found');
  }
  await c.end();
}

main().catch(console.error);
