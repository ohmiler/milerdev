# Performance Code Review — MilerDev

**วันที่ตรวจ:** 2026-02-19  
**ขอบเขต:** Database Queries, Rendering Strategy, Caching, Over-fetching

---

## สรุปผลการตรวจ

| หมวด | สถานะ | สรุป |
|------|--------|------|
| N+1 Queries | 🔴 พบปัญหา | `getPublishedBundles()`, Admin CSV export |
| Missing DB Indexes | 🔴 พบปัญหา | 13 columns ที่ query บ่อยไม่มี index |
| SELECT * Over-fetching | 🟡 พบปัญหา | `progress/route.ts` หลายจุด |
| Waterfall Queries | 🟡 พบปัญหา | Dashboard, learn page, progress route |
| Rendering Strategy | 🔴 พบปัญหา | `force-dynamic` บนทุก page แม้ข้อมูลไม่เปลี่ยน |
| Correlated Subqueries | 🔴 พบปัญหา | Admin report ทำ N+1 ที่ DB level |
| Search Performance | 🟡 พบปัญหา | LIKE `%text%` ใช้ full table scan |
| Pagination | 🟡 พบปัญหา | Admin blog endpoint ไม่มี limit |
| Client-side Fetching | 🔵 สังเกต | Courses page เป็น Client Component ทั้งหมด |

---

## 🔴 ปัญหาระดับสูง

---

### 1. N+1 Query — `getPublishedBundles()` ใน Home Page

**ไฟล์:** `src/app/page.tsx:92-128`  
**ผลกระทบ:** 3 bundles = 4 queries (1 + N) ทุกครั้งที่โหลด Home

```typescript
// ❌ N+1 pattern — 1 query หา bundles แล้ว loop query ต่อ bundle
const allBundles = await db.select().from(bundles)...  // Query 1
return Promise.all(
  allBundles.map(async (bundle) => {
    const bCourses = await db.select()           // Query 2, 3, 4...
      .where(eq(bundleCourses.bundleId, bundle.id))
  })
);

// ✅ วิธีแก้ — Single JOIN query
const rows = await db
  .select({ bundle: bundles, courseId: bundleCourses.courseId, courseTitle: courses.title, coursePrice: courses.price })
  .from(bundles)
  .leftJoin(bundleCourses, eq(bundles.id, bundleCourses.bundleId))
  .leftJoin(courses, eq(bundleCourses.courseId, courses.id))
  .where(eq(bundles.status, 'published'))
  .orderBy(desc(bundles.createdAt), asc(bundleCourses.orderIndex))
  .limit(3);
// Group ใน JavaScript แทน N queries → จาก N+1 queries → 1 query เสมอ
```

---

### 2. Correlated Subquery — Admin Reports (N+1 ที่ DB Level)

**ไฟล์:** `src/app/api/admin/reports/export/route.ts:89-130`  
**ผลกระทบ:** 100 users = 201 queries, 50 courses = 101 queries ต่อ request

```typescript
// ❌ Correlated subquery ต่อทุก row = N+1 ที่ DB level
const data = await db.select({
  enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE user_id = ${users.id})`,
}).from(users)

// ✅ วิธีแก้ — ใช้ LEFT JOIN + GROUP BY
const data = await db
  .select({ id: users.id, enrollmentCount: sql<number>`COUNT(${enrollments.id})` })
  .from(users)
  .leftJoin(enrollments, eq(enrollments.userId, users.id))
  .groupBy(users.id)
  .orderBy(desc(users.createdAt));
