import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, lessons, enrollments, lessonProgress } from '@/lib/db/schema';
import { selectContinuationLesson } from '@/lib/learning-continuation';
import { eq, and, asc } from 'drizzle-orm';
import LessonList from '@/components/course/LessonList';

export const metadata: Metadata = {
    title: 'เริ่มเรียน',
    robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}

async function getCourseWithAccess(slug: string, userId: string) {
  // Get course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  // Check enrollment
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id)
      )
    )
    .limit(1);

  if (!enrollment) return null;

  const [courseLessons, courseProgress] = await Promise.all([
    db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.orderIndex)),
    db
      .select({
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
        lastWatchedAt: lessonProgress.lastWatchedAt,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessons.courseId, course.id),
        ),
      ),
  ]);

  return {
    course,
    enrollment,
    lessons: courseLessons,
    progress: courseProgress,
  };
}

export default async function LearnPage({ params, searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/courses/${slug}/learn`);
  }

  const { slug } = await params;
  const { payment } = await searchParams;
  const data = await getCourseWithAccess(slug, session.user.id);

  if (!data) {
    notFound();
  }

  const { course, lessons: courseLessons, progress } = data;

  const continuationLesson = selectContinuationLesson(courseLessons, progress);
  if (continuationLesson) {
    redirect(`/courses/${slug}/learn/${continuationLesson.id}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Payment Success Banner */}
      {payment === 'success' && (
        <div style={{
          background: 'linear-gradient(90deg, #16a34a, #22c55e)',
          color: 'white',
          padding: '16px 24px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <div>
            <strong>ชำระเงินสำเร็จ!</strong>
            <span style={{ marginLeft: '8px', opacity: 0.9 }}>
              ยินดีต้อนรับสู่คอร์ส {course.title} คุณสามารถเริ่มเรียนได้ทันที
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href={`/courses/${slug}`}
            style={{
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </Link>
          <h1 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 600 }}>
            {course.title}
          </h1>
        </div>
        <Link
          href="/dashboard"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          แดชบอร์ด
        </Link>
      </header>

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        minHeight: 'calc(100vh - 65px)',
      }}>
        {/* Video Area */}
        <div style={{ padding: '24px' }}>
          <div style={{
            aspectRatio: '16/9',
            background: '#1e293b',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>เลือกบทเรียนเพื่อเริ่มเรียน</p>
            </div>
          </div>

          <div style={{ color: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>
              ยินดีต้อนรับสู่คอร์ส!
            </h2>
            <p style={{ color: '#94a3b8' }}>
              เลือกบทเรียนจากเมนูด้านขวาเพื่อเริ่มต้นเรียน
            </p>
          </div>
        </div>

        {/* Lessons Sidebar */}
        <div style={{
          background: '#1e293b',
          borderLeft: '1px solid #334155',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #334155',
            position: 'sticky',
            top: 0,
            background: '#1e293b',
          }}>
            <h3 style={{ color: 'white', fontWeight: 600 }}>
              เนื้อหาคอร์ส ({courseLessons.length} บท)
            </h3>
          </div>

          <div style={{ padding: '8px' }}>
            <LessonList lessons={courseLessons} courseSlug={slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
