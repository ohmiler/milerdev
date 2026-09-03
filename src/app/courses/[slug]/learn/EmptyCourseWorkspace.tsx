import MainContent from '@/components/layout/MainContent';
import Link from 'next/link';
import { BookOpen, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface EmptyCourseWorkspaceProps {
  courseTitle: string;
  courseSlug: string;
  paymentSuccess: boolean;
}

export default function EmptyCourseWorkspace({
  courseTitle,
  courseSlug,
  paymentSuccess,
}: EmptyCourseWorkspaceProps) {
  return (
    <MainContent className="min-h-screen bg-background text-foreground">
      {paymentSuccess ? (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <Alert>
            <CircleCheck aria-hidden="true" />
            <AlertTitle>สิทธิ์เข้าเรียนพร้อมแล้ว</AlertTitle>
            <AlertDescription>
              ระบบบันทึกคอร์ส {courseTitle} ไว้ในบัญชีของคุณเรียบร้อย
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3 font-semibold" href="/dashboard">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">MD</span>
            MilerDev Learning
          </Link>
          <strong className="hidden max-w-md truncate text-sm md:block">{courseTitle}</strong>
          <Button asChild variant="secondary">
            <Link href={`/courses/${courseSlug}`}>ดูหน้าคอร์ส</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>ลำดับการเรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty className="border p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>ยังไม่มีบทเรียน</EmptyTitle>
                <EmptyDescription>รอทีมเผยแพร่เนื้อหา</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>

        <section aria-labelledby="empty-course-title">
          <h1 className="mb-6 text-3xl font-bold tracking-tight" id="empty-course-title">
            คอร์สนี้ยังไม่มีบทเรียนที่เปิดให้เรียน
          </h1>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>ทีมกำลังเตรียมเนื้อหาบทเรียน</EmptyTitle>
              <EmptyDescription>
                สิทธิ์เข้าเรียนของคุณยังอยู่ครบ เมื่อมีบทเรียนเผยแพร่ คุณสามารถกลับมาเริ่มเรียนจากแดชบอร์ดได้ทันที
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild>
                <Link href="/dashboard">กลับไปแดชบอร์ด</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/courses/${courseSlug}`}>ดูรายละเอียดคอร์ส</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/contact">ติดต่อทีม MilerDev</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </section>
      </div>
    </MainContent>
  );
}
