'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  isVerified: boolean;
  isHidden: boolean;
  createdAt: string;
  userId: string | null;
  courseId: string;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface Stats {
  total: number;
  avgRating: number;
  hidden: number;
  verified: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(courseFilter !== 'all' && { courseId: courseFilter }),
        ...(ratingFilter !== 'all' && { rating: ratingFilter }),
        ...(searchDebounce && { search: searchDebounce }),
      });
      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setCourses(data.courses || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [currentPage, courseFilter, ratingFilter, searchDebounce]);

  const toggleHidden = async (id: string, isHidden: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: !isHidden }),
      });
      if (res.ok) {
        showToast(isHidden ? 'แสดงรีวิวแล้ว' : 'ซ่อนรีวิวแล้ว', 'success');
        await fetchReviews();
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบรีวิวสำเร็จ', 'success');
        await fetchReviews();
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const reviewsData = Array.isArray(parsed) ? parsed : parsed.reviews;
      if (!Array.isArray(reviewsData)) {
        showToast('รูปแบบ JSON ไม่ถูกต้อง', 'error');
        return;
      }
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviewsData }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`นำเข้า ${data.imported} รีวิว (ข้าม ${data.skipped})`, 'success');
        setShowImport(false);
        setImportJson('');
        await fetchReviews();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('JSON ไม่ถูกต้อง กรุณาตรวจสอบ', 'error');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} style={{ width: 14, height: 14, color: s <= rating ? '#f59e0b' : '#d1d5db' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  if (loading && reviews.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>จัดการรีวิว</h1>
          <p style={{ color: '#64748b' }}>จัดการรีวิวคอร์สจากผู้เรียน</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          นำเข้ารีวิว (JSON)
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>รีวิวทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>คะแนนเฉลี่ย</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.avgRating || '-'}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้เรียนจริง</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{stats.verified}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ซ่อนอยู่</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{stats.hidden}</div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>นำเข้ารีวิวจาก JSON</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '12px' }}>
            รูปแบบ: [{`{ "courseId": "...", "rating": 5, "comment": "...", "displayName": "...", "isVerified": true, "createdAt": "2024-07-31" }`}]
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="วาง JSON ที่นี่..."
            rows={8}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              resize: 'vertical',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleImport}
              disabled={importing || !importJson.trim()}
              style={{
                padding: '10px 20px',
                background: importing ? '#94a3b8' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: importing ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {importing ? 'กำลังนำเข้า...' : 'นำเข้า'}
            </button>
            <button
              onClick={() => { setShowImport(false); setImportJson(''); }}
              style={{
                padding: '10px 20px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              ยกเลิก
            </button>
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
              color: '#94a3b8',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, คอร์ส, ความคิดเห็น..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
            }}
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem' }}
        >
          <option value="all">คอร์สทั้งหมด</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem' }}
        >
          <option value="all">คะแนนทั้งหมด</option>
          <option value="5">5 ดาว</option>
          <option value="4">4 ดาว</option>
          <option value="3">3 ดาว</option>
          <option value="2">2 ดาว</option>
          <option value="1">1 ดาว</option>
        </select>
      </div>

      {/* Reviews Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>ผู้รีวิว</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>คอร์ส</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>คะแนน</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem', minWidth: '200px' }}>ความคิดเห็น</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>สถานะ</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>วันที่</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: review.isHidden ? 0.5 : 1 }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: '2px' }}>
                      {review.displayName || review.userName || 'ไม่ระบุ'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {review.userEmail || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.875rem', color: '#1e293b' }}>
                    {review.courseTitle || '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {renderStars(review.rating)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{
                      fontSize: '0.8125rem',
                      color: '#334155',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {review.comment || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {review.isVerified && (
                        <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: '50px', fontSize: '0.6875rem' }}>
                          ผู้เรียนจริง
                        </span>
                      )}
                      {review.isHidden && (
                        <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: '50px', fontSize: '0.6875rem' }}>
                          ซ่อน
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDate(review.createdAt)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => toggleHidden(review.id, review.isHidden)}
                        title={review.isHidden ? 'แสดง' : 'ซ่อน'}
                        style={{
                          padding: '6px 10px',
                          background: review.isHidden ? '#dcfce7' : '#fef3c7',
                          color: review.isHidden ? '#16a34a' : '#d97706',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {review.isHidden ? 'แสดง' : 'ซ่อน'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(review.id)}
                        title="ลบ"
                        style={{
                          padding: '6px 10px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                    ยังไม่มีรีวิว
                  </td>
                </tr>
              )}
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
                fontSize: '0.875rem',
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
                fontSize: '0.875rem',
              }}
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบรีวิว"
        message="คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบ"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
