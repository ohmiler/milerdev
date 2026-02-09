'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
}

interface Enrollment {
  id: string;
  courseId: string | null;
  enrolledAt: string | null;
  progressPercent: number | null;
  completedAt: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  coursePrice: string | null;
  courseImage: string | null;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/enrollments`);
      if (!res.ok) {
        showToast('ไม่พบข้อมูลผู้ใช้', 'error');
        router.push('/admin/users');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setEnrollments(data.enrollments || []);
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

  const handleUnenroll = async (enrollmentId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('ยกเลิกการลงทะเบียนสำเร็จ', 'success');
        await fetchUserData();
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return { background: '#fef2f2', color: '#dc2626' };
      case 'instructor': return { background: '#f0fdf4', color: '#16a34a' };
      default: return { background: '#eff6ff', color: '#2563eb' };
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'instructor': return 'ผู้สอน';
      default: return 'นักเรียน';
    }
  };

  const getProgressColor = (percent: number | null) => {
    if (!percent || percent === 0) return '#94a3b8';
    if (percent === 100) return '#16a34a';
    if (percent >= 50) return '#f59e0b';
    return '#3b82f6';
  };

  const completedCount = enrollments.filter(e => e.completedAt).length;
  const inProgressCount = enrollments.filter(e => !e.completedAt && (e.progressPercent ?? 0) > 0).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: '#64748b', fontSize: '1rem' }}>กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      {/* Back button + Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => router.push('/admin/users')}
          style={{
            padding: '8px 16px',
            background: 'none',
            color: '#64748b',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← กลับไปหน้ารายชื่อผู้ใช้
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.5rem',
            flexShrink: 0,
          }}>
            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {user.name || 'ไม่ระบุชื่อ'}
            </h1>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
              {user.email}
              <span style={{
                marginLeft: '12px',
                padding: '2px 10px',
                borderRadius: '50px',
                fontSize: '0.7rem',
                fontWeight: 600,
                ...getRoleStyle(user.role),
              }}>
                {getRoleText(user.role)}
              </span>
              <span style={{ marginLeft: '12px', color: '#94a3b8' }}>
                สมัครเมื่อ {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>คอร์สที่ลงทะเบียน</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>{enrollments.length}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>เรียนจบ</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>{completedCount}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>กำลังเรียน</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>{inProgressCount}</div>
        </div>
      </div>

      {/* Enrollments Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            คอร์สที่ลงทะเบียน ({enrollments.length})
          </h2>
        </div>

        {enrollments.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
            ยังไม่มีคอร์สที่ลงทะเบียน
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
                    คอร์ส
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
                    ความคืบหน้า
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
                    วันที่ลงทะเบียน
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
                    สถานะ
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>
                        {enrollment.courseTitle || 'คอร์สที่ถูกลบ'}
                      </div>
                      {enrollment.coursePrice && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          {parseFloat(enrollment.coursePrice) === 0 ? 'ฟรี' : `฿${parseFloat(enrollment.coursePrice).toLocaleString()}`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <div style={{
                          width: '60px',
                          height: '6px',
                          background: '#e2e8f0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${enrollment.progressPercent || 0}%`,
                            height: '100%',
                            background: getProgressColor(enrollment.progressPercent),
                            borderRadius: '3px',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '32px' }}>
                          {enrollment.progressPercent || 0}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                      {formatDate(enrollment.enrolledAt)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {enrollment.completedAt ? (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#f0fdf4',
                          color: '#16a34a',
                        }}>
                          เรียนจบ
                        </span>
                      ) : (enrollment.progressPercent ?? 0) > 0 ? (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#fffbeb',
                          color: '#d97706',
                        }}>
                          กำลังเรียน
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#94a3b8',
                        }}>
                          ยังไม่เริ่ม
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteConfirm(enrollment.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ยกเลิกการลงทะเบียน"
        message="คุณต้องการยกเลิกการลงทะเบียนคอร์สนี้หรือไม่? ข้อมูลความคืบหน้าจะถูกลบด้วย"
        confirmText={deleting ? 'กำลังดำเนินการ...' : 'ยกเลิกการลงทะเบียน'}
        onConfirm={() => deleteConfirm && handleUnenroll(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
