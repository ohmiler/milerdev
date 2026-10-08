'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Eye, EyeOff, MessageSquareText, Search, ShieldCheck, Star, Trash2 } from 'lucide-react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  courseSlug: string | null;
  courseStatus: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface Stats {
  total: number;
  avgRating: number | null;
  hidden: number;
  verified: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span role="img" className="inline-flex items-center gap-0.5" aria-label={rating + ' จาก 5 ดาว'}>
      {[1, 2, 3, 4, 5].map((score) => (
        <Star
          key={score}
          aria-hidden
          className={score <= rating ? 'size-3.5 fill-amber-500 text-amber-500' : 'size-3.5 text-border'}
        />
      ))}
    </span>
  );
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
  const [deleting, setDeleting] = useState(false);

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
      const res = await fetch('/api/admin/reviews?' + params);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, courseFilter, ratingFilter, searchDebounce]);

  const toggleHidden = async (id: string, isHidden: boolean) => {
    try {
      const res = await fetch('/api/admin/reviews/' + id, {
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/reviews/' + id, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        showToast('ลบรีวิวสำเร็จ', 'success');
        await fetchReviews();
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const deleteTarget = reviews.find((review) => review.id === deleteConfirm);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="เสียงจากผู้เรียน"
        title="จัดการรีวิว"
        description="ตรวจสอบเสียงตอบรับจากผู้เรียน และซ่อนเนื้อหาที่ไม่เหมาะสม"
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="รีวิวทั้งหมด" value={stats.total.toLocaleString('th-TH')} icon={<MessageSquareText />} />
          <AdminMetricCard
            label="คะแนนเฉลี่ย"
            value={stats.avgRating || '-'}
            detail="คะแนนเต็ม 5"
            icon={<Star />}
            tone="warning"
          />
          <AdminMetricCard
            label="ผู้เรียนจริง"
            value={stats.verified.toLocaleString('th-TH')}
            icon={<ShieldCheck />}
            tone="success"
          />
          <AdminMetricCard
            label="ซ่อนอยู่"
            value={stats.hidden.toLocaleString('th-TH')}
            icon={<EyeOff />}
            tone={stats.hidden > 0 ? 'warning' : 'neutral'}
          />
        </div>
      ) : null}

      <AdminSection
        title="รีวิวทั้งหมด"
        description="ค้นหาจากชื่อหรืออีเมล แล้วกรองตามคอร์สและคะแนน"
        actions={
          pagination ? (
            <AdminStatusBadge tone="info">{pagination.total.toLocaleString('th-TH')} รายการ</AdminStatusBadge>
          ) : undefined
        }
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,280px)_140px]">
          <InputGroup>
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อหรืออีเมล"
              aria-label="ค้นหารีวิว"
            />
          </InputGroup>
          <NativeSelect
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="กรองตามคอร์ส"
          >
            <option value="all">ทุกคอร์ส</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={ratingFilter}
            onChange={(event) => {
              setRatingFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="กรองตามคะแนน"
          >
            <option value="all">ทุกคะแนน</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} ดาว
              </option>
            ))}
          </NativeSelect>
        </div>

        {loading && reviews.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดรีวิว" />
        ) : reviews.length === 0 ? (
          <AdminEmptyState
            title="ไม่พบรีวิว"
            description="ลองเปลี่ยนคำค้นหา คอร์ส หรือคะแนนที่ใช้กรอง"
            icon={<MessageSquareText />}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้รีวิว</TableHead>
                  <TableHead>คอร์ส</TableHead>
                  <TableHead>คะแนน</TableHead>
                  <TableHead className="min-w-64">ความคิดเห็น</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id} className={review.isHidden ? 'bg-muted/30 opacity-70' : undefined}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {review.displayName || review.userName || 'ไม่ระบุชื่อ'}
                      </p>
                      <p className="mt-1 max-w-44 truncate text-xs text-muted-foreground">
                        {review.userEmail || (review.userId ? 'สมาชิกในระบบ' : 'นำเข้าจากระบบเดิม')}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-52">
                      <span className="line-clamp-2">{review.courseTitle || 'ไม่พบชื่อคอร์ส'}</span>
                      {review.courseSlug && review.courseStatus === 'published' ? (
                        <Link href={`/courses/${review.courseSlug}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-link hover:underline">
                          ดูหน้าคอร์ส<ExternalLink className="size-3" aria-hidden />
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <RatingStars rating={review.rating} />
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
                        {review.comment || 'ไม่มีความคิดเห็น'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {review.isVerified ? <AdminStatusBadge tone="success">ผู้เรียนจริง</AdminStatusBadge> : null}
                        {review.isHidden ? (
                          <AdminStatusBadge tone="warning">ซ่อนอยู่</AdminStatusBadge>
                        ) : (
                          <AdminStatusBadge tone="neutral">แสดงอยู่</AdminStatusBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(review.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={review.isHidden ? 'แสดงรีวิว' : 'ซ่อนรีวิว'}
                          onClick={() => toggleHidden(review.id, review.isHidden)}
                        >
                          {review.isHidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                          <span className="sr-only">{review.isHidden ? 'แสดงรีวิว' : 'ซ่อนรีวิว'}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          title="ลบรีวิว"
                          onClick={() => setDeleteConfirm(review.id)}
                        >
                          <Trash2 aria-hidden />
                          <span className="sr-only">ลบรีวิว</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  หน้า {currentPage.toLocaleString('th-TH')} จาก {pagination.totalPages.toLocaleString('th-TH')} ·{' '}
                  {pagination.total.toLocaleString('th-TH')} รายการ
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === pagination.totalPages || loading}
                    onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </AdminSection>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบรีวิว"
        description="รีวิวจะถูกลบถาวร หากเพียงต้องการหยุดแสดงควรใช้คำสั่งซ่อนแทน"
        target={
          deleteTarget
            ? (deleteTarget.displayName || deleteTarget.userName || 'ไม่ระบุชื่อ') +
              ' · ' +
              (deleteTarget.courseTitle || 'ไม่พบชื่อคอร์ส')
            : undefined
        }
        confirmLabel="ลบรีวิว"
        pendingLabel="กำลังลบ"
        pending={deleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
