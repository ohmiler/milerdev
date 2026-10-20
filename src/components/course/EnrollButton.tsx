'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PlayCircle } from 'lucide-react';
import CheckoutDialog, { CHECKOUT_CONTRACT } from '@/components/checkout/CheckoutDialog';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { CourseLearning } from '@/lib/learning/dashboard';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  // The learner's progress comes with the answer when they are enrolled, for the course page.
  onEnrollmentChange?: (enrolled: boolean, learning?: CourseLearning | null) => void;
}

export const COURSE_PAYMENT_CONTRACT = {
  ...CHECKOUT_CONTRACT,
  enrollEndpoint: '/api/enroll', stripeEndpoint: '/api/stripe/checkout',
  slipEndpoint: '/api/slip/verify',
  slipFields: { file: 'slip', paymentId: 'paymentId' },
} as const;

export default function EnrollButton({ courseId, courseSlug, price, onEnrollmentChange }: EnrollButtonProps) {
  const router = useRouter();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status ?? 'unauthenticated';
  const sessionUserId = session?.user.id;
  // The learner and course an enrollment answer belongs to; signed out, there is nothing to check.
  const checkKey = sessionUserId ? `${sessionUserId}:${courseId}` : null;
  const [answer, setAnswer] = useState<{ key: string; enrolled: boolean } | null>(null);
  const checking = status === 'loading' || (checkKey !== null && answer?.key !== checkKey);
  const enrolled = checkKey !== null && answer?.key === checkKey && answer.enrolled;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const updateEnrolled = useCallback((key: string, value: boolean, learning: CourseLearning | null = null) => {
    setAnswer({ key, enrolled: value });
    onEnrollmentChange?.(value, learning);
  }, [onEnrollmentChange]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!checkKey) {
      onEnrollmentChange?.(false, null);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/enrollments/check?courseId=${encodeURIComponent(courseId)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (!controller.signal.aborted) updateEnrolled(checkKey, data.enrolled === true, data.learning ?? null); })
      .catch(() => { if (!controller.signal.aborted) updateEnrolled(checkKey, false); });
    return () => controller.abort();
  }, [checkKey, status, courseId, onEnrollmentChange, updateEnrolled]);

  const markEnrolled = () => {
    if (checkKey) updateEnrolled(checkKey, true);
  };

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
      return;
    }
    if (price > 0) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }),
      });
      const data = await response.json();
      if (response.ok) markEnrolled();
      else setError(data.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Button ref={triggerRef} type="button" className="w-full" disabled={checking || loading} aria-busy={checking || loading} onClick={enrolled ? () => router.push(`/courses/${courseSlug}/learn`) : handleEnroll}>
        {checking || loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : enrolled ? <PlayCircle data-icon="inline-start" aria-hidden="true" /> : null}
        {checking ? 'กำลังตรวจสอบ...' : loading ? 'กำลังดำเนินการ...' : enrolled ? 'เข้าเรียน' : price === 0 ? 'ลงทะเบียนเรียนฟรี' : `ซื้อคอร์สนี้ ฿${price.toLocaleString()}`}
      </Button>
      <CheckoutDialog key={`${sessionUserId}:${courseId}`} open={open} onClose={() => setOpen(false)} target={{ type: 'course', id: courseId }} returnFocusRef={triggerRef} onEnrolled={markEnrolled} />
      <Modal isOpen={Boolean(error)} onClose={() => setError(null)} returnFocusRef={triggerRef} type="error" title="เกิดข้อผิดพลาด">{error}</Modal>
    </>
  );
}
