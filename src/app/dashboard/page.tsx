import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import LearnerAccountShell from '@/components/account/LearnerAccountShell';
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
import { getDashboardLearning } from '@/lib/learning/dashboard';
import { requireMember } from '@/lib/auth/member-access';

export const metadata: Metadata = {
  title: 'แดชบอร์ด',
  description: 'ติดตามความก้าวหน้าและจัดการคอร์สเรียนของคุณ',
};

export const dynamic = 'force-dynamic';

function thumbnailSrc(value: string) {
  return value.startsWith('http') || value.startsWith('/') ? value : `https://${value}`;
}

const reviewHref = (slug: string) => `/courses/${slug}/learn`;

export default async function DashboardPage() {
  const member = await requireMember('/dashboard');
  const dashboard = await getDashboardLearning(member.id);
  const { primary, remaining, summary } = dashboard;

  const metrics = [
    { label: 'คอร์สทั้งหมด', value: summary.courseCount },
    { label: 'กำลังเรียน', value: summary.activeCourseCount },
    { label: 'เรียนจบแล้ว', value: summary.completedCourseCount },
    { label: 'ใบรับรองที่ใช้งานได้', value: summary.activeCertificateCount },
  ];

  return (
    <LearnerAccountShell
      current="dashboard"
      title={`สวัสดี, ${member.name || 'สมาชิก'}`}
      description={primary.course
        ? 'เรียนต่อจากจุดล่าสุด หรือดูสถานะการเรียนทั้งหมดในบัญชีของคุณ'
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
                  <div className="relative order-last h-36 bg-slate-950 sm:h-auto sm:min-h-64 lg:order-first">
                    {primary.course.thumbnailUrl ? (
                      <Image
                        className="object-cover"
                        src={thumbnailSrc(primary.course.thumbnailUrl)}
                        alt={primary.course.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 42vw"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-white sm:min-h-64">
                        <span className="text-4xl font-bold">MD</span>
                        <small>Learning</small>
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

          {/* A row of zeros says nothing to someone without a course yet. */}
          {summary.courseCount > 0 ? (
            <section className="mt-6 sm:mt-8" aria-label="สรุปการเรียน">
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <div className="rounded-xl border bg-card p-4 sm:p-5" key={metric.label}>
                    <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                    <dd className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

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
                        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                          <div className="min-w-0">
                            <p className="font-semibold">{item.course.title}</p>
                            {item.enrollment === 'completed' ? (
                              <p className="text-sm text-muted-foreground">{item.status.label}</p>
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
                          <div className="flex flex-wrap gap-2">
                            {item.enrollment === 'completed' ? (
                              <Button asChild variant="outline" size="sm">
                                <Link href={reviewHref(item.course.slug)}>ทบทวนบทเรียน</Link>
                              </Button>
                            ) : null}
                            <Button asChild variant={item.enrollment === 'completed' ? 'outline' : 'default'} size="sm" className="h-auto min-h-8 whitespace-normal text-left">
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
    </LearnerAccountShell>
  );
}
