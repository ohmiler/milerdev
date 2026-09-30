'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import CheckoutDialog, { CHECKOUT_CONTRACT } from '@/components/checkout/CheckoutDialog';
import Modal from '@/components/ui/Modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';
import { useProductExposureId } from '@/components/analytics/AnalyticsViewEvent';
import type { BundleDecisionFacts } from '@/lib/bundle-decision-facts';

interface BundleEnrollButtonProps {
  bundleId: string;
  bundleSlug: string;
  decisionFacts: Pick<BundleDecisionFacts, 'price' | 'ownership' | 'actions'>;
}

export const BUNDLE_PAYMENT_CONTRACT = {
  ...CHECKOUT_CONTRACT,
  enrollEndpoint: '/api/bundles/enroll', stripeEndpoint: '/api/stripe/bundle-checkout',
  slipEndpoint: '/api/bundles/slip/verify', slipFields: { file: 'slip', paymentId: 'paymentId' },
} as const;

export default function BundleEnrollButton({ bundleId, bundleSlug, decisionFacts }: BundleEnrollButtonProps) {
  const router = useRouter();
  const session = useSession()?.data;
  const exposureId = useProductExposureId();
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/bundles/${bundleSlug}`);
      return;
    }
    if (!decisionFacts.price.isFree) {
      trackClientAnalyticsEvent({ eventName: 'checkout_opened', bundleId, placement: 'bundle_detail' });
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(BUNDLE_PAYMENT_CONTRACT.enrollEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bundleId }),
      });
      const data = await response.json();
      if (response.ok) { setEnrolled(true); router.refresh(); }
      else setError(data.error || 'ไม่สามารถลงทะเบียนได้');
    } catch { setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่'); }
    finally { setLoading(false); }
  };

  if (enrolled || decisionFacts.ownership.status === 'complete') {
    return <Button asChild className="w-full"><Link href={decisionFacts.actions.complete.href}><CircleCheck data-icon="inline-start" aria-hidden="true" />{decisionFacts.actions.complete.label}</Link></Button>;
  }
  const disclosure = decisionFacts.ownership.disclosure ? <Alert><CircleAlert aria-hidden="true" /><AlertTitle>มีบางคอร์สอยู่ในบัญชีแล้ว</AlertTitle><AlertDescription>{decisionFacts.ownership.disclosure}</AlertDescription></Alert> : null;
  if (decisionFacts.actions.acquisition.kind === 'unavailable') {
    return <div className="flex flex-col gap-4">{disclosure}<Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><CircleAlert aria-hidden="true" /></EmptyMedia><EmptyTitle>Bundle นี้กำลังเตรียมเนื้อหา</EmptyTitle><EmptyDescription>จะเปิดรับสมัครเมื่อทุกคอร์สใน Bundle มีบทเรียนพร้อมแล้ว</EmptyDescription></EmptyHeader></Empty></div>;
  }
  return (
    <>
      {disclosure}
      <Button ref={triggerRef} type="button" onClick={handleEnroll} disabled={loading} className="w-full" aria-busy={loading}>{loading ? <><Spinner data-icon="inline-start" aria-hidden="true" />กำลังดำเนินการ...</> : decisionFacts.actions.acquisition.label}</Button>
      <CheckoutDialog key={`${session?.user.id}:${bundleId}`} open={open} onClose={() => setOpen(false)} target={{ type: 'bundle', id: bundleId }} exposureId={exposureId} returnFocusRef={triggerRef} onEnrolled={() => { setEnrolled(true); router.refresh(); }} />
      <Modal isOpen={Boolean(error)} onClose={() => setError(null)} returnFocusRef={triggerRef} type="error" title="เกิดข้อผิดพลาด">{error}</Modal>
    </>
  );
}