// 101 queries → 1 query
```

---

### 3. Missing Database Indexes — 13 Columns

**ไฟล์:** `src/lib/db/schema.ts`  
**ผลกระทบ:** Full Table Scan ทุก query บน columns เหล่านี้

| Table | Column | ใช้ใน | สถานะ |
|-------|--------|--------|-------|
| `lessons` | `course_id` | progress, learn page, dashboard | ❌ ไม่มี |
| `lesson_progress` | `user_id` | progress GET/POST, dashboard | ❌ ไม่มี |
| `lesson_progress` | `lesson_id` | progress GET/POST | ❌ ไม่มี |
| `blog_posts` | `status` | blog listing, blog page | ❌ ไม่มี |
| `blog_posts` | `published_at` | blog ordering | ❌ ไม่มี |
| `payments` | `user_id` | dashboard, payment history | ❌ ไม่มี |
| `payments` | `created_at` | reports (gte filter) | ❌ ไม่มี |
| `payments` | `status` | revenue calculations | ❌ ไม่มี |
| `notifications` | `user_id` | SSE stream | ❌ ไม่มี |
| `reviews` | `course_id` | review listing | ❌ ไม่มี |
| `reviews` | `course_id` + `is_hidden` | review listing filter | ❌ composite ไม่มี |
| `certificates` | `user_id` | dashboard | ❌ ไม่มี |
| `bundle_courses` | `bundle_id` | bundle detail, home page | ❌ ไม่มี |

```typescript
// ✅ วิธีแก้ — เพิ่ม indexes ใน schema.ts
export const lessons = mysqlTable('lessons', { /*...*/ }, (table) => [
  index('idx_lessons_course_id').on(table.courseId),
]);
export const lessonProgress = mysqlTable('lesson_progress', { /*...*/ }, (table) => [
  index('idx_lesson_progress_user_id').on(table.userId),
  index('idx_lesson_progress_lesson_id').on(table.lessonId),
]);
export const blogPosts = mysqlTable('blog_posts', { /*...*/ }, (table) => [
  index('idx_blog_posts_status').on(table.status),
  index('idx_blog_posts_published_at').on(table.publishedAt),
]);
export const payments = mysqlTable('payments', { /*...*/ }, (table) => [
  index('idx_payments_user_id').on(table.userId),
  index('idx_payments_created_at').on(table.createdAt),
  index('idx_payments_status').on(table.status),
]);
export const reviews = mysqlTable('reviews', { /*...*/ }, (table) => [
  index('idx_reviews_course_hidden').on(table.courseId, table.isHidden),
]);
export const notifications = mysqlTable('notifications', { /*...*/ }, (table) => [
  index('idx_notifications_user_id').on(table.userId),
]);
export const certificates = mysqlTable('certificates', { /*...*/ }, (table) => [
  index('idx_certificates_user_id').on(table.userId),
]);
export const bundleCourses = mysqlTable('bundle_courses', { /*...*/ }, (table) => [
  index('idx_bundle_courses_bundle_id').on(table.bundleId),
]);
// หลังแก้ schema: npx drizzle-kit generate && npx drizzle-kit migrate
```

---

### 4. `force-dynamic` บนทุก Page — ปิด Caching ทั้งหมด

**ผลกระทบ:** ทุก request ต้อง query DB ใหม่แม้ข้อมูลไม่เปลี่ยน

| ไฟล์ | ข้อมูล | ควรเป็น |
|------|--------|---------|
| `src/app/page.tsx` | Featured courses, stats | `revalidate = 300` (5 นาที) |
| `src/app/courses/[slug]/page.tsx` | Course detail | `revalidate = 600` (10 นาที) |
| `src/app/blog/[slug]/page.tsx` | Blog content | `revalidate = 3600` (1 ชั่วโมง) |
| `src/app/dashboard/page.tsx` | User-specific | `force-dynamic` ✅ ถูกต้อง |

```typescript
// ❌ ปัจจุบัน
export const dynamic = 'force-dynamic';

// ✅ วิธีแก้ — เปลี่ยนเป็น ISR
export const revalidate = 300; // cache 5 นาที

// ⚠️ ข้อควรระวัง: ต้องเพิ่ม revalidatePath() ใน admin route เมื่อ publish
// src/app/api/admin/blog/route.ts — หลัง publish:
import { revalidatePath } from 'next/cache';
revalidatePath(`/blog/${slug}`);
revalidatePath('/blog');
```

---

## 🟡 ปัญหาระดับกลาง

---

### 5. Waterfall Queries — Dashboard Page

**ไฟล์:** `src/app/dashboard/page.tsx:94-108`

```typescript
// ❌ Sequential — certCount รอ getUserEnrollments ก่อน, paymentCount รอ certCount ก่อน
const userEnrollments = await getUserEnrollments(session.user.id);  // ~30ms
const [certCount] = await db.select({ count: count() })...;         // ~10ms
const [paymentCount] = await db.select({ count: count() })...;      // ~10ms
// รวม: ~50ms

// ✅ Parallelized
const [userEnrollments, [certCount], [paymentCount]] = await Promise.all([
  getUserEnrollments(session.user.id),
  db.select({ count: count() }).from(certificates).where(...),
  db.select({ count: count() }).from(payments).where(...),
]);
// รวม: ~30ms (เร็วขึ้น ~40%)
```

---

### 6. Waterfall Queries — Progress Route POST

**ไฟล์:** `src/app/api/progress/route.ts:107-123`

```typescript
// ❌ Sequential
const [{ totalLessons }] = await db.select({ totalLessons: count() }).from(lessons).where(...);
const [{ completedLessons }] = await db.select({ completedLessons: count() }).from(lessonProgress)...;

// ✅ Parallelized
const [[{ totalLessons }], [{ completedLessons }]] = await Promise.all([
  db.select({ totalLessons: count() }).from(lessons).where(eq(lessons.courseId, lesson.courseId)),
  db.select({ completedLessons: count() }).from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .where(and(eq(lessonProgress.userId, session.user.id), eq(lessons.courseId, lesson.courseId), eq(lessonProgress.completed, true))),
]);
```

---

### 7. SELECT * Over-fetching — Progress Route

**ไฟล์:** `src/app/api/progress/route.ts:26-65`  
**ผลกระทบ:** ดึง `content` (text field ขนาดใหญ่!) จาก lessons ทั้งที่ไม่ได้ใช้

```typescript
// ❌ SELECT * ดึง content field ด้วย (อาจใหญ่มาก)
const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);

