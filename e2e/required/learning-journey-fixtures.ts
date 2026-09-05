import mysql, { type RowDataPacket } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, like } from 'drizzle-orm';
import { parseE2EFixtureTarget } from '../../scripts/e2e-fixture-target';
import { courses, lessons, users, enrollments, lessonProgress } from '../../src/lib/db/schema';
import { E2E_FIXTURES } from '../fixtures';

export async function seedLearningJourney(userId: string) {
  const target = parseE2EFixtureTarget(process.env.E2E_DATABASE_URL);
  const connection = await mysql.createConnection(process.env.E2E_DATABASE_URL!);
  try {
    const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS db, @@port AS port');
    if (identity[0]?.db !== target.database || Number(identity[0]?.port) !== target.port) throw new Error('E2E identity mismatch');
    const db = drizzle(connection);
    const [owner] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, userId), like(users.email, 'learning-journey-%@example.test')));
    if (!owner) throw new Error('Learning fixtures require their synthetic owner');
    const id = crypto.randomUUID();
    const slug = `e2e-learning-${id}`;
    const lessonIds = Array.from({ length: 3 }, () => crypto.randomUUID());
    await db.transaction(async (tx) => {
      await tx.insert(courses).values({ id, slug, title: 'คอร์สทดสอบการเรียนภาษาไทย', price: '0.00', status: 'published', instructorId: E2E_FIXTURES.users.instructor.id });
      await tx.insert(lessons).values(lessonIds.map((lessonId, index) => ({ id: lessonId, courseId: id, title: `บทเรียน คำสั่ง ${index + 1}`, orderIndex: index + 1, isFreePreview: index === 0, content: index === 0 ? '<p>เนื้อหาการเรียนภาษาไทย</p>' : null, videoUrl: index === 1 ? 'https://iframe.mediadelivery.net/embed/123/00000000-0000-0000-0000-000000000001' : null })));
      await tx.insert(enrollments).values({ id: crypto.randomUUID(), userId, courseId: id });
      await tx.insert(lessonProgress).values({ id: crypto.randomUUID(), userId, lessonId: lessonIds[1], watchTimeSeconds: 37, completed: false });
    });
    return { slug, lessonIds };
  } finally { await connection.end(); }
}
