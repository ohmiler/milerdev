'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CreditCard, ImagePlus, Smartphone, X } from 'lucide-react';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';
import { useProductExposureId } from '@/components/analytics/AnalyticsViewEvent';

interface BundleEnrollButtonProps {
  bundleId: string;
  price: number;
  bundleSlug: string;
  allEnrolled?: boolean;
  available?: boolean;
}

type PaymentStep = 'idle' | 'method' | 'transfer' | 'verifying';

export const BUNDLE_PAYMENT_CONTRACT = {
  enrollEndpoint: '/api/bundles/enroll',
  stripeEndpoint: '/api/stripe/bundle-checkout',
  intentEndpoint: '/api/promptpay/intents',
  slipEndpoint: '/api/bundles/slip/verify',
  slipFields: {
    file: 'slip',
    paymentId: 'paymentId',
  },
  allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as readonly string[],
  maxSlipBytes: 5 * 1024 * 1024,
} as const;

export default function BundleEnrollButton({
  bundleId,
  price,
  bundleSlug,
  allEnrolled = false,
  available = true,
}: BundleEnrollButtonProps) {
  const router = useRouter();
  const session = useSession()?.data;
  const exposureId = useProductExposureId();
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [promptPayIntent, setPromptPayIntent] = useState<{ paymentId: string; amount: number } | null>(null);
  const enrollmentTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/bundles/${bundleSlug}`);
      return;
    }

    if (price > 0) {
      trackClientAnalyticsEvent({
        eventName: 'checkout_opened',
        bundleId,
        placement: 'bundle_detail',
      });
      setPaymentStep('method');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(BUNDLE_PAYMENT_CONTRACT.enrollEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();

      if (res.ok) {
        setEnrolled(true);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: `คุณลงทะเบียน Bundle เรียบร้อยแล้ว (${data.totalEnrolled} คอร์ส)`,
        });
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: data.error || 'ไม่สามารถลงทะเบียนได้',
        });
      }
    } catch {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(BUNDLE_PAYMENT_CONTRACT.stripeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, ...(exposureId && { exposureId }) }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      setPaymentStep('idle');
      setModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: data.error || 'ไม่สามารถสร้างหน้าชำระเงินได้ กรุณาลองใหม่',
      });
    } catch {
      setPaymentStep('idle');
      setModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!BUNDLE_PAYMENT_CONTRACT.allowedSlipTypes.includes(file.type)) {
      resetSlipState();
      setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
      return;
    }
    if (file.size > BUNDLE_PAYMENT_CONTRACT.maxSlipBytes) {
      resetSlipState();
      setVerifyError('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    setSlipFile(file);
    setVerifyError(null);
    const reader = new FileReader();
    reader.onload = (readerEvent) => setSlipPreview(readerEvent.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePromptPayPayment = async () => {
    setLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch(BUNDLE_PAYMENT_CONTRACT.intentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentId || typeof data.amount !== 'number') {
        setModal({ isOpen: true, type: 'error', title: 'ไม่สามารถเริ่มรายการชำระเงิน', message: data.error || 'กรุณาลองใหม่' });
        return;
      }
      setPromptPayIntent({ paymentId: data.paymentId, amount: data.amount });
      setPaymentStep('transfer');
    } catch {
      setModal({ isOpen: true, type: 'error', title: 'ไม่สามารถเริ่มรายการชำระเงิน', message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่' });
    } finally {
      setLoading(false);
    }
  };

  const handleSlipVerify = async () => {
    if (!slipFile || !promptPayIntent) return;
    setPaymentStep('verifying');
    setVerifyError(null);

    try {
      const formData = new FormData();
      formData.append(BUNDLE_PAYMENT_CONTRACT.slipFields.file, slipFile);
      formData.append(BUNDLE_PAYMENT_CONTRACT.slipFields.paymentId, promptPayIntent.paymentId);

      const res = await fetch(BUNDLE_PAYMENT_CONTRACT.slipEndpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEnrolled(true);
        setPaymentStep('idle');
        setPromptPayIntent(null);
        resetSlipState();
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ชำระเงินสำเร็จ!',
          message: `ตรวจสอบสลิปเรียบร้อย ลงทะเบียน ${data.enrolled?.length || 0} คอร์สสำเร็จ`,
        });
      } else {
        setPaymentStep('transfer');
        setVerifyError(data.error || 'ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่');
      }
    } catch {
      setPaymentStep('transfer');
      setVerifyError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
    }
  };

  const resetSlipState = () => {
    setSlipFile(null);
    setSlipPreview(null);
    setVerifyError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalClose = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.type === 'success') router.refresh();
  };

  const closeTransfer = () => {
    if (paymentStep === 'verifying') return;
    setPaymentStep('idle');
    resetSlipState();
  };

  if (enrolled || allEnrolled) {
    return (
      <Button asChild className="w-full">
        <Link href="/dashboard">
          <CircleCheck data-icon="inline-start" aria-hidden="true" />
          ลงทะเบียนครบแล้ว — เข้าเรียน
        </Link>
      </Button>
    );
  }

  if (!available) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Bundle นี้กำลังเตรียมเนื้อหา</EmptyTitle>
          <EmptyDescription>จะเปิดรับสมัครเมื่อทุกคอร์สใน Bundle มีบทเรียนพร้อมแล้ว</EmptyDescription>
        </EmptyHeader>
        <Button type="button" className="w-full" disabled>ยังไม่เปิดรับสมัคร</Button>
      </Empty>
    );
  }

  return (
    <>
      <Button
        ref={enrollmentTriggerRef}
        className="w-full"
        type="button"
        onClick={handleEnroll}
        disabled={loading}
        aria-busy={loading}
      >
        {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
        {loading
          ? 'กำลังดำเนินการ...'
          : price === 0
            ? 'ลงทะเบียน Bundle ฟรี'
            : `ซื้อ Bundle ฿${price.toLocaleString()}`}
      </Button>

      <DialogShell
        isOpen={paymentStep === 'method'}
        onClose={() => setPaymentStep('idle')}
        title={'เลือกช่องทางชำระเงิน'}
        description={<span>ยอดชำระ <strong>฿{price.toLocaleString()}</strong></span>}
        body={(
          <ToggleGroup
            type="single"
            orientation="vertical"
            variant="outline"
            className="w-full"
            aria-label="ช่องทางชำระเงิน"
            data-payment-step="method"
            onValueChange={(value) => {
              if (value === 'promptpay') void handlePromptPayPayment();
              if (value === 'stripe') {
                setPaymentStep('idle');
                void handleStripePayment();
              }
            }}
          >
            <ToggleGroupItem
              value="promptpay"
              disabled={loading}
              className="h-auto w-full justify-start p-4 text-left whitespace-normal"
            >
              <Smartphone aria-hidden="true" />
              <span className="flex flex-col items-start gap-1">
                <strong>โอนเงิน / PromptPay</strong>
                <span>โอนเงินแล้วแนบสลิปเพื่อตรวจสอบอัตโนมัติ</span>
              </span>
            </ToggleGroupItem>

            <ToggleGroupItem
              value="stripe"
              disabled={loading}
              className="h-auto w-full justify-start p-4 text-left whitespace-normal"
            >
              <CreditCard aria-hidden="true" />
              <span className="flex flex-col items-start gap-1">
                <strong>{loading ? 'กำลังเปิดหน้าชำระเงิน...' : 'บัตรเครดิต / เดบิต'}</strong>
                <span>ชำระผ่าน Stripe (Visa, Mastercard)</span>
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        dismissOnBackdrop={true}
        returnFocusRef={enrollmentTriggerRef}
        size={'wide'}
      >
        <Button type="button" variant="outline" onClick={() => setPaymentStep('idle')}>ยกเลิก</Button>
      </DialogShell>

      <DialogShell
        isOpen={paymentStep === 'transfer' || paymentStep === 'verifying'}
        onClose={closeTransfer}
        title={'โอนเงินและแนบสลิป'}
        description={<span>ยอดที่ระบบจะตรวจสอบ <strong>฿{(promptPayIntent?.amount ?? price).toLocaleString()}</strong></span>}
        body={(
          <div className="flex flex-col gap-5" data-payment-step={paymentStep}>
            <Card size="sm">
              <CardHeader>
                <CardTitle>ข้อมูลสำหรับโอนเงิน</CardTitle>
                <CardDescription>ตรวจสอบชื่อบัญชีและจำนวนเงินก่อนโอน</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3">
                  <div className="flex items-center justify-between gap-4"><dt>ธนาคาร</dt><dd><strong>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</strong></dd></div>
                  <div className="flex items-center justify-between gap-4"><dt>เลขบัญชี</dt><dd><strong className="font-mono">{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</strong></dd></div>
                  <div className="flex items-center justify-between gap-4"><dt>ชื่อบัญชี</dt><dd><strong>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</strong></dd></div>
                  <div className="flex items-center justify-between gap-4"><dt>จำนวนเงิน</dt><dd><strong>฿{(promptPayIntent?.amount ?? price).toLocaleString()}</strong></dd></div>
                </dl>
              </CardContent>
            </Card>

            <Field data-invalid={Boolean(verifyError) || undefined}>
              <FieldLabel htmlFor="bundle-slip-upload">แนบสลิปการโอนเงิน</FieldLabel>
              {!slipPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-auto w-full flex-col py-8 whitespace-normal"
                >
                  <ImagePlus data-icon="inline-start" aria-hidden="true" />
                  <span>คลิกเพื่อเลือกรูปสลิป</span>
                  <span>JPG, PNG, WEBP (ไม่เกิน 5MB)</span>
                </Button>
              ) : (
                <div className="relative overflow-hidden rounded-xl border bg-muted">
                  <Image src={slipPreview} alt="สลิป" width={720} height={900} unoptimized className="h-auto w-full" />
                  <Button
                    type="button"
                    onClick={resetSlipState}
                    variant="destructive"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    aria-label="ลบรูปสลิปที่เลือก"
                  >
                    <X data-icon="inline-start" aria-hidden="true" />
                  </Button>
                </div>
              )}
              <Input
                id="bundle-slip-upload"
                ref={fileInputRef}
                className="sr-only"
                type="file"
                tabIndex={-1}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                aria-invalid={Boolean(verifyError) || undefined}
              />
            </Field>

            {verifyError ? (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>ตรวจสอบสลิปไม่สำเร็จ</AlertTitle>
                <AlertDescription>{verifyError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
        dismissOnBackdrop={paymentStep !== 'verifying'}
        returnFocusRef={enrollmentTriggerRef}
        size={'wide'}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => { setPaymentStep('method'); setPromptPayIntent(null); resetSlipState(); }}
          disabled={paymentStep === 'verifying'}
        >
          กลับ
        </Button>
        <Button
          type="button"
          onClick={handleSlipVerify}
          disabled={!slipFile || !promptPayIntent || paymentStep === 'verifying'}
          aria-busy={paymentStep === 'verifying'}
        >
          {paymentStep === 'verifying' ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              กำลังตรวจสอบสลิป...
            </>
          ) : 'ตรวจสอบและชำระเงิน'}
        </Button>
      </DialogShell>

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        returnFocusRef={enrollmentTriggerRef}
        type={modal.type}
        title={modal.title}
        buttonText={modal.type === 'success' ? 'เรียบร้อย' : 'ตกลง'}
      >
        {modal.message}
      </Modal>
    </>
  );
}
