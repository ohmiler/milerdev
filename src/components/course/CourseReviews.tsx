'use client';

import { useState, useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const reviewStyles = {
  section: 'mt-8',
  summary: 'mb-6 grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-[12rem_minmax(0,1fr)]',
  average: 'grid content-center justify-items-center gap-2 border-b pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6',
  score: 'text-4xl font-bold tracking-tight',
  total: 'text-sm text-muted-foreground',
  distribution: 'grid gap-2',
  distributionRow: 'grid grid-cols-[1rem_1rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm data-[muted=true]:opacity-40',
  distributionLabel: 'text-right',
  distributionStar: 'size-4 text-amber-400',
  distributionCount: 'text-right text-muted-foreground',
  actions: 'mb-5 flex flex-wrap items-center justify-between gap-3',
  actionControls: 'flex flex-wrap gap-2',
  select: 'h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
  filterClear: buttonVariants({ variant: 'ghost', size: 'sm' }),
  writeButton: buttonVariants(),
  form: 'mb-6 grid gap-5 rounded-xl border bg-card p-5',
  field: 'grid gap-2',
  label: 'text-sm font-medium',
  error: 'rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive',
  submit: buttonVariants({ className: 'w-fit' }),
  success: 'mb-5 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700',
  empty: 'grid justify-items-center gap-3 rounded-xl border border-dashed p-8 text-center text-muted-foreground',
  emptyIcon: 'size-10',
  emptyButton: 'mt-2',
  list: 'grid gap-3',
  row: 'rounded-xl border bg-card p-5',
  rowHeader: 'flex flex-wrap items-start justify-between gap-3',
  identity: 'flex items-center gap-3',
  avatar: 'flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
  nameLine: 'flex flex-wrap items-center gap-2',
  name: 'font-semibold',
  verified: 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700',
  date: 'mt-1 text-xs text-muted-foreground',
  comment: 'mt-4 leading-7 text-muted-foreground',
  pagination: 'mt-6 flex items-center justify-center gap-3',
  pageButton: buttonVariants({ variant: 'outline', size: 'sm' }),
  pageStatus: 'text-sm text-muted-foreground',
};

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
    <div className="flex gap-0.5 text-muted-foreground">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className="text-muted-foreground transition data-[active=true]:text-amber-400 data-[interactive=true]:cursor-pointer"
          data-active={star <= (hover || rating)}
          data-interactive={interactive}
          style={{ width: size, height: size }}
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
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-amber-400" style={{ width: pct + '%' }} />
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
    <section className={reviewStyles.section} aria-labelledby="course-reviews-title">
      <h2 className="mb-5 text-2xl font-bold tracking-tight" id="course-reviews-title">
        รีวิวจากผู้เรียน
      </h2>

      {/* Stats Summary */}
      {stats && stats.totalReviews > 0 && (
        <div className={reviewStyles.summary}>
          {/* Average */}
          <div className={reviewStyles.average}>
            <div className={reviewStyles.score}>
              {stats.avgRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(stats.avgRating)} size={20} />
            <div className={reviewStyles.total}>
              {stats.totalReviews} รีวิว
            </div>
          </div>

          {/* Distribution */}
          <div className={reviewStyles.distribution}>
            {[5, 4, 3, 2, 1].map(star => (
              <button
                key={star}
                onClick={() => setFilterRating(filterRating === star ? null : star)}
                className={reviewStyles.distributionRow}
                data-muted={Boolean(filterRating && filterRating !== star)}
              >
                <span className={reviewStyles.distributionLabel}>{star}</span>
                <svg className={reviewStyles.distributionStar} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <ReviewBar count={stats.distribution[star] || 0} total={stats.totalReviews} />
                <span className={reviewStyles.distributionCount}>
                  {stats.distribution[star] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={reviewStyles.actions}>
        <div className={reviewStyles.actionControls}>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
            className={reviewStyles.select}
          >
            <option value="latest">ล่าสุด</option>
            <option value="highest">คะแนนสูงสุด</option>
            <option value="lowest">คะแนนต่ำสุด</option>
          </select>
          {filterRating && (
            <button
              onClick={() => setFilterRating(null)}
              className={reviewStyles.filterClear}
            >
              ล้างตัวกรอง ({filterRating} ดาว) ✕
            </button>
          )}
        </div>

        {isEnrolled && !submitSuccess && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={reviewStyles.writeButton}
          >
            {showForm ? 'ยกเลิก' : 'เขียนรีวิว'}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className={reviewStyles.form}>
          <div className={reviewStyles.field}>
            <label className={reviewStyles.label}>
              คะแนน *
            </label>
            <StarRating rating={formRating} size={32} interactive onChange={setFormRating} />
          </div>
          <div className={reviewStyles.field}>
            <label className={reviewStyles.label}>
              ความคิดเห็น
            </label>
            <Textarea
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="แชร์ประสบการณ์การเรียนของคุณ..."
              rows={4}
            />
          </div>
          {submitError && (
            <div className={reviewStyles.error} role="alert">
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || formRating === 0}
            className={reviewStyles.submit}
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
          </button>
        </div>
      )}

      {submitSuccess && (
        <div className={reviewStyles.success} role="status">
          ขอบคุณสำหรับรีวิวของคุณ!
        </div>
      )}

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div className="grid gap-3" role="status" aria-label="กำลังโหลดรีวิว">
          <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
        </div>
      ) : reviews.length === 0 ? (
        <div className={reviewStyles.empty}>
          <svg className={reviewStyles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>{filterRating ? 'ไม่พบรีวิวที่ตรงกับตัวกรอง' : 'ยังไม่มีรีวิว'}</p>
          {isEnrolled && !submitSuccess && (
            <button
              onClick={() => setShowForm(true)}
              className={cn(reviewStyles.writeButton, reviewStyles.emptyButton)}
            >
              เป็นคนแรกที่รีวิว
            </button>
          )}
        </div>
      ) : (
        <div className={reviewStyles.list}>
          {reviews.map(review => (
            <article className={reviewStyles.row} key={review.id}>
              <div className={reviewStyles.rowHeader}>
                <div className={reviewStyles.identity}>
                  <div className={reviewStyles.avatar}>
                    {review.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className={reviewStyles.nameLine}>
                      <span className={reviewStyles.name}>
                        {review.displayName}
                      </span>
                      {review.isVerified && (
                        <span className={reviewStyles.verified}>
                          ผู้เรียนจริง
                        </span>
                      )}
                    </div>
                    <div className={reviewStyles.date}>
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} size={16} />
              </div>
              {review.comment && (
                <p className={reviewStyles.comment}>
                  {review.comment}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className={reviewStyles.pagination}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={reviewStyles.pageButton}
          >
            ก่อนหน้า
          </button>
          <span className={reviewStyles.pageStatus}>
            หน้า {currentPage} จาก {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className={reviewStyles.pageButton}
          >
            ถัดไป
          </button>
        </div>
      )}
    </section>
  );
}
