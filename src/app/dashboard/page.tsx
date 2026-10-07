import type { Metadata } from 'next';
import Link from 'next/link';

import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import CourseArtwork from '@/components/course/CourseArtwork';
import CourseCoverImage from '@/components/course/CourseCoverImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { resolveCoverImage } from '@/lib/courses/cover-image';
import { getDashboardLearning, type DashboardLearning } from '@/lib/learning/dashboard';
import { chooseNextCourse } from '@/lib/learning/next-course';
import { getLearningPathCourses } from '@/lib/learning/path-courses';
import { requireMember } from '@/lib/auth/member-access';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'แดชบอร์ด',
  description: 'ติดตามความก้าวหน้าและจัดการคอร์สเรียนของคุณ',
};

export const dynamic = 'force-dynamic';

const reviewHref = (slug: string) => `/courses/${slug}/learn`;

// One quiet line under the greeting instead of a row of number boxes; a zero says nothing, so it is left out.
function describeSummary(summary: DashboardLearning['summary']): string | null {
  const parts = [
    summary.activeCourseCount > 0 ? `กำลังเรียน ${summary.activeCourseCount} คอร์ส` : null,
    summary.completedCourseCount > 0 ? `เรียนจบแล้ว ${summary.completedCourseCount} คอร์ส` : null,
    summary.activeCertificateCount > 0 ? `ใบรับรอง ${summary.activeCertificateCount} ใบ` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// A course's cover, or the same artwork the catalogue draws when it has none.
function CourseThumbnail({ course, className }: {
  course: { title: string; slug: string; thumbnailUrl: string | null };
  className?: string;
}) {
  const cover = resolveCoverImage(course.thumbnailUrl);
  return (
    <div className={cn('relative aspect-video shrink-0 overflow-hidden rounded-lg bg-navy', className)}>
      {cover
        ? <CourseCoverImage cover={cover} alt="" width={224} height={126} sizes="7rem" className="size-full object-cover" />
        : <CourseArtwork title={course.title} slug={course.slug} bare />}
    </div>
  );
}

export default async function DashboardPage() {
  const member = await requireMember('/dashboard');
  const [dashboard, pathCourses] = await Promise.all([
    getDashboardLearning(member.id),
    getLearningPathCourses(),
  ]);
  const { primary, remaining, summary } = dashboard;
  const primaryCover = resolveCoverImage(primary.course?.thumbnailUrl);
  const ownedSlugs = [primary, ...remaining].flatMap((item) => (item.course ? [item.course.slug] : []));
  // Suggested only to a member who already has a course; a newcomer's empty state points to the catalogue.
  const nextCourse = ownedSlugs.length > 0 ? chooseNextCourse(ownedSlugs, pathCourses) : null;

  return (
    <LearnerAccountShell
      current="dashboard"
      title={`สวัสดี, ${member.name || 'สมาชิก'}`}
      description={primary.course
        ? describeSummary(summary) ?? 'เรียนต่อจากจุดล่าสุด หรือดูสถานะการเรียนทั้งหมดในบัญชีของคุณ'
        : 'เริ่มจากคอร์สแรกของคุณ คอร์สที่ลงทะเบียนแล้วจะแสดงที่หน้านี้'}
    >
      {primary.course ? (
            <section aria-labelledby="dashboard-next-action-title">
              <p className="text-sm font-semibold text-link">สิ่งที่ควรทำต่อ</p>
              <h2 className="mt-1 text-xl font-bold sm:mt-2 sm:text-2xl" id="dashboard-next-action-title">
                {primary.enrollment === 'completed' ? 'ตรวจสอบผลลัพธ์ล่าสุด' : 'เดินหน้าจากจุดล่าสุด'}
              </h2>
              <Card className="mt-4 py-0 sm:mt-5">
                <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  {/* On phones the course and its next step come first; the cover follows as a short strip. */}
                  <div className="relative order-last h-36 bg-navy sm:h-auto sm:min-h-64 lg:order-first">
                    {primaryCover ? (
                      <CourseCoverImage
                        className="object-cover"
                        cover={primaryCover}
                        alt={primary.course.title}
                        fill
                        preload
                        sizes="(max-width: 1024px) 100vw, 42vw"
                      />
                    ) : (
                      <div className="absolute inset-0">
                        <CourseArtwork title={primary.course.title} slug={primary.course.slug} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col py-5 sm:py-7">
                    <CardHeader>
                      <div>
                        <Badge variant={primary.enrollment === 'completed' ? 'default' : 'secondary'}>
                          {primary.status.label}
                        </Badge>
                      </div>
                      <CardTitle className="mt-2 text-xl sm:text-2xl">{primary.course.title}</CardTitle>
                      <CardDescription>{primary.status.description}</CardDescription>
                    </CardHeader>
                    {primary.enrollment === 'completed' ? null : (
                      <CardContent className="mt-4 sm:mt-6">
                        <div className="flex items-center gap-3">
                          <Progress
                            className="flex-1"
                            value={primary.progress.percent}
                            aria-label={`ความคืบหน้า ${primary.progress.percent}%`}
                          />
                          <span className="text-sm font-medium">{primary.progress.percent}%</span>
                        </div>
                      </CardContent>
                    )}
                    <CardFooter className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                      <Button asChild className="h-auto min-h-9 whitespace-normal text-left">
                        <Link href={primary.action.href}>
                          {primary.action.label} <span aria-hidden="true">→</span>
                        </Link>
                      </Button>
                      {primary.enrollment === 'completed' ? (
                        <Button asChild variant="outline">
                          <Link href={reviewHref(primary.course.slug)}>ทบทวนบทเรียน</Link>
                        </Button>
                      ) : null}
                    </CardFooter>
                  </div>
                </div>
              </Card>
            </section>
          ) : (
            <section aria-labelledby="dashboard-empty-title">
              <Empty className="border bg-card">
                <EmptyHeader>
                  <EmptyTitle>
                    <h2 id="dashboard-empty-title">{primary.status.label}</h2>
                  </EmptyTitle>
                  <EmptyDescription>
                    {primary.status.description}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row flex-wrap justify-center">
                  <Button asChild>
                    <Link href={primary.action.href}>
                      {primary.action.label} <span aria-hidden="true">→</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/courses?preview=free">ทดลองบทเรียนฟรี</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </section>
          )}

          {primary.course && (
            <section className="mt-10 sm:mt-12" aria-labelledby="dashboard-courses-title">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
                <h2 className="text-xl font-bold sm:text-2xl" id="dashboard-courses-title">คอร์สของฉัน</h2>
                <Button asChild variant="outline">
                  <Link href="/courses">ดูคอร์สเพิ่มเติม</Link>
                </Button>
              </div>
              {remaining.length > 0 ? (
                <ul className="grid gap-3">
                  {remaining.map((item) => item.course && (
                    <li key={item.course.slug}>
                      <Card size="sm">
                        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                            <CourseThumbnail course={item.course} className="w-24 sm:w-28" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-snug">{item.course.title}</p>
                              {item.enrollment === 'completed' ? (
                                <p className="mt-1 text-sm text-muted-foreground">{item.status.label}</p>
                              ) : (
                                // One progress reading per course: the bar and its percentage.
                                <div className="mt-2 flex items-center gap-3">
                                  <Progress
                                    className="flex-1"
                                    value={item.progress.percent}
                                    aria-label={`ความคืบหน้า ${item.progress.percent}%`}
                                  />
                                  <span className="text-sm text-muted-foreground">{item.progress.percent}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.enrollment === 'completed' ? (
                              <Button asChild variant="outline" size="sm">
                                <Link href={reviewHref(item.course.slug)}>ทบทวนบทเรียน</Link>
                              </Button>
                            ) : null}
                            {/* A finished course's certificate link stays quiet, unless the certificate is still to be collected. */}
                            <Button
                              asChild
                              variant={item.enrollment === 'completed' && item.certificate !== 'missing' ? 'outline' : 'default'}
                              size="sm"
                              className="h-auto min-h-8 whitespace-normal text-left"
                            >
                              <Link href={item.action.href}>{item.action.label}</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
                  คอร์สที่ลงทะเบียนทั้งหมดแสดงอยู่ด้านบนแล้ว
                </p>
              )}
            </section>
          )}

          {nextCourse ? (
            <section className="mt-10 sm:mt-12" aria-labelledby="dashboard-next-course-title">
              <h2 className="mb-4 text-xl font-bold sm:mb-5 sm:text-2xl" id="dashboard-next-course-title">แนะนำต่อจากนี้</h2>
              <Card size="sm">
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <CourseThumbnail course={nextCourse} className="w-24 sm:w-28" />
                    <div className="min-w-0 flex-1">
                      <p className="text-caption font-medium text-link">{nextCourse.step}</p>
                      <p className="mt-0.5 font-semibold leading-snug">{nextCourse.title}</p>
                      {nextCourse.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{nextCourse.summary}</p>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/courses/${nextCourse.slug}`}>ดูรายละเอียดคอร์ส</Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          ) : null}
    </LearnerAccountShell>
  );
}
