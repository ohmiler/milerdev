import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, enrollments, users, lessonProgress, lessons } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ page?: string }>;
}

async function getCourseWithEnrollments(courseId: string, page: number) {
    const perPage = 25;
    const offset = (page - 1) * perPage;

    // Get course info
    const [course] = await db
        .select({
            id: courses.id,
            title: courses.title,
            slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);

    if (!course) return null;

    // Total lesson count for this course
    const [lessonCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .where(eq(lessons.courseId, courseId));
    const totalLessons = lessonCountResult?.count || 0;

    // Total enrollment count
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId));
    const totalEnrollments = countResult?.count || 0;

    // Get enrolled users with progress
    const enrolledUsers = await db
        .select({
            enrollmentId: enrollments.id,
            enrolledAt: enrollments.enrolledAt,
            progressPercent: enrollments.progressPercent,
            completedAt: enrollments.completedAt,
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userAvatar: users.avatarUrl,
            completedLessons: sql<number>`count(distinct ${lessonProgress.lessonId})`.as('completed_lessons'),
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.userId, users.id))
        .leftJoin(
            lessonProgress,
            and(
                eq(lessonProgress.userId, users.id),
                eq(lessonProgress.completed, true),
                sql`${lessonProgress.lessonId} IN (SELECT id FROM lessons WHERE course_id = ${courseId})`
            )
        )
        .where(eq(enrollments.courseId, courseId))
        .groupBy(enrollments.id, users.id)
        .orderBy(desc(enrollments.enrolledAt))
        .limit(perPage)
        .offset(offset);

    return {
        course,
        totalLessons,
        totalEnrollments,
        enrolledUsers,
        page,
        totalPages: Math.ceil(totalEnrollments / perPage),
    };
}

export default async function CourseEnrollmentsPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { page: pageStr } = await searchParams;
    const page = Math.max(1, parseInt(pageStr || '1'));

    const data = await getCourseWithEnrollments(id, page);
    if (!data) notFound();

    const { course, totalLessons, totalEnrollments, enrolledUsers, totalPages } = data;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <Link
                    href="/admin/courses"
                    style={{
                        color: '#64748b',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '12px',
                    }}
                >
                    &larr; กลับไปจัดการคอร์ส
                </Link>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                    ผู้เรียน: {course.title}
                </h1>
                <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.875rem' }}>
                    <span>ผู้ลงทะเบียนทั้งหมด: <strong style={{ color: '#1e293b' }}>{totalEnrollments} คน</strong></span>
                    <span>บทเรียนทั้งหมด: <strong style={{ color: '#1e293b' }}>{totalLessons} บท</strong></span>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
            }}>
                {[
                    {
                        label: 'ลงทะเบียนทั้งหมด',
                        value: totalEnrollments,
                        color: '#2563eb',
                        bg: '#eff6ff',
                    },
                    {
                        label: 'เรียนจบแล้ว',
                        value: enrolledUsers.filter(u => u.completedAt).length,
                        color: '#16a34a',
                        bg: '#f0fdf4',
                    },
                    {
                        label: 'กำลังเรียน',
                        value: enrolledUsers.filter(u => !u.completedAt && (u.progressPercent || 0) > 0).length,
                        color: '#d97706',
                        bg: '#fffbeb',
                    },
                    {
                        label: 'ยังไม่เริ่มเรียน',
                        value: enrolledUsers.filter(u => !u.completedAt && (u.progressPercent || 0) === 0).length,
                        color: '#64748b',
                        bg: '#f8fafc',
                    },
                ].map((stat) => (
                    <div key={stat.label} style={{
                        background: stat.bg,
                        borderRadius: '12px',
                        padding: '16px 20px',
                    }}>
                        <div style={{ fontSize: '0.8125rem', color: stat.color, marginBottom: '4px' }}>{stat.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                                ผู้เรียน
                            </th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                                ความคืบหน้า
                            </th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                                บทเรียนที่เรียนจบ
                            </th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                                สถานะ
                            </th>
                            <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                                วันที่ลงทะเบียน
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrolledUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                    ยังไม่มีผู้ลงทะเบียนในคอร์สนี้
                                </td>
                            </tr>
                        ) : (
                            enrolledUsers.map((user) => {
                                const progress = user.progressPercent || 0;
                                const isCompleted = !!user.completedAt;
                                const isInProgress = !isCompleted && progress > 0;

                                return (
                                    <tr key={user.enrollmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: '#e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    flexShrink: 0,
                                                    overflow: 'hidden',
                                                }}>
                                                    {user.userAvatar ? (
                                                        <img src={user.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (user.userName || user.userEmail)?.[0]?.toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                                                        {user.userName || 'ไม่ระบุชื่อ'}
                                                    </div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                        {user.userEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                <div style={{
                                                    width: '80px',
                                                    height: '6px',
                                                    background: '#e2e8f0',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${progress}%`,
                                                        height: '100%',
                                                        background: isCompleted ? '#16a34a' : '#2563eb',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.3s',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 500, minWidth: '36px' }}>
                                                    {progress}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>
                                            {user.completedLessons}/{totalLessons}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '50px',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                background: isCompleted ? '#dcfce7' : isInProgress ? '#fef3c7' : '#f1f5f9',
                                                color: isCompleted ? '#16a34a' : isInProgress ? '#d97706' : '#94a3b8',
                                            }}>
                                                {isCompleted ? 'เรียนจบ' : isInProgress ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8125rem', color: '#64748b' }}>
                                            {user.enrolledAt ? new Date(user.enrolledAt).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            }) : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '16px',
                        borderTop: '1px solid #e2e8f0',
                    }}>
                        {page > 1 && (
                            <Link
                                href={`/admin/courses/${id}/enrollments?page=${page - 1}`}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    color: '#475569',
                                    fontSize: '0.875rem',
                                }}
                            >
                                &larr; ก่อนหน้า
                            </Link>
                        )}
                        <span style={{ padding: '6px 12px', fontSize: '0.875rem', color: '#64748b' }}>
                            หน้า {page} / {totalPages}
                        </span>
                        {page < totalPages && (
                            <Link
                                href={`/admin/courses/${id}/enrollments?page=${page + 1}`}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    color: '#475569',
                                    fontSize: '0.875rem',
                                }}
                            >
                                ถัดไป &rarr;
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
