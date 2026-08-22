'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ImageOff, Search, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AdminCourseLifecycleActions,
  AdminCourseLifecycleBadge,
  CourseLifecycleDialog,
} from '@/components/admin/AdminCourseLifecycleControls';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/Toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { transitionAdminCourse } from '@/lib/admin-course-lifecycle-client';
import type { CourseLifecycleAction, CourseStatus } from '@/lib/course-lifecycle';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: string | number | null;
  promoPrice: string | number | null;
  promoStartsAt: Date | string | null;
  promoEndsAt: Date | string | null;
  status: CourseStatus;
  thumbnailUrl: string | null;
  createdAt: Date | string | null;
  lessonCount: number;
  enrollmentCount: number;
}

interface AdminCoursesTableProps {
  courses: Course[];
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export function normalizeCourseUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

export function formatCourseDate(value: Date | string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCoursePrice(value: string | number | null) {
  const amount = Number(value || 0);
  if (amount === 0) return 'ฟรี';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isCoursePromoActive(course: Course, now = new Date()) {
  const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
  const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
  const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
  return hasPromo && promoStartOk && promoEndOk;
}

export function getCourseHealth(course: Course): { label: string; tone: AdminTone } {
  const lessonCount = Number(course.lessonCount || 0);
  const thumbnail = normalizeCourseUrl(course.thumbnailUrl);

  if (course.status === 'archived') return { label: 'หยุดขายแล้ว', tone: 'neutral' };
  if (lessonCount === 0) return { label: 'เติมบทเรียน', tone: 'danger' };
  if (course.status === 'draft') return { label: 'รอเผยแพร่', tone: 'warning' };
  if (!thumbnail) return { label: 'เติมภาพปก', tone: 'warning' };
  return { label: 'พร้อมใช้งาน', tone: 'success' };
}

export function getCoursePrimaryAction(course: Course) {
  const lessonCount = Number(course.lessonCount || 0);
  const thumbnail = normalizeCourseUrl(course.thumbnailUrl);

  if (course.status === 'archived') {
    return { href: `/admin/courses/${course.id}/edit`, label: 'ตรวจคอร์ส' };
  }
  if (lessonCount === 0) {
    return { href: `/admin/courses/${course.id}/lessons`, label: 'เพิ่มบทเรียน' };
  }
  if (course.status === 'draft' || !thumbnail) {
    return { href: `/admin/courses/${course.id}/edit`, label: 'แก้ไขคอร์ส' };
  }
  return { href: `/admin/courses/${course.id}/lessons`, label: 'จัดบทเรียน' };
}

export function filterAdminCourses(
  courses: Course[],
  search: string,
  statusFilter: 'all' | CourseStatus,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return courses.filter((course) => {
    const matchesSearch = !normalizedSearch
      || course.title.toLowerCase().includes(normalizedSearch)
      || course.slug.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

function CourseCover({ course }: { course: Course }) {
  const thumbnail = normalizeCourseUrl(course.thumbnailUrl);
  return (
    <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-secondary text-sm font-bold text-secondary-foreground">
      {thumbnail ? (
        // Course image hosts are configured by admins and may not be known at build time.
        <img className="h-full w-full object-cover" src={thumbnail} alt="" />
      ) : (
        <span aria-hidden="true">MD</span>
      )}
    </div>
  );
}

function CourseIdentity({ course }: { course: Course }) {
  const health = getCourseHealth(course);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CourseCover course={course} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="max-w-64 truncate text-sm font-semibold text-foreground">{course.title}</strong>
          <AdminStatusBadge tone={health.tone}>{health.label}</AdminStatusBadge>
        </div>
        <p className="mt-1 max-w-64 truncate text-xs text-muted-foreground">{course.slug}</p>
      </div>
    </div>
  );
}

function CourseActions({
  course,
  pending,
  onRequest,
}: {
  course: Course;
  pending: boolean;
  onRequest: (action: CourseLifecycleAction) => void;
}) {
  const primaryAction = getCoursePrimaryAction(course);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild size="sm">
        <Link href={primaryAction.href}>{primaryAction.label}</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/courses/${course.id}/edit`}>แก้ไข</Link>
      </Button>
      {course.status === 'published' ? (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/courses/${course.slug}`} target="_blank" rel="noreferrer">ดูหน้าเว็บ</Link>
        </Button>
      ) : null}
      <AdminCourseLifecycleActions status={course.status} pending={pending} onRequest={onRequest} />
    </div>
  );
}

export default function AdminCoursesTable({ courses }: AdminCoursesTableProps) {
  const router = useRouter();
  const [courseRows, setCourseRows] = useState(courses);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lifecycleRequest, setLifecycleRequest] = useState<{
    course: Course;
    action: CourseLifecycleAction;
  } | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');

