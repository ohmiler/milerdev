import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { users, enrollments, courses } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

async function getUserProfile(userId: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) return null;

    // Get enrollment stats
    const [enrollmentStats] = await db
        .select({ count: count() })
        .from(enrollments)
        .where(eq(enrollments.userId, userId));

    return {
        ...user,
        totalEnrollments: enrollmentStats?.count || 0,
    };
}

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const user = await getUserProfile(session.user.id);

    if (!user) {
        redirect('/login');
    }

    return (
        <>
            <Navbar />

            <main style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8fafc' }}>
                <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{
                            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                            fontWeight: 700,
                            color: '#1e293b',
                            marginBottom: '8px',
                        }}>
                            โปรไฟล์ของฉัน
                        </h1>
                        <p style={{ color: '#64748b' }}>
                            จัดการข้อมูลส่วนตัวของคุณ
                        </p>
                    </div>

                    {/* Profile Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    }}>
                        {/* Cover & Avatar */}
                        <div style={{
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            height: '120px',
                            position: 'relative',
                        }}>
                            <div style={{
                                position: 'absolute',
                                bottom: '-40px',
                                left: '32px',
                            }}>
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name || 'Avatar'}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            border: '4px solid white',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        border: '4px solid white',
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '2.5rem',
                                        fontWeight: 700,
                                    }}>
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div style={{ padding: '60px 32px 32px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                                    {user.name || 'ไม่ระบุชื่อ'}
                                </h2>
                                <p style={{ color: '#64748b' }}>{user.email}</p>
                            </div>

                            {/* Stats */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                padding: '20px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                marginBottom: '24px',
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>
                                        {user.totalEnrollments}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>คอร์สที่ลงทะเบียน</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                        {user.role === 'admin' ? 'Admin' : user.role === 'instructor' ? 'ผู้สอน' : 'นักเรียน'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>สถานะ</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' }) : '-'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>สมาชิกตั้งแต่</div>
                                </div>
                            </div>

                            {/* Edit Form */}
                            <ProfileForm user={user} />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
