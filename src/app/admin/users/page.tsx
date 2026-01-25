import { db } from '@/lib/db';
import { users, enrollments } from '@/lib/db/schema';
import { desc, count, eq, sql } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getUsers() {
    // Get users with enrollment counts
    const userList = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE enrollments.user_id = ${users.id})`,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

    return userList;
}

export default async function AdminUsersPage() {
    const userList = await getUsers();

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                        จัดการผู้ใช้
                    </h1>
                    <p style={{ color: '#64748b' }}>ผู้ใช้ทั้งหมด {userList.length} คน</p>
                </div>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
            }}>
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้ใช้ทั้งหมด</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{userList.length}</div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>Admin</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                        {userList.filter(u => u.role === 'admin').length}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้สอน</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                        {userList.filter(u => u.role === 'instructor').length}
                    </div>
                </div>
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>นักเรียน</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                        {userList.filter(u => u.role === 'student').length}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                ผู้ใช้
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                สถานะ
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                คอร์สที่ลงทะเบียน
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                                วันที่สมัคร
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {userList.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 600,
                                        }}>
                                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                                {user.name || 'ไม่ระบุชื่อ'}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: user.role === 'admin' ? '#fef2f2' : user.role === 'instructor' ? '#fef3c7' : '#dcfce7',
                                        color: user.role === 'admin' ? '#dc2626' : user.role === 'instructor' ? '#d97706' : '#16a34a',
                                    }}>
                                        {user.role === 'admin' ? 'Admin' : user.role === 'instructor' ? 'ผู้สอน' : 'นักเรียน'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', color: '#64748b' }}>
                                    {user.enrollmentCount} คอร์ส
                                </td>
                                <td style={{ padding: '16px', color: '#64748b', fontSize: '0.875rem' }}>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    }) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {userList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        ยังไม่มีผู้ใช้
                    </div>
                )}
            </div>
        </div>
    );
}
