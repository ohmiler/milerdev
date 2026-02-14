'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string;
  isVerified: boolean;
  createdAt: string;
}

interface Stats {
  avgRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CourseReviewsProps {
  courseSlug: string;
  isEnrolled: boolean;
}

function StarRating({ rating, size = 16, interactive = false, onChange }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          style={{
            width: size,
            height: size,
            cursor: interactive ? 'pointer' : 'default',
            color: star <= (hover || rating) ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.1s',
          }}
          fill="currentColor"
          viewBox="0 0 24 24"
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{
      flex: 1,
      height: '8px',
      background: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: '#f59e0b',
        borderRadius: '4px',
        transition: 'width 0.3s',
      }} />
    </div>
  );
}

export default function CourseReviews({ courseSlug, isEnrolled }: CourseReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('latest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sort,
        ...(filterRating ? { rating: filterRating.toString() } : {}),
      });
      const res = await fetch(`/api/courses/${courseSlug}/reviews?${params}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sort, filterRating]);

  const handleSubmit = async () => {
    if (formRating === 0) {
      setSubmitError('กรุณาให้คะแนน');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/courses/${courseSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: formRating, comment: formComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }
      setSubmitSuccess(true);
      setShowForm(false);
      setFormRating(0);
      setFormComment('');
      setCurrentPage(1);
      await fetchReviews();
    } catch {
      setSubmitError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div style={{ marginTop: '48px' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '24px',
        color: '#1e293b',
      }}>
        รีวิวจากผู้เรียน
      </h2>

      {/* Stats Summary */}
      {stats && stats.totalReviews > 0 && (
        <div style={{
          display: 'flex',
          gap: '32px',
          marginBottom: '32px',
          padding: '24px',
          background: '#f8fafc',
          borderRadius: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Average */}
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
              {stats.avgRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(stats.avgRating)} size={20} />
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
              {stats.totalReviews} รีวิว
            </div>
          </div>

          {/* Distribution */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            {[5, 4, 3, 2, 1].map(star => (
              <button
                key={star}
                onClick={() => setFilterRating(filterRating === star ? null : star)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '3px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: filterRating && filterRating !== star ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#64748b', width: '12px' }}>{star}</span>
                <svg style={{ width: 14, height: 14, color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <ReviewBar count={stats.distribution[star] || 0} total={stats.totalReviews} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: '28px', textAlign: 'right' }}>
                  {stats.distribution[star] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem',
            }}
          >
            <option value="latest">ล่าสุด</option>
            <option value="highest">คะแนนสูงสุด</option>
            <option value="lowest">คะแนนต่ำสุด</option>
          </select>
          {filterRating && (
            <button
              onClick={() => setFilterRating(null)}
              style={{
                padding: '6px 12px',
                background: '#eff6ff',
                color: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              ล้างตัวกรอง ({filterRating} ดาว) ✕
            </button>
          )}
        </div>

        {isEnrolled && !submitSuccess && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {showForm ? 'ยกเลิก' : 'เขียนรีวิว'}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div style={{
          padding: '24px',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1e293b' }}>
              คะแนน *
            </label>
            <StarRating rating={formRating} size={32} interactive onChange={setFormRating} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1e293b' }}>
              ความคิดเห็น
            </label>
            <textarea
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="แชร์ประสบการณ์การเรียนของคุณ..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
          </div>
          {submitError && (
            <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '12px' }}>
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || formRating === 0}
            style={{
              padding: '10px 24px',
              background: submitting ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
          </button>
        </div>
      )}

      {submitSuccess && (
        <div style={{
          padding: '16px 20px',
          background: '#dcfce7',
          color: '#16a34a',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '0.875rem',
        }}>
          ขอบคุณสำหรับรีวิวของคุณ!
        </div>
      )}

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          กำลังโหลดรีวิว...
        </div>
      ) : reviews.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: '12px',
        }}>
          <svg style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>{filterRating ? 'ไม่พบรีวิวที่ตรงกับตัวกรอง' : 'ยังไม่มีรีวิว'}</p>
          {isEnrolled && !submitSuccess && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              เป็นคนแรกที่รีวิว
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map(review => (
            <div key={review.id} style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    {review.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        {review.displayName}
                      </span>
                      {review.isVerified && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#dcfce7',
                          color: '#16a34a',
                          borderRadius: '50px',
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                        }}>
                          ผู้เรียนจริง
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} size={16} />
              </div>
              {review.comment && (
                <p style={{
                  color: '#334155',
                  lineHeight: 1.7,
                  fontSize: '0.9375rem',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}>
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '24px',
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
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
              borderRadius: '8px',
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
  );
}
