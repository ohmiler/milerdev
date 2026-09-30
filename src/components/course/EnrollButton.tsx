'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PlayCircle } from 'lucide-react';
import CheckoutDialog, { CHECKOUT_CONTRACT } from '@/components/checkout/CheckoutDialog';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';
import { useProductExposureId } from '@/components/analytics/AnalyticsViewEvent';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

export const COURSE_PAYMENT_CONTRACT = {
  ...CHECKOUT_CONTRACT,
  enrollEndpoint: '/api/enroll', stripeEndpoint: '/api/stripe/checkout',
  couponEndpoint: '/api/coupons/validate', slipEndpoint: '/api/slip/verify',
  slipFields: { file: 'slip', paymentId: 'paymentId' },
} as const;

export default function EnrollButton({ courseId, courseSlug, price, onEnrollmentChange }: EnrollButtonProps) {
  const router = useRouter();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status ?? 'unauthenticated';
  const sessionUserId = session?.user.id;
  const exposureId = useProductExposureId();
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const updateEnrolled = useCallback((value: boolean) => {
    setEnrolled(value);
    onEnrollmentChange?.(value);
  }, [onEnrollmentChange]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!sessionUserId) {
      updateEnrolled(false);
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/enrollments/check?courseId=${encodeURIComponent(courseId)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (!controller.signal.aborted) updateEnrolled(data.enrolled === true); })
      .catch(() => { if (!controller.signal.aborted) updateEnrolled(false); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [sessionUserId, status, courseId, updateEnrolled]);

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
      return;
    }
    if (price > 0) {
      trackClientAnalyticsEvent({ eventName: 'checkout_opened', courseId, placement: 'course_detail' });
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }),
      });
      const data = await response.json();
      if (response.ok) updateEnrolled(true);
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
      <CheckoutDialog key={`${sessionUserId}:${courseId}`} open={open} onClose={() => setOpen(false)} target={{ type: 'course', id: courseId }} exposureId={exposureId} returnFocusRef={triggerRef} onEnrolled={() => updateEnrolled(true)} />
      <Modal isOpen={Boolean(error)} onClose={() => setError(null)} returnFocusRef={triggerRef} type="error" title="เกิดข้อผิดพลาด">{error}</Modal>
    </>
  );
}
