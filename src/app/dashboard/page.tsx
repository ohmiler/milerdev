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
import { getDashboardLearning } from '@/lib/dashboard-learning';
import { requireMember } from '@/lib/member-access';

export const metadata: Metadata = {
  title: 'แดชบอร์ด',
  description: 'ติดตามความก้าวหน้าและจัดการคอร์สเรียนของคุณ',
};

export const dynamic = 'force-dynamic';

function thumbnailSrc(value: string) {
  return value.startsWith('http') || value.startsWith('/') ? value : `https://${value}`;
}

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
      description="กลับมาเรียนต่อจากจุดล่าสุด หรือตรวจสอบสถานะการเรียนทั้งหมดในบัญชีของคุณ"
    >
      {primary.course ? (
            <section className="mt-10" aria-labelledby="dashboard-next-action-title">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                สิ่งที่ควรทำต่อ
              </p>
              <h2 className="mt-2 text-2xl font-bold" id="dashboard-next-action-title">
                {primary.enrollment === 'completed' ? 'ตรวจสอบผลลัพธ์ล่าสุด' : 'เดินหน้าจากจุดล่าสุด'}
              </h2>
              <Card className="mt-5 py-0">
                <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="relative min-h-64 bg-slate-950">
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
                      <div className="flex h-full min-h-64 flex-col items-center justify-center text-white">
                        <span className="text-4xl font-bold">MD</span>
                        <small>Learning</small>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col py-7">
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={primary.enrollment === 'completed' ? 'default' : 'secondary'}>
                          {primary.status.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {primary.progress.completedLessons}/{primary.progress.totalLessons} บท
                        </span>
                      </div>
                      <CardTitle className="mt-2 text-2xl">{primary.course.title}</CardTitle>
                      <CardDescription>{primary.status.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-6">
                      <Progress
                        value={primary.progress.percent}
                        aria-label={`ความคืบหน้า ${primary.progress.percent}%`}
                      />
                      <p className="mt-2 text-right text-sm font-medium">
                        {primary.progress.percent}%
                      </p>
                    </CardContent>
                    <CardFooter className="mt-5">
                      <Button asChild>
                        <Link href={primary.action.href}>
                          {primary.action.label} <span aria-hidden="true">→</span>
                        </Link>
                      </Button>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            </section>
          ) : (
            <section className="mt-10" aria-labelledby="dashboard-empty-title">
              <Empty className="border bg-card">
                <EmptyHeader>
                  <EmptyTitle>
                    <h2 id="dashboard-empty-title">{primary.status.label}</h2>
                  </EmptyTitle>
                  <EmptyDescription>
                    {primary.status.description}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild>
                    <Link href={primary.action.href}>
                      {primary.action.label} <span aria-hidden="true">→</span>
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </section>
          )}

          <section className="mt-8" aria-label="สรุปการเรียน">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div className="rounded-xl border bg-card p-5" key={metric.label}>
                  <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                  <dd className="mt-2 text-3xl font-bold">{metric.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {primary.course && (
            <section className="mt-12" aria-labelledby="dashboard-courses-title">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-2xl font-bold" id="dashboard-courses-title">คอร์สของฉัน</h2>
                <Button asChild variant="outline">
                  <Link href="/courses">ดูคอร์สเพิ่มเติม</Link>
                </Button>
              </div>
              {remaining.length > 0 ? (
                <div className="grid gap-3">
                  {remaining.map((item, index) => item.course && (
                    <Card key={item.course.slug} size="sm">
                      <CardContent>
                        <Link
                          href={item.action.href}
                          className="grid gap-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_12rem_auto] sm:items-center"
                        >
                          <span className="text-xs font-semibold text-muted-foreground">
                            {String(index + 2).padStart(2, '0')}
                          </span>
                          <span>
                            <strong className="block">{item.course.title}</strong>
                            <span className="text-sm text-muted-foreground">{item.status.label}</span>
                          </span>
                          <Progress
                            value={item.progress.percent}
                            aria-label={`ความคืบหน้า ${item.progress.percent}%`}
                          />
                          <Badge variant={item.enrollment === 'completed' ? 'default' : 'secondary'}>
                            {item.enrollment === 'completed' ? 'เรียนจบแล้ว' : `${item.progress.percent}%`}
                          </Badge>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