  const statusCounts = useMemo(() => ({
    all: courseRows.length,
    published: courseRows.filter((course) => course.status === 'published').length,
    draft: courseRows.filter((course) => course.status === 'draft').length,
    archived: courseRows.filter((course) => course.status === 'archived').length,
  }), [courseRows]);
  const filtered = useMemo(
    () => filterAdminCourses(courseRows, search, statusFilter),
    [courseRows, search, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCourses = filtered.slice(
    (safeCurrentPage - 1) * perPage,
    safeCurrentPage * perPage,
  );
  const isFiltered = Boolean(search.trim()) || statusFilter !== 'all';
  const activePromoCount = filtered.filter((course) => isCoursePromoActive(course)).length;
  const missingCoverCount = filtered.filter((course) => !normalizeCourseUrl(course.thumbnailUrl)).length;
  const needsAttentionCount = filtered.filter((course) => (
    Number(course.lessonCount || 0) === 0
    || (course.status === 'published' && !normalizeCourseUrl(course.thumbnailUrl))
  )).length;
  const hasStudentsCount = filtered.filter((course) => Number(course.enrollmentCount || 0) > 0).length;
  const statusTabs: Array<{ value: 'all' | CourseStatus; label: string; count: number }> = [
    { value: 'all', label: 'ทั้งหมด', count: statusCounts.all },
    { value: 'published', label: 'เผยแพร่', count: statusCounts.published },
    { value: 'draft', label: 'แบบร่าง', count: statusCounts.draft },
    { value: 'archived', label: 'เก็บเข้าคลัง', count: statusCounts.archived },
  ];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const requestLifecycleAction = (course: Course, action: CourseLifecycleAction) => {
    setLifecycleError('');
    setLifecycleRequest({ course, action });
  };

  const confirmLifecycleAction = async () => {
    if (!lifecycleRequest || pendingCourseId) return;
    const { course, action } = lifecycleRequest;
    setPendingCourseId(course.id);
    setLifecycleError('');

    const result = await transitionAdminCourse({
      courseId: course.id,
      action,
      expectedStatus: course.status,
    });

    if (!result.ok) {
      setLifecycleError(result.message);
      showToast(result.message, 'error');
      if (result.code === 'STATE_CONFLICT' || result.code === 'INVALID_RESPONSE') router.refresh();
      setPendingCourseId(null);
      return;
    }

    setCourseRows((current) => current.map((item) => (
      item.id === course.id ? { ...item, status: result.course.status } : item
    )));
    setLifecycleRequest(null);
    setPendingCourseId(null);
    showToast(
      action === 'archive'
        ? 'เก็บคอร์สเข้าคลังแล้ว'
        : action === 'restore'
          ? 'นำคอร์สกลับเป็นแบบร่างแล้ว'
          : 'เผยแพร่คอร์สแล้ว',
      'success',
    );
    router.refresh();
  };

  return (
    <AdminSection
      title="รายการคอร์ส"
      description="ค้นหา กรอง และเลือกงานถัดไปของแต่ละคอร์สจากข้อมูลจริง"
      actions={<AdminStatusBadge tone="info">{filtered.length} คอร์ส</AdminStatusBadge>}
    >
      <div className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_auto_auto] xl:items-end">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">ค้นหาคอร์ส</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-10"
                type="search"
                placeholder="ชื่อคอร์สหรือ slug"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-2" role="group" aria-label="กรองสถานะคอร์ส">
            {statusTabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={statusFilter === tab.value ? 'default' : 'outline'}
                aria-pressed={statusFilter === tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
              >
                {tab.label} <span className="tabular-nums opacity-75">{tab.count}</span>
              </Button>
            ))}
          </div>

          {isFiltered ? (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>ล้างตัวกรอง</Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="ต้องตรวจ" value={needsAttentionCount} detail="ไม่มีบทเรียน หรือคอร์สเผยแพร่ที่ไม่มีภาพปก" icon={<BookOpen />} tone={needsAttentionCount ? 'danger' : 'neutral'} />
          <AdminMetricCard label="ไม่มีภาพปก" value={missingCoverCount} detail="ควรเติมก่อนนำไปโปรโมต" icon={<ImageOff />} />
          <AdminMetricCard label="มีผู้เรียนแล้ว" value={hasStudentsCount} detail="คอร์สที่เริ่มมี enrollment" icon={<Users />} tone="success" />
          <AdminMetricCard label="มีโปรโมชัน" value={activePromoCount} detail="กำลังลดราคาอยู่ในช่วงเวลานี้" icon={<Sparkles />} tone="warning" />
        </div>

        {lifecycleError ? (
          <div className="rounded-xl border border-destructive/20 bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error-strong)]" role="alert">
            <strong className="block font-semibold">เปลี่ยนสถานะไม่สำเร็จ</strong>
            <span className="mt-1 block">{lifecycleError}</span>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <AdminEmptyState
            title={isFiltered ? 'ไม่พบคอร์สที่ตรงกับตัวกรอง' : 'ยังไม่มีคอร์ส'}
            description={isFiltered ? 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น' : 'เริ่มสร้างคอร์สแรกเพื่อเปิด catalog ของระบบ'}
            action={isFiltered ? (
              <Button type="button" variant="outline" onClick={clearFilters}>ล้างตัวกรอง</Button>
            ) : (
              <Button asChild><Link href="/admin/courses/new">สร้างคอร์สแรก</Link></Button>
            )}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <Table className="min-w-[70rem]">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[30%]">คอร์ส</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">ราคา</TableHead>
                    <TableHead className="text-right">บทเรียน</TableHead>
                    <TableHead className="text-right">ผู้เรียน</TableHead>
                    <TableHead>สร้างเมื่อ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCourses.map((course) => {
                    const promoActive = isCoursePromoActive(course);
                    return (
                      <TableRow key={course.id}>
                        <TableCell><CourseIdentity course={course} /></TableCell>
                        <TableCell><AdminCourseLifecycleBadge status={course.status} /></TableCell>
                        <TableCell className="text-right">
                          <strong className="font-semibold tabular-nums">
                            {formatCoursePrice(promoActive ? course.promoPrice : course.price)}
                          </strong>
                          {promoActive ? <span className="mt-1 block text-xs font-medium text-[var(--color-warning-strong)]">โปรโมชัน</span> : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(course.lessonCount || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(course.enrollmentCount || 0)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatCourseDate(course.createdAt)}</TableCell>
                        <TableCell>
                          <CourseActions
                            course={course}
                            pending={pendingCourseId === course.id}
                            onRequest={(action) => requestLifecycleAction(course, action)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {paginatedCourses.map((course) => {
                const health = getCourseHealth(course);
                const promoActive = isCoursePromoActive(course);
                return (
                  <Card key={course.id} size="sm" className="gap-4 rounded-xl shadow-none">
                    <CardHeader className="pb-0">
                      <CourseIdentity course={course} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <AdminCourseLifecycleBadge status={course.status} />
                        <AdminStatusBadge tone={health.tone}>{health.label}</AdminStatusBadge>
                        <AdminStatusBadge>{formatCoursePrice(promoActive ? course.promoPrice : course.price)}</AdminStatusBadge>
                        <AdminStatusBadge>{Number(course.lessonCount || 0)} บทเรียน</AdminStatusBadge>
                        <AdminStatusBadge>{Number(course.enrollmentCount || 0)} ผู้เรียน</AdminStatusBadge>
                      </div>
                      <CourseActions
                        course={course}
                        pending={pendingCourseId === course.id}
                        onRequest={(action) => requestLifecycleAction(course, action)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="admin-courses-per-page">แสดง</label>
                <select
                  id="admin-courses-per-page"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  value={perPage}
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {PER_PAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <span className="tabular-nums">
                  {(safeCurrentPage - 1) * perPage + 1}-{Math.min(safeCurrentPage * perPage, filtered.length)} จาก {filtered.length}
                </span>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    <ArrowLeft /> ก่อนหน้า
                  </Button>
                  <span className="min-w-14 text-center font-semibold tabular-nums text-foreground">{safeCurrentPage} / {totalPages}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    ถัดไป <ArrowRight />
                  </Button>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </div>

      {lifecycleRequest ? (
        <CourseLifecycleDialog
          isOpen
          courseTitle={lifecycleRequest.course.title}
          action={lifecycleRequest.action}
          pending={pendingCourseId === lifecycleRequest.course.id}
          error={lifecycleError}
          onConfirm={confirmLifecycleAction}
          onCancel={() => {
            if (!pendingCourseId) setLifecycleRequest(null);
          }}
        />
      ) : null}
    </AdminSection>
  );
}
