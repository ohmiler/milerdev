'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  buildCourseReviewHref,
  normalizeCourseReviewQuery,
  type CourseReviewQuery,
  type CourseReviewSort,
} from '@/lib/course-review-query';
import { cn } from '@/lib/utils';

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

function StarRating({ rating, interactive = false, onChange }: {
  rating: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const stars = [1, 2, 3, 4, 5];

  if (interactive) {
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        value={rating > 0 ? String(rating) : ''}
        onValueChange={(value) => value && onChange?.(Number(value))}
        aria-label="คะแนนรีวิว"
      >
        {stars.map(star => (
          <ToggleGroupItem key={star} value={String(star)} size="sm" aria-label={`${star} ดาว`}>
            <Star fill={star <= rating ? 'currentColor' : 'none'} aria-hidden="true" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <div className="flex gap-0.5" aria-label={`${rating} จาก 5 ดาว`}>
      {stars.map(star => (
        <Star
          key={star}
          className={cn('size-4', star <= rating ? 'text-primary' : 'text-muted-foreground')}
          fill={star <= rating ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ReviewBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return <Progress value={pct} aria-label={`${count} จาก ${total} รีวิว`} />;
}

export default function CourseReviews({ courseSlug, isEnrolled }: CourseReviewsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewSortParam = searchParams.get('reviewSort') ?? undefined;
  const reviewRatingParam = searchParams.get('reviewRating') ?? undefined;
  const reviewPageParam = searchParams.get('reviewPage') ?? undefined;
  const normalized = useMemo(() => normalizeCourseReviewQuery({
    reviewSort: reviewSortParam,
    reviewRating: reviewRatingParam,
    reviewPage: reviewPageParam,
  }), [reviewPageParam, reviewRatingParam, reviewSortParam]);
  const { sort, rating: filterRating, page: currentPage } = normalized.query;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const updateReviewQuery = useCallback((overrides: Partial<CourseReviewQuery>) => {
    router.push(
      buildCourseReviewHref(pathname, searchParams, normalized.query, overrides),
      { scroll: false },
    );
  }, [normalized.query, pathname, router, searchParams]);

  const fetchReviews = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sort,
        ...(filterRating ? { rating: filterRating.toString() } : {}),
      });
      const res = await fetch(`/api/courses/${courseSlug}/reviews?${params}`, { signal });
      if (!res.ok) throw new Error('Review request failed');
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      setFetchError('ไม่สามารถโหลดรีวิวได้ในขณะนี้');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [courseSlug, currentPage, filterRating, sort]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchReviews(controller.signal);
    return () => controller.abort();
  }, [fetchReviews]);

  useEffect(() => {
    if (!normalized.isCanonical) {
      router.replace(
        buildCourseReviewHref(pathname, searchParams, normalized.query),
        { scroll: false },
      );
    }
  }, [normalized.isCanonical, normalized.query, pathname, router, searchParams]);

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
      if (currentPage === 1) {
        await fetchReviews();
      } else {
        updateReviewQuery({ page: 1 });
      }
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
    <div className="mt-5">
      {/* Stats Summary */}
      {stats && stats.totalReviews > 0 && (
        <Card className="mb-6">
          <CardHeader className="sr-only">
            <CardTitle>สรุปคะแนนรีวิว</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="grid content-center justify-items-center gap-2 border-b pb-5 md:border-r md:border-b-0 md:pr-6 md:pb-0">
              <div className="text-4xl font-bold tracking-tight">{stats.avgRating.toFixed(1)}</div>
              <StarRating rating={Math.round(stats.avgRating)} />
              <div className="text-sm text-muted-foreground">{stats.totalReviews} รีวิว</div>
            </div>

            <div className="grid gap-2">
              {[5, 4, 3, 2, 1].map(star => (
                <Button
                  key={star}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateReviewQuery({
                    rating: filterRating === star ? null : star,
                    page: 1,
                  })}
                  className="grid h-auto grid-cols-[1rem_1rem_minmax(0,1fr)_2rem] justify-normal gap-2"
                  data-muted={Boolean(filterRating && filterRating !== star)}
                  aria-pressed={filterRating === star}
                >
                  <span className="text-right">{star}</span>
                  <Star data-icon="inline-start" fill="currentColor" aria-hidden="true" />
                  <ReviewBar count={stats.distribution[star] || 0} total={stats.totalReviews} />
                  <span className="text-right text-muted-foreground">{stats.distribution[star] || 0}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            value={sort}
            onChange={(event) => updateReviewQuery({
              sort: event.target.value as CourseReviewSort,
              page: 1,
            })}
            aria-label="เรียงรีวิว"
          >
            <NativeSelectOption value="latest">ล่าสุด</NativeSelectOption>
            <NativeSelectOption value="highest">คะแนนสูงสุด</NativeSelectOption>
            <NativeSelectOption value="lowest">คะแนนต่ำสุด</NativeSelectOption>
          </NativeSelect>
          {filterRating && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateReviewQuery({ rating: null, page: 1 })}
            >
              ล้างตัวกรอง ({filterRating} ดาว) ✕
            </Button>
          )}
        </div>

        {isEnrolled && !submitSuccess && (
          <Button
            type="button"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'ยกเลิก' : 'เขียนรีวิว'}
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form
          className="mb-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>เขียนรีวิวคอร์สนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(submitError && formRating === 0) || undefined}>
                  <FieldLabel>คะแนน *</FieldLabel>
                  <StarRating rating={formRating} interactive onChange={setFormRating} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-review-comment">ความคิดเห็น</FieldLabel>
                  <Textarea
                    id="course-review-comment"
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder="แชร์ประสบการณ์การเรียนของคุณ..."
                    rows={4}
                  />
                </Field>
                {submitError && (
                  <Alert variant="destructive">
                    <AlertTitle>ส่งรีวิวไม่สำเร็จ</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={submitting || formRating === 0}
                aria-busy={submitting}
              >
                {submitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
                {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {submitSuccess && (
        <Alert className="mb-5" role="status">
          <AlertTitle>ส่งรีวิวแล้ว</AlertTitle>
          <AlertDescription>ขอบคุณสำหรับรีวิวของคุณ!</AlertDescription>
        </Alert>
      )}

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div className="grid gap-3" role="status" aria-label="กำลังโหลดรีวิว">
          <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
        </div>
      ) : fetchError ? (
        <Alert variant="destructive">
          <AlertTitle>โหลดรีวิวไม่สำเร็จ</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchReviews()}>
              ลองโหลดรีวิวอีกครั้ง
            </Button>
          </AlertDescription>
        </Alert>
      ) : reviews.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{filterRating ? 'ไม่พบรีวิวที่ตรงกับตัวกรอง' : 'ยังไม่มีรีวิว'}</EmptyTitle>
            <EmptyDescription>
              {filterRating ? 'ลองล้างตัวกรองเพื่อดูรีวิวทั้งหมด' : 'รีวิวแรกจะช่วยให้ผู้เรียนคนอื่นตัดสินใจได้ง่ายขึ้น'}
            </EmptyDescription>
          </EmptyHeader>
          {isEnrolled && !submitSuccess && (
            <EmptyContent>
              <Button type="button" onClick={() => setShowForm(true)}>เป็นคนแรกที่รีวิว</Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map(review => (
            <article key={review.id}>
              <Card size="sm">
                <CardHeader className="flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback>{review.displayName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{review.displayName}</strong>
                        {review.isVerified && <Badge variant="secondary">ผู้เรียนจริง</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </div>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </CardHeader>
                {review.comment && (
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">{review.comment}</p>
                  </CardContent>
                )}
              </Card>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination className="mt-6" aria-label="หน้ารีวิว">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateReviewQuery({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage === 1}
              >
                ก่อนหน้า
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-sm text-muted-foreground" aria-current="page">
                หน้า {currentPage} จาก {pagination.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateReviewQuery({
                  page: Math.min(pagination.totalPages, currentPage + 1),
                })}
                disabled={currentPage === pagination.totalPages}
              >
                ถัดไป
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
