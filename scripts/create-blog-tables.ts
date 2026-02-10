import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log('Creating blog_posts table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      thumbnail_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      author_id VARCHAR(36),
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ blog_posts created');

  console.log('Creating blog_post_tags table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS blog_post_tags (
      id VARCHAR(36) PRIMARY KEY,
      post_id VARCHAR(36) NOT NULL,
      tag_id VARCHAR(36) NOT NULL,
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ blog_post_tags created');

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
