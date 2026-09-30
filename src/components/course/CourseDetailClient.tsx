'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, CircleCheck } from 'lucide-react';
import EnrollButton from '@/components/course/EnrollButton';
import CourseLessonList from '@/components/course/CourseLessonList';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { CourseDecisionFacts } from '@/lib/course-decision-facts';

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
export function CourseDetailProvider({
  children,
  initialStatus = 'checking',
}: {
  children: React.ReactNode;
  initialStatus?: EnrollmentStatus;
}) {
  const [status, setEnrollmentStatus] = useState<EnrollmentStatus>(initialStatus);
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
  decisionFacts: CourseDecisionFacts;
  lessons?: Lesson[];
  previewLessonHref?: string | null;
  hasVideoPreview?: boolean;
  renderMode?: 'lessons' | 'button' | 'final-action';
}

export default function CourseDetailClient({
  courseId,
  courseSlug,
  decisionFacts,
  lessons,
  previewLessonHref = null,
  hasVideoPreview = false,
  renderMode,
}: CourseDetailClientProps) {
  const { status, isEnrolled, setEnrollmentStatus } = useEnrollment();
  const price = decisionFacts.price.effective;
  const promoLabel = decisionFacts.promotion.label;
  const courseReady = decisionFacts.readiness === 'ready';

  const handleEnrollmentChange = useCallback((enrolled: boolean) => {
    setEnrollmentStatus(enrolled ? 'enrolled' : 'not-enrolled');
  }, [setEnrollmentStatus]);

  if (renderMode === 'button') {
    if (!courseReady && status !== 'enrolled') {
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

          </Alert>
          <div>
            <h2 className="text-xl font-semibold">พร้อมกลับมาเรียนต่อ?</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">เลือกบทที่ต้องการ แล้วเรียนในจังหวะของคุณ</p>
          </div>
          <Button asChild className="w-full">
            <Link href={decisionFacts.actions.learner.href!}>{decisionFacts.actions.learner.label}</Link>
          </Button>
          <a href="#course-curriculum" className="text-center text-xs text-muted-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">ดูรายการบทเรียนทั้งหมด</a>
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
              {decisionFacts.price.isFree ? (
                <strong className="text-primary">ฟรี</strong>
              ) : (
                <>
                  <strong>{decisionFacts.price.effectiveFormatted}</strong>
                  {decisionFacts.promotion.isActive && (
                    <del className="text-base font-normal text-muted-foreground">{decisionFacts.price.regularFormatted}</del>
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
              {decisionFacts.price.isFree
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
    if (status === 'checking' || (!courseReady && status !== 'enrolled')) return null;

    return (
      <section className="mb-12 flex flex-col gap-6 rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:mb-16 sm:flex-row sm:items-center sm:justify-between sm:p-9" aria-labelledby="course-final-title">
        <div className="min-w-0">
          <h2 id="course-final-title" className="text-xl font-semibold text-balance">{isEnrolled ? 'กลับไปลงมือทำต่อได้เลย' : 'พร้อมเริ่มเรียนแล้วหรือยัง?'}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{isEnrolled ? 'คอร์สของคุณพร้อมให้กลับมาเรียนและทบทวน' : 'ทบทวนรายละเอียด แล้วเลือกเริ่มเรียนในจังหวะของคุณ'}</p>
        </div>
        <Button asChild className="shrink-0">
          {isEnrolled ? (
            <Link href={decisionFacts.actions.learner.href!}>{decisionFacts.actions.learner.label}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
          ) : (
            <a href="#course-action">{decisionFacts.actions.member.label}<ArrowRight data-icon="inline-end" aria-hidden="true" /></a>
          )}
        </Button>
      </section>
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
