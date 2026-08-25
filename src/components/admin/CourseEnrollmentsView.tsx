import {
  Activity,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  ListOrdered,
  Pencil,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { normalizeImageUrl } from '@/lib/url';

export interface CourseEnrollmentRecord {
  enrollmentId: string;
  enrolledAt: Date | string | null;
  progressPercent: number | null;
  completedAt: Date | string | null;
  userId: string;
  userName: string | null;
  userEmail: string;
  userAvatar: string | null;
  completedLessons: number;
}

export interface CourseEnrollmentsData {
  course: {
    id: string;
    title: string;
    slug: string;
  };
  totalLessons: number;
  totalEnrollments: number;
  enrolledUsers: CourseEnrollmentRecord[];
  page: number;
  totalPages: number;
}

export function normalizeCourseEnrollmentPage(value: string | undefined) {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value: Date | string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitial(name: string | null, email: string) {
  return (name || email).trim().charAt(0).toUpperCase() || '?';
}

function getEnrollmentState(enrollment: CourseEnrollmentRecord) {
  const progress = Math.min(100, Math.max(0, Number(enrollment.progressPercent || 0)));
  if (enrollment.completedAt) return { label: 'เรียนจบ', tone: 'success' as const, progress };
  if (progress > 0) return { label: 'กำลังเรียน', tone: 'info' as const, progress };
  return { label: 'ยังไม่เริ่ม', tone: 'neutral' as const, progress };
}

export function CourseEnrollmentsView({ data }: { data: CourseEnrollmentsData }) {
  const {
    course,
    totalLessons,
    totalEnrollments,
    enrolledUsers,
    page,
    totalPages,
  } = data;
  const completedCount = enrolledUsers.filter((user) => user.completedAt).length;
  const inProgressCount = enrolledUsers.filter(
    (user) => !user.completedAt && Number(user.progressPercent || 0) > 0,
  ).length;
  const notStartedCount = enrolledUsers.filter(
    (user) => !user.completedAt && Number(user.progressPercent || 0) === 0,
  ).length;
  const averageProgress = enrolledUsers.length > 0
    ? Math.round(
      enrolledUsers.reduce((sum, user) => sum + Number(user.progressPercent || 0), 0)
        / enrolledUsers.length,
    )
    : 0;
  const pageHref = (targetPage: number) =>
    `/admin/courses/${course.id}/enrollments?page=${targetPage}`;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Course enrollments"
        title="ผู้เรียนในคอร์ส"
        description={
          <>
            ติดตามผู้เรียนของคอร์ส <strong className="font-semibold text-foreground">{course.title}</strong>{' '}
            พร้อมความคืบหน้าและสถานะการเรียนล่าสุด
          </>
        }
        meta={
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/admin/courses">
              <ArrowLeft data-icon="inline-start" aria-hidden />
              กลับไปจัดการคอร์ส
            </Link>
          </Button>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/courses/${course.id}/lessons`}>
                <ListOrdered data-icon="inline-start" aria-hidden />
                จัดการบทเรียน
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/courses/${course.id}/edit`}>
                <Pencil data-icon="inline-start" aria-hidden />
                แก้ไขคอร์ส
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="ผู้เรียนทั้งหมด"
          value={totalEnrollments.toLocaleString('th-TH')}
          detail="ลงทะเบียนในคอร์สนี้"
          icon={<UsersRound aria-hidden />}
          tone="info"
        />
        <AdminMetricCard
          label="เรียนจบแล้ว"
          value={completedCount.toLocaleString('th-TH')}
          detail="นับจากหน้าปัจจุบัน"
          icon={<CircleCheck aria-hidden />}
          tone="success"
        />
        <AdminMetricCard
          label="กำลังเรียน"
          value={inProgressCount.toLocaleString('th-TH')}
          detail="มีความคืบหน้ามากกว่า 0%"
          icon={<Activity aria-hidden />}
          tone="warning"
        />
        <AdminMetricCard
          label="ความคืบหน้าเฉลี่ย"
          value={`${averageProgress}%`}
          detail="ค่าเฉลี่ยของรายการที่แสดง"
          icon={<BookOpen aria-hidden />}
        />
      </div>

      <AdminSection
        title="รายการผู้เรียน"
        description={`${totalLessons.toLocaleString('th-TH')} บทเรียนในคอร์สนี้ · ${notStartedCount.toLocaleString('th-TH')} คนยังไม่เริ่มจากรายการที่แสดง`}
        actions={
          <AdminStatusBadge tone="neutral">
            {enrolledUsers.length.toLocaleString('th-TH')} รายการ
          </AdminStatusBadge>
        }
      >
        {enrolledUsers.length === 0 ? (
          <AdminEmptyState
            icon={<UsersRound aria-hidden />}
            title="ยังไม่มีผู้ลงทะเบียนในคอร์สนี้"
            description="เมื่อมีผู้เรียนสมัครหรือได้รับสิทธิ์คอร์ส รายการจะแสดงที่นี่พร้อมความคืบหน้าล่าสุด"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้เรียน</TableHead>
                <TableHead className="min-w-48">ความคืบหน้า</TableHead>
                <TableHead>บทเรียนที่จบ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่ลงทะเบียน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledUsers.map((user) => {
                const state = getEnrollmentState(user);
                const avatarUrl = normalizeImageUrl(user.userAvatar);
                const displayName = user.userName || 'ไม่ระบุชื่อ';

                return (
                  <TableRow key={user.enrollmentId}>
                    <TableCell>
                      <div className="flex min-w-52 items-center gap-3">
                        <Avatar size="lg">
                          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                          <AvatarFallback>{getInitial(user.userName, user.userEmail)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-44 items-center gap-3">
                        <Progress
                          value={state.progress}
                          aria-label={`ความคืบหน้า ${state.progress}%`}
                        />
                        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">
                          {state.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(user.completedLessons).toLocaleString('th-TH')}/
                      {totalLessons.toLocaleString('th-TH')}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge tone={state.tone}>{state.label}</AdminStatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(user.enrolledAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 ? (
          <Pagination className="mt-5 border-t border-border pt-5">
            <PaginationContent>
              {page > 1 ? (
                <PaginationItem>
                  <PaginationPrevious
                    href={pageHref(page - 1)}
                    text="ก่อนหน้า"
                    aria-label="หน้าก่อนหน้า"
                  />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <span className="px-3 text-sm font-medium tabular-nums text-muted-foreground">
                  หน้า {page.toLocaleString('th-TH')} / {totalPages.toLocaleString('th-TH')}
                </span>
              </PaginationItem>
              {page < totalPages ? (
                <PaginationItem>
                  <PaginationNext
                    href={pageHref(page + 1)}
                    text="ถัดไป"
                    aria-label="หน้าถัดไป"
                  />
                </PaginationItem>
              ) : null}
            </PaginationContent>
          </Pagination>
        ) : null}
      </AdminSection>
    </div>
  );
}
