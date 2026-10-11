import { expect, test, type APIRequestContext } from '@playwright/test';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';

import { courses, enrollments, payments, users } from '../../src/lib/db/schema';
import { completeRegistration } from './email-registration-helper';

// Admin server pages must check the admin role themselves. The admin layout's check does not
// gate its pages: an RSC request renders the page segment into the payload even when the layout
// redirects. This spec seeds a learner, a draft course and a payment, then asks each admin
// server page for its RSC payload as an anonymous visitor and as a signed-in student. No
// response may carry the seeded data. The admin's own view of these pages is covered by
// accessibility.spec.ts.

const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const seed = {
  userId: crypto.randomUUID(),
  email: `admin-guard-${suffix}@example.test`,
  name: `Admin Guard Learner ${suffix}`,
  courseId: crypto.randomUUID(),
  courseSlug: `admin-guard-${suffix}`,
  courseTitle: `Admin guard course ${suffix}`,
  enrollmentId: crypto.randomUUID(),
  paymentId: crypto.randomUUID(),
};
// Values only a data query can put in a response. The course id is not one of them: it is part
// of the enrollments URL, so the RSC route tree echoes it on every response.
const markers = [seed.email, seed.name, seed.courseTitle];

const pages = ['/admin', '/admin/courses', `/admin/courses/${seed.courseId}/enrollments`];
// A plain RSC request, and one that claims the client already holds the admin layout.
const cachedAdminLayout = encodeURIComponent(
  JSON.stringify(['', { children: ['admin', { children: ['__PAGE__', {}] }] }]),
);
const rscVariants: Record<string, string>[] = [
  { RSC: '1' },
  { RSC: '1', 'Next-Router-State-Tree': cachedAdminLayout },
];

// Follows redirects by hand so every hop carries the same RSC headers.
async function getFollowing(request: APIRequestContext, path: string, headers: Record<string, string>) {
  let url = path;
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await request.get(url, { headers, maxRedirects: 0, failOnStatusCode: false });
    const location = response.headers()['location'];
    if (response.status() >= 300 && response.status() < 400 && location) {
      url = new URL(location, new URL(url, 'http://127.0.0.1:3100')).toString();
      continue;
    }
    return { status: response.status(), body: await response.text() };
  }
  throw new Error(`Too many redirects for ${path}`);
}

async function expectNoSeededData(request: APIRequestContext, who: string) {
  for (const path of pages) {
    for (const headers of rscVariants) {
      const { body } = await getFollowing(request, path, headers);
      for (const marker of markers) {
        expect(body.includes(marker), `${who}: ${path} with ${Object.keys(headers).join('+')} returned "${marker}"`).toBe(false);
      }
    }
  }
}

let connection: mysql.Connection;

test.beforeAll(async () => {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  const target = new URL(databaseUrl);
  if (target.protocol !== 'mysql:' || target.hostname !== '127.0.0.1' || target.pathname !== '/milerdev_e2e') {
    throw new Error('The admin page guard spec requires the dedicated loopback milerdev_e2e database');
  }
  connection = await mysql.createConnection(databaseUrl);
  const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  if (identity[0]?.name !== 'milerdev_e2e') throw new Error('Connected database is not milerdev_e2e');

  const db = drizzle(connection);
  await db.insert(users).values({ id: seed.userId, email: seed.email, name: seed.name, role: 'student' });
  await db.insert(courses).values({
    id: seed.courseId, title: seed.courseTitle, slug: seed.courseSlug, price: '990.00', status: 'draft',
  });
  await db.insert(enrollments).values({ id: seed.enrollmentId, userId: seed.userId, courseId: seed.courseId });
  await db.insert(payments).values({
    id: seed.paymentId, userId: seed.userId, courseId: seed.courseId, amount: '990.00', currency: 'THB',
    method: 'promptpay', status: 'completed', itemTitle: seed.courseTitle,
  });
});

test.afterAll(async () => {
  if (!connection) return;
  // Only the rows seeded here are removed.
  const db = drizzle(connection);
  await db.delete(payments).where(eq(payments.id, seed.paymentId));
  await db.delete(enrollments).where(eq(enrollments.id, seed.enrollmentId));
  await db.delete(courses).where(eq(courses.id, seed.courseId));
  await db.delete(users).where(eq(users.id, seed.userId));
  await connection.end();
});

test('admin server pages return no data to an anonymous RSC request', async ({ request }) => {
  await expectNoSeededData(request, 'anonymous');

  // A normal page load still sends the visitor to the login page.
  const page = await request.get(pages[2], { maxRedirects: 0, failOnStatusCode: false });
  expect(page.status()).toBeGreaterThanOrEqual(300);
  expect(page.headers()['location'] ?? '').toContain('/login');
});

test('admin server pages return no data to a signed-in student', async ({ page }) => {
  test.setTimeout(90_000);
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': '192.0.2.91' });
  const id = crypto.randomUUID().replaceAll('-', '');
  await page.goto('/register');
  await completeRegistration(page, { name: 'Admin Guard Student', email: `admin-guard-student-${id}@example.test`, password: 'Aa1!' + id });
  const session = await (await page.request.get('/api/auth/session')).json();
  expect(session.user.role).toBe('student');

  await expectNoSeededData(page.request, 'student');
});
