'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Import, MessageSquareText, Search, ShieldCheck, Star, Trash2 } from 'lucide-react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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

interface WpReview {
  course_id: string;
  display_name: string;
  comment: string;
  created_at: string;
  rating: string;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={rating + ' จาก 5 ดาว'}>
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

  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [wpStep, setWpStep] = useState<'paste' | 'map' | 'done'>('paste');
  const [wpReviews, setWpReviews] = useState<WpReview[]>([]);
  const [wpCourseIds, setWpCourseIds] = useState<string[]>([]);
  const [courseMapping, setCourseMapping] = useState<Record<string, string>>({});

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

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(importJson);

      if (Array.isArray(parsed) && parsed.some((item: { type?: string }) => item.type === 'table')) {
        const tableObj = parsed.find((item: { type?: string }) => item.type === 'table');
        if (tableObj?.data && Array.isArray(tableObj.data)) {
          const parsedReviews = tableObj.data as WpReview[];
          setWpReviews(parsedReviews);
          setWpCourseIds([...new Set(parsedReviews.map((review) => review.course_id))]);
          setCourseMapping({});
          setWpStep('map');
          return;
        }
      }

      const reviewsData = Array.isArray(parsed) ? parsed : parsed.reviews;
      if (Array.isArray(reviewsData) && reviewsData.length > 0 && reviewsData[0].courseId) {
        handleDirectImport(reviewsData);
        return;
      }

      showToast('รูปแบบ JSON ไม่ถูกต้อง', 'error');
    } catch {
      showToast('JSON ไม่ถูกต้อง กรุณาตรวจสอบ', 'error');
    }
  };

  const handleDirectImport = async (reviewsData: Record<string, unknown>[]) => {
    setImporting(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviewsData }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('นำเข้า ' + data.imported + ' รีวิว (ข้าม ' + data.skipped + ')', 'success');
        setShowImport(false);
        setImportJson('');
        setWpStep('paste');
        await fetchReviews();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleWpImport = async () => {
    const unmapped = wpCourseIds.filter((id) => !courseMapping[id]);
    if (unmapped.length > 0) {
      showToast('กรุณาเลือกคอร์สให้ครบทุก ID', 'error');
      return;
    }

    const converted = wpReviews
      .filter((review) => courseMapping[review.course_id])
      .map((review) => ({
        courseId: courseMapping[review.course_id],
        rating: parseInt(review.rating) || 5,
        comment: review.comment || null,
        displayName: review.display_name || 'ผู้ใช้',
        isVerified: true,
        createdAt: review.created_at ? review.created_at.replace(' ', 'T') + 'Z' : new Date().toISOString(),
      }));

    await handleDirectImport(converted);
  };

  const closeImport = () => {
    if (importing) return;
    setShowImport(false);
    setImportJson('');
    setWpStep('paste');
    setWpReviews([]);
    setWpCourseIds([]);
    setCourseMapping({});
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const deleteTarget = reviews.find((review) => review.id === deleteConfirm);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Moderation"
        title="จัดการรีวิว"
        description="ตรวจสอบเสียงตอบรับจากผู้เรียน ซ่อนเนื้อหาที่ไม่เหมาะสม และนำเข้าประวัติจากระบบเดิม"
        actions={
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Import aria-hidden />
            นำเข้ารีวิว
          </Button>
        }
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
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อหรืออีเมล"
              className="pl-9"
              aria-label="ค้นหารีวิว"
            />
          </div>
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

      <Dialog
        open={showImport}
        onOpenChange={(open) => {
          if (open) setShowImport(true);
          else closeImport();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>นำเข้ารีวิว</DialogTitle>
            <DialogDescription>
              รองรับ JSON แบบตรงและ phpMyAdmin export ระบบจะให้จับคู่ Course ID ก่อนนำเข้าข้อมูล WordPress
            </DialogDescription>
          </DialogHeader>

          {wpStep === 'paste' ? (
            <FieldGroup className="my-2 gap-4">
              <Field>
                <FieldLabel htmlFor="review-import-json">ข้อมูล JSON</FieldLabel>
                <Textarea
                  id="review-import-json"
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="วาง JSON ที่นี่"
                />
                <FieldDescription>ตรวจสอบว่าไม่มีข้อมูลส่วนบุคคลที่ไม่จำเป็นก่อนนำเข้า</FieldDescription>
              </Field>
            </FieldGroup>
          ) : (
            <div className="my-2 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                พบ {wpReviews.length.toLocaleString('th-TH')} รีวิว จาก {wpCourseIds.length.toLocaleString('th-TH')} Course ID
              </div>
              <div className="space-y-3">
                {wpCourseIds.map((wpId) => {
                  const count = wpReviews.filter((review) => review.course_id === wpId).length;
                  return (
                    <Field key={wpId}>
                      <FieldLabel htmlFor={'review-map-' + wpId}>
                        WordPress Course ID: {wpId} · {count.toLocaleString('th-TH')} รีวิว
                      </FieldLabel>
                      <NativeSelect
                        id={'review-map-' + wpId}
                        value={courseMapping[wpId] || ''}
                        onChange={(event) =>
                          setCourseMapping((mapping) => ({ ...mapping, [wpId]: event.target.value }))
                        }
                      >
                        <option value="">เลือกคอร์สปลายทาง</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            {wpStep === 'map' ? (
              <Button variant="outline" disabled={importing} onClick={() => setWpStep('paste')}>
                ย้อนกลับ
              </Button>
            ) : null}
            <Button variant="outline" disabled={importing} onClick={closeImport}>
              ยกเลิก
            </Button>
            <Button
              disabled={importing || (wpStep === 'paste' && !importJson.trim())}
              onClick={wpStep === 'paste' ? handleParseJson : handleWpImport}
            >
              {importing ? (
                <AdminPendingLabel>กำลังนำเข้า...</AdminPendingLabel>
              ) : wpStep === 'paste' ? (
                'ตรวจสอบข้อมูล'
              ) : (
                'นำเข้ารีวิว'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
