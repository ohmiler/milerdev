import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.log('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);
const [bundles] = await conn.execute('SELECT id, title, slug, status, price FROM bundles');
console.log('=== Bundles ===');
console.table(bundles);

const [bundleCourses] = await conn.execute('SELECT bc.bundle_id, bc.course_id, c.title as course_title FROM bundle_courses bc JOIN courses c ON bc.course_id = c.id');
console.log('\n=== Bundle Courses ===');
console.table(bundleCourses);

await conn.end();
