'use client';

import { useState, useEffect, useRef } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

interface Enrollment {
  id: string;
  userId: string | null;
  courseId: string | null;
  enrolledAt: string;
  progressPercent: number | null;
  completedAt: string | null;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  coursePrice: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Filters
  const [courseFilter, setCourseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Add enrollment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '', courseId: '' });
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Import CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success?: number;
    skipped?: number;
    userNotFound?: number;
    courseNotFound?: number;
    total?: number;
    errors?: string[];
    missingUsers?: string[];
    missingCourses?: string[];
    matchedAliases?: string[];
  } | null>(null);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        courseId: courseFilter,
      });
      
      const res = await fetch(`/api/admin/enrollments?${params}`);
      const data = await res.json();
      
      setEnrollments(data.enrollments || []);
      setCourses(data.courses || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [courseFilter, currentPage]);

  useEffect(() => {
    if (showAddModal && users.length === 0) {
      fetchUsers();
    }
  }, [showAddModal]);

  const confirmDeleteEnrollment = async () => {
    if (!deleteConfirm) return;
    const enrollmentId = deleteConfirm;
    setDeleteConfirm(null);
    
    setUpdating(enrollmentId);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchEnrollments();
        showToast('ลบการลงทะเบียนสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.userId || !addForm.courseId) {
      showToast('กรุณาเลือกผู้ใช้และคอร์ส', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        await fetchEnrollments();
        setShowAddModal(false);
        setAddForm({ userId: '', courseId: '' });
        showToast('เพิ่มการลงทะเบียนสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/enrollments/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(data.results);
        await fetchEnrollments();
        showToast(`นำเข้าสำเร็จ ${data.results?.success || 0} รายการ`, 'success');
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProgressColor = (percent: number | null) => {
    if (!percent || percent === 0) return '#94a3b8';
    if (percent < 50) return '#f59e0b';
    if (percent < 100) return '#3b82f6';
    return '#16a34a';
  };

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            จัดการการลงทะเบียน
          </h1>
          <p style={{ color: '#64748b' }}>ดูและจัดการการลงทะเบียนคอร์สของผู้ใช้</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              padding: '12px 20px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: importing ? 'not-allowed' : 'pointer',
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? 'กำลังนำเข้า...' : 'ไฟล์ CSV นำเข้าจากเว็บเก่า'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '12px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + เพิ่มการลงทะเบียน
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div style={{
          background: importResult.success && importResult.success > 0 ? '#f0fdf4' : '#fefce8',
          border: `1px solid ${importResult.success && importResult.success > 0 ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '12px', fontSize: '1rem' }}>
                ผลการนำเข้าข้อมูล
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>ทั้งหมด: </span>
                  <strong style={{ color: '#1e293b' }}>{importResult.total}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>สำเร็จ: </span>
                  <strong style={{ color: '#16a34a' }}>{importResult.success}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>ข้าม: </span>
                  <strong style={{ color: '#d97706' }}>{importResult.skipped}</strong>
                </div>
              </div>

              {importResult.matchedAliases && importResult.matchedAliases.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>
                    คอร์สที่ match ชื่อใกล้เคียง ({importResult.matchedAliases.length}):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
                    {importResult.matchedAliases.map((a, i) => (
                      <div key={i}>• {a}</div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.missingCourses && importResult.missingCourses.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                    คอร์สที่ไม่พบในระบบใหม่ ({importResult.courseNotFound} คอร์ส):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                    {importResult.missingCourses.map((c, i) => (
                      <div key={i}>• {c}</div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.missingUsers && importResult.missingUsers.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', marginBottom: '4px' }}>
                    User ที่ไม่พบในระบบใหม่ ({importResult.userNotFound} คน):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', maxHeight: '80px', overflowY: 'auto' }}>
                    {importResult.missingUsers.map((u, i) => (
                      <span key={i} style={{ marginRight: '8px' }}>{u}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: '#64748b',
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>เรียนจบแล้ว</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{stats.completed}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>กำลังเรียน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{stats.inProgress}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ยังไม่เริ่ม</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#94a3b8' }}>{stats.notStarted}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '24px' }}>
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
            minWidth: '200px',
          }}
        >
          <option value="all">คอร์สทั้งหมด</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '450px',
            margin: '16px',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
              เพิ่มการลงทะเบียนใหม่
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                ผู้ใช้
              </label>
              <select
                value={addForm.userId}
                onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'white',
                }}
              >
                <option value="">-- เลือกผู้ใช้ --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                คอร์ส
              </label>
              <select
                value={addForm.courseId}
                onChange={(e) => setAddForm({ ...addForm, courseId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'white',
                }}
              >
                <option value="">-- เลือกคอร์ส --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAddModal(false); setAddForm({ userId: '', courseId: '' }); }}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  opacity: adding ? 0.7 : 1,
                }}
              >
                {adding ? 'กำลังเพิ่ม...' : 'เพิ่มการลงทะเบียน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            กำลังโหลด...
          </div>
        ) : enrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ไม่พบการลงทะเบียน
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      ผู้ใช้
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      คอร์ส
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      ความคืบหน้า
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      วันที่ลงทะเบียน
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      สถานะ
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: '2px' }}>
                          {enrollment.userName || 'ไม่ระบุชื่อ'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {enrollment.userEmail || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ color: '#1e293b', fontSize: '0.875rem' }}>
                          {enrollment.courseTitle || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
                            }} />
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#64748b', minWidth: '40px' }}>
                            {enrollment.progressPercent || 0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDate(enrollment.enrolledAt)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: enrollment.completedAt ? '#dcfce7' : enrollment.progressPercent && enrollment.progressPercent > 0 ? '#dbeafe' : '#f1f5f9',
                          color: enrollment.completedAt ? '#16a34a' : enrollment.progressPercent && enrollment.progressPercent > 0 ? '#2563eb' : '#64748b',
                        }}>
                          {enrollment.completedAt ? 'เรียนจบ' : enrollment.progressPercent && enrollment.progressPercent > 0 ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setDeleteConfirm(enrollment.id)}
                          disabled={updating === enrollment.id}
                          style={{
                            padding: '6px 12px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: updating === enrollment.id ? 'not-allowed' : 'pointer',
                            opacity: updating === enrollment.id ? 0.7 : 1,
                          }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ก่อนหน้า
                </button>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  หน้า {currentPage} จาก {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                  }}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบการลงทะเบียน"
        message="คุณแน่ใจหรือไม่ที่จะลบการลงทะเบียนนี้?"
        confirmText="ลบ"
        onConfirm={confirmDeleteEnrollment}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
