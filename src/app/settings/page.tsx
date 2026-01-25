import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
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

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        opacity: 0.6,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <svg style={{ width: '20px', height: '20px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        <div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>เปลี่ยนรหัสผ่าน</div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>เร็วๆ นี้</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', color: '#64748b' }}>
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
                                การแจ้งเตือน
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <svg style={{ width: '20px', height: '20px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>แจ้งเตือนทางอีเมล</div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>รับข่าวสารและอัพเดทคอร์ส</div>
                                        </div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                                        <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{
                                            position: 'absolute',
                                            cursor: 'pointer',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: '#2563eb',
                                            borderRadius: '24px',
                                            transition: '0.3s',
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: '',
                                                height: '18px',
                                                width: '18px',
                                                left: '26px',
                                                bottom: '3px',
                                                background: 'white',
                                                borderRadius: '50%',
                                                transition: '0.3s',
                                            }} />
                                        </span>
                                    </label>
                                </div>
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
