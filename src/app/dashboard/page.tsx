import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { enrollments, courses, lessons } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getUserEnrollments(userId: string) {
  // Get enrollments
  const userEnrollments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt));

  // Get courses and lesson counts for each enrollment
  const result = [];
  for (const enrollment of userEnrollments) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, enrollment.courseId),
    });

    if (course) {
      const [lessonCount] = await db
        .select({ count: count() })
        .from(lessons)
        .where(eq(lessons.courseId, enrollment.courseId));

      result.push({
        ...enrollment,
        course: {
          ...course,
          lessonCount: lessonCount?.count || 0,
        },
      });
    }
  }

  return result;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const userEnrollments = await getUserEnrollments(session.user.id);

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              สวัสดี, {session.user.name || 'นักเรียน'}! 👋
            </h1>
            <p style={{ color: '#64748b' }}>
              ยินดีต้อนรับกลับมา! ดูคอร์สที่คุณกำลังเรียนอยู่
            </p>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
                คอร์สที่ลงทะเบียน
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
                {userEnrollments.length}
              </div>
            </div>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
                คอร์สที่เรียนจบ
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>
                {userEnrollments.filter((e) => e.completedAt).length}
              </div>
            </div>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
                กำลังเรียน
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                {userEnrollments.filter((e) => !e.completedAt).length}
              </div>
            </div>
          </div>

          {/* My Courses */}
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '20px',
            }}>
              คอร์สของฉัน
            </h2>

            {userEnrollments.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '60px 40px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                  ยังไม่มีคอร์ส
                </h3>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                  เริ่มต้นเรียนรู้กับเราได้เลย!
                </p>
                <Link href="/courses" className="btn btn-primary">
                  ดูคอร์สทั้งหมด
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}>
                {userEnrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    style={{
                      display: 'block',
                      background: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      textDecoration: 'none',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      aspectRatio: '16/9',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      position: 'relative',
                    }}>
                      {enrollment.course.thumbnailUrl ? (
                        <img
                          src={enrollment.course.thumbnailUrl}
                          alt={enrollment.course.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}

                      {/* Completed Badge */}
                      {enrollment.completedAt && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: '#16a34a',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          ✓ เรียนจบแล้ว
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px' }}>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: '8px',
                        lineHeight: 1.4,
                      }}>
                        {enrollment.course.title}
                      </h3>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.875rem',
                        color: '#64748b',
                      }}>
                        <span>{enrollment.course.lessonCount} บทเรียน</span>
                        <span style={{
                          background: enrollment.completedAt ? '#dcfce7' : '#fef3c7',
                          color: enrollment.completedAt ? '#16a34a' : '#d97706',
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          {enrollment.completedAt ? 'เรียนจบแล้ว' : 'กำลังเรียน'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
