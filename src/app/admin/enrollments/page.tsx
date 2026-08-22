'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

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
        ...(searchDebounce && { search: searchDebounce }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter, currentPage, searchDebounce]);

  useEffect(() => {
    if (showAddModal && users.length === 0) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!percent || percent === 0) return 'var(--muted-foreground)';
    if (percent < 50) return 'var(--color-warning-strong)';
    if (percent < 100) return 'var(--primary)';
    return 'var(--color-success-strong)';
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>
            จัดการการลงทะเบียน
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>ดูและจัดการการลงทะเบียนคอร์สของผู้ใช้</p>
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
              background: 'var(--muted)',
              color: 'var(--muted-foreground)',
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
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
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
          background: importResult.success && importResult.success > 0 ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
          border: `1px solid ${importResult.success && importResult.success > 0 ? 'var(--color-success-soft)' : 'var(--color-warning-soft)'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '12px', fontSize: '1rem' }}>
                ผลการนำเข้าข้อมูล
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>ทั้งหมด: </span>
                  <strong style={{ color: 'var(--foreground)' }}>{importResult.total}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>สำเร็จ: </span>
                  <strong style={{ color: 'var(--color-success-strong)' }}>{importResult.success}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>ข้าม: </span>
                  <strong style={{ color: 'var(--color-warning-strong)' }}>{importResult.skipped}</strong>
                </div>
              </div>

              {importResult.matchedAliases && importResult.matchedAliases.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                    คอร์สที่ match ชื่อใกล้เคียง ({importResult.matchedAliases.length}):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                    {importResult.matchedAliases.map((a, i) => (
                      <div key={i}>• {a}</div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.missingCourses && importResult.missingCourses.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-error-strong)', marginBottom: '4px' }}>
                    คอร์สที่ไม่พบในระบบใหม่ ({importResult.courseNotFound} คอร์ส):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-error-strong)' }}>
                    {importResult.missingCourses.map((c, i) => (
                      <div key={i}>• {c}</div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.missingUsers && importResult.missingUsers.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-warning-strong)', marginBottom: '4px' }}>
                    User ที่ไม่พบในระบบใหม่ ({importResult.userNotFound} คน):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-warning-strong)', maxHeight: '80px', overflowY: 'auto' }}>
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
                color: 'var(--muted-foreground)',
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
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>เรียนจบแล้ว</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success-strong)' }}>{stats.completed}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>กำลังเรียน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{stats.inProgress}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>ยังไม่เริ่ม</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>{stats.notStarted}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
          <svg
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: 'var(--muted-foreground)',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, คอร์ส..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'var(--card)',
            }}
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--card)',
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
          background: 'color-mix(in oklch, var(--foreground) 48%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '450px',
            margin: '16px',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: 'var(--foreground)' }}>
              เพิ่มการลงทะเบียนใหม่
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                ผู้ใช้
              </label>
              <select
                value={addForm.userId}
                onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'var(--card)',
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
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                คอร์ส
              </label>
              <select
                value={addForm.courseId}
                onChange={(e) => setAddForm({ ...addForm, courseId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'var(--card)',
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
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
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
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
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
        background: 'var(--card)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {loading && enrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            กำลังโหลด...
          </div>
        ) : enrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            ไม่พบการลงทะเบียน
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      ผู้ใช้
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      คอร์ส
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      ความคืบหน้า
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      วันที่ลงทะเบียน
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      สถานะ
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>
                        <div>
                          {enrollment.userId ? (
                            <Link
                              href={`/admin/users/${enrollment.userId}`}
                              className="block rounded-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                              style={{ marginBottom: '2px' }}
                            >
                              {enrollment.userName || 'ไม่ระบุชื่อ'}
                            </Link>
                          ) : (
                            <div style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '2px' }}>
                            {enrollment.userName || 'ไม่ระบุชื่อ'}
                            </div>
                          )}
                          <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                            {enrollment.userEmail || '-'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ color: 'var(--foreground)', fontSize: '0.875rem' }}>
                          {enrollment.courseTitle || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            background: 'var(--border)',
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
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', minWidth: '40px' }}>
                            {enrollment.progressPercent || 0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        {formatDate(enrollment.enrolledAt)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: enrollment.completedAt ? 'var(--color-success-soft)' : enrollment.progressPercent && enrollment.progressPercent > 0 ? 'var(--secondary)' : 'var(--muted)',
                          color: enrollment.completedAt ? 'var(--color-success-strong)' : enrollment.progressPercent && enrollment.progressPercent > 0 ? 'var(--primary)' : 'var(--muted-foreground)',
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
                            background: 'var(--color-error-soft)',
                            color: 'var(--color-error-strong)',
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
                borderTop: '1px solid var(--border)',
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--card)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ก่อนหน้า
                </button>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  หน้า {currentPage} จาก {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--card)',
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
