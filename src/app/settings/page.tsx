import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

    const hasPassword = !!user?.passwordHash;

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
                            ตั้งค่า
                        </h1>
                        <p style={{ color: '#64748b' }}>
                            จัดการการตั้งค่าบัญชีของคุณ
                        </p>
                    </div>

                    {/* Settings Sections */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Account Settings */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
                                บัญชี
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <Link
                                    href="/profile"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <svg style={{ width: '20px', height: '20px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>แก้ไขโปรไฟล์</div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>เปลี่ยนชื่อและรูปโปรไฟล์</div>
                                        </div>
                                    </div>
                                    <svg style={{ width: '20px', height: '20px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>

                                <ChangePasswordForm hasPassword={hasPassword} />
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #fecaca',
                        }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#dc2626', marginBottom: '20px' }}>
                                โซนอันตราย
                            </h2>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: '#fef2f2',
                                borderRadius: '12px',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, color: '#dc2626' }}>ลบบัญชี</div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>ลบบัญชีและข้อมูลทั้งหมดอย่างถาวร</div>
                                </div>
                                <button
                                    style={{
                                        padding: '8px 16px',
                                        background: 'white',
                                        border: '1px solid #dc2626',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontWeight: 500,
                                        cursor: 'not-allowed',
                                        opacity: 0.5,
                                    }}
                                    disabled
                                >
                                    ลบบัญชี
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
