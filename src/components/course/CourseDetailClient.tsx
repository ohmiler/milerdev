'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, Check, CircleCheck } from 'lucide-react';
import EnrollButton from '@/components/course/EnrollButton';
import CourseLessonList from '@/components/course/CourseLessonList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

export type EnrollmentStatus = 'checking' | 'enrolled' | 'not-enrolled';

// Shared enrollment context
const EnrollmentContext = createContext<{
  status: EnrollmentStatus;
  isEnrolled: boolean;
  setEnrollmentStatus: (status: EnrollmentStatus) => void;
}>({ status: 'checking', isEnrolled: false, setEnrollmentStatus: () => {} });

export function useEnrollment() {
  return useContext(EnrollmentContext);
}

// Provider that wraps the course detail section
export function CourseDetailProvider({ children }: { children: React.ReactNode }) {
  const [status, setEnrollmentStatus] = useState<EnrollmentStatus>('checking');
  return (
    <EnrollmentContext.Provider value={{
      status,
      isEnrolled: status === 'enrolled',
      setEnrollmentStatus,
    }}>
      {children}
    </EnrollmentContext.Provider>
  );
}

// ---

interface Lesson {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
}

interface CourseDetailClientProps {
  courseId: string;
  courseSlug: string;
  lessons?: Lesson[];
  price?: number;
  originalPrice?: number;
  promoLabel?: string | null;
  courseReady?: boolean;
  previewLessonHref?: string | null;
  hasVideoPreview?: boolean;
  renderMode?: 'lessons' | 'button' | 'final-action';
}

export default function CourseDetailClient({
  courseId,
  courseSlug,
  lessons,
  price = 0,
  originalPrice = price,
  promoLabel = null,
  courseReady = true,
  previewLessonHref = null,
  hasVideoPreview = false,
  renderMode,
}: CourseDetailClientProps) {
  const { status, isEnrolled, setEnrollmentStatus } = useEnrollment();

  const handleEnrollmentChange = useCallback((enrolled: boolean) => {
    setEnrollmentStatus(enrolled ? 'enrolled' : 'not-enrolled');
  }, [setEnrollmentStatus]);

  if (renderMode === 'button') {
    if (!courseReady) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>คอร์สกำลังเตรียมเนื้อหา</EmptyTitle>
            <EmptyDescription>
            คอร์สนี้ยังไม่เปิดรับสมัคร เมื่อบทเรียนพร้อมแล้วจึงจะสามารถลงทะเบียนได้
            </EmptyDescription>
          </EmptyHeader>
          <Button type="button" disabled className="w-full">ยังไม่เปิดรับสมัคร</Button>
        </Empty>
      );
    }

    if (status === 'enrolled') {
      return (
        <div className="grid gap-4">
          <Alert variant="success">
            <CircleCheck aria-hidden="true" />
            <AlertTitle>คุณมีสิทธิ์เรียนคอร์สนี้แล้ว</AlertTitle>
            <AlertDescription>กลับไปยังบทเรียนและเรียนต่อจากจุดที่ค้างไว้ได้เลย</AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href={`/courses/${courseSlug}/learn`}>เข้าเรียน / เรียนต่อ</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        {status === 'checking' ? (
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Spinner data-icon="inline-start" />
            กำลังตรวจสอบสิทธิ์การเรียน
          </p>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">ค่าสมัครคอร์ส</p>
              <span>ชำระครั้งเดียว</span>
            </div>
            <div className="mt-2 flex items-baseline gap-3 text-3xl font-bold tracking-tight">
              {price === 0 ? (
                <strong className="text-primary">ฟรี</strong>
              ) : (
                <>
                  <strong>฿{price.toLocaleString()}</strong>
                  {originalPrice > price && (
                    <del className="text-base font-normal text-muted-foreground">฿{originalPrice.toLocaleString()}</del>
                  )}
                </>
              )}
            </div>
            {promoLabel && <p className="mt-2 text-sm font-medium text-primary">{promoLabel}</p>}
          </div>
        )}

        <EnrollButton
          courseId={courseId}
          courseSlug={courseSlug}
          price={price}
          onEnrollmentChange={handleEnrollmentChange}
        />

        {!hasVideoPreview && previewLessonHref && status !== 'checking' && (
          <Button asChild variant="outline" className="w-full">
            <Link href={previewLessonHref}>ทดลองเรียนบทฟรี</Link>
          </Button>
        )}

        {status !== 'checking' && (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              {price === 0
                ? 'เริ่มเรียนได้ทันทีหลังลงทะเบียน'
                : 'เลือกชำระด้วยบัตรหรือ PromptPay ในขั้นตอนถัดไป'}
            </p>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="text-primary" aria-hidden="true" /> เข้าเรียนได้ตลอดชีพ</li>
              <li className="flex items-center gap-2"><Check className="text-primary" aria-hidden="true" /> เรียนได้ทุกอุปกรณ์</li>
              <li className="flex items-center gap-2"><Check className="text-primary" aria-hidden="true" /> รับ Certificate เมื่อเรียนจบ</li>
            </ul>
          </>
        )}
      </div>
    );
  }

  if (renderMode === 'final-action') {
    if (!courseReady || status === 'checking') return null;

    if (status === 'enrolled') {
      return (
        <Button asChild>
          <Link href={`/courses/${courseSlug}/learn`}>เข้าเรียน / เรียนต่อ</Link>
        </Button>
      );
    }

    return (
      <Button asChild>
        <a href="#course-action">{price === 0 ? 'ลงทะเบียนเรียนฟรี' : 'สมัครคอร์สนี้'}</a>
      </Button>
    );
  }

  // Render the lesson list (for main content)
  if (lessons) {
    return (
      <CourseLessonList
        lessons={lessons}
        courseSlug={courseSlug}
        courseId={courseId}
        isEnrolled={isEnrolled}
      />
    );
  }

  return null;
}