// ✅ Select เฉพาะที่ใช้
const [lesson] = await db
  .select({ id: lessons.id, courseId: lessons.courseId, isFreePreview: lessons.isFreePreview })
  .from(lessons).where(eq(lessons.id, lessonId)).limit(1);

const [enrollment] = await db
  .select({ id: enrollments.id })
  .from(enrollments).where(...).limit(1);

const [existingProgress] = await db
  .select({ id: lessonProgress.id, completed: lessonProgress.completed, watchTimeSeconds: lessonProgress.watchTimeSeconds })
  .from(lessonProgress).where(...).limit(1);
```

---

### 8. LIKE `%text%` — Full Table Scan เมื่อค้นหาคอร์ส

**ไฟล์:** `src/app/api/courses/route.ts:30`

```typescript
// ❌ Leading wildcard ใช้ index ไม่ได้
conditions.push(like(courses.title, `%${search}%`));

// ✅ ทางเลือก 1 — MySQL FULLTEXT Index (แนะนำ)
// เพิ่มใน migration: ALTER TABLE courses ADD FULLTEXT INDEX ft_courses_title (title, description)
conditions.push(sql`MATCH(${courses.title}, ${courses.description}) AGAINST(${search} IN BOOLEAN MODE)`);

// ✅ ทางเลือก 2 — ยอมรับ LIKE แต่บังคับ minimum length
if (search.length >= 3) {
  conditions.push(like(courses.title, `%${search}%`));
}
```

---

### 9. Admin Blog — ไม่มี Pagination

**ไฟล์:** `src/app/api/admin/blog/route.ts:17-32`

```typescript
// ❌ ดึงทั้งหมดไม่มี limit
const posts = await db.select({...}).from(blogPosts).orderBy(desc(blogPosts.createdAt));

// ✅ เพิ่ม pagination
const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
const limit = 20;
const [posts, [{ total }]] = await Promise.all([
  db.select({...}).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit).offset((page - 1) * limit),
  db.select({ total: count() }).from(blogPosts),
]);
```

---

## 🔵 ข้อสังเกต

---

### 10. Courses Page เป็น Client Component ทั้งหมด

**ไฟล์:** `src/app/courses/page.tsx:1`

ปัจจุบัน: Browser โหลด JS → fetch `/api/courses` → แสดงผล (เห็น spinner ก่อน)  
ถ้าต้องการปรับ: ใช้ Server Component สำหรับ initial data + Client Component สำหรับ filter

**ข้อดีปัจจุบัน:** Filter/sort โดยไม่ต้อง full page reload  
**ข้อเสีย:** SEO ไม่เห็น course list ใน initial HTML

---

### 11. Double DB Call ใน `courses/[slug]/page.tsx`

**ไฟล์:** `src/app/courses/[slug]/page.tsx:30-34 และ 75-79`

`generateMetadata()` และ `getCourse()` ต่างก็ query `courses WHERE slug = ?` แยกกัน = 2 DB calls ต่อ 1 request  
ผลกระทบน้อยตอนนี้เพราะ `force-dynamic` แต่ถ้าเปลี่ยนเป็น ISR จะ cache พร้อมกัน

---

## Priority Action Plan

### ทำก่อน (ROI สูง)
1. **เพิ่ม DB Indexes** — แก้ schema + migrate → ผลทันทีกับทุก query
2. **แก้ N+1 ใน `getPublishedBundles()`** — แก้ 1 function ใน home page
3. **Parallelized queries ใน Dashboard** — เพิ่ม `Promise.all()` 3 บรรทัด

### ทำถัดไป
4. **เปลี่ยน `force-dynamic` เป็น ISR** — ลด DB load มาก (ต้องเพิ่ม `revalidatePath()` ใน admin)
5. **แก้ Correlated Subquery ใน Admin Reports** — LEFT JOIN แทน subquery
6. **แก้ SELECT * ใน progress route** — ลด data transfer
7. **เพิ่ม pagination ใน admin blog** — ป้องกัน scaling issue

---

## สิ่งที่ทำดีแล้ว ✅

| ไฟล์ | Pattern ที่ดี |
|------|--------------|
| `src/app/page.tsx:14-75` | `getFeaturedCourses()` ใช้ Subquery + LEFT JOIN แทน N+1 |
| `src/app/page.tsx:77-90` | `getStats()` ใช้ `Promise.all()` parallelized 3 queries |
| `src/app/api/courses/route.ts:77-126` | `Promise.all()` + batch tag fetch แทน N+1 |
| `src/app/dashboard/page.tsx:36-63` | `getUserEnrollments()` ใช้ IN clause + Map lookup |
| `src/app/api/courses/[slug]/reviews/route.ts:58-91` | `Promise.all()` สำหรับ list + count + stats |
| `src/app/blog/[slug]/page.tsx:97-110` | `Promise.all()` สำหรับ author + tags |
