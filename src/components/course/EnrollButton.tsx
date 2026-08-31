'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CircleAlert,
  CreditCard,
  ImagePlus,
  PlayCircle,
  Smartphone,
  TicketPercent,
  X,
} from 'lucide-react';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';
import { useProductExposureId } from '@/components/analytics/AnalyticsViewEvent';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

type PaymentStep = 'idle' | 'method' | 'transfer' | 'verifying';

export const COURSE_PAYMENT_CONTRACT = {
  enrollEndpoint: '/api/enroll',
  stripeEndpoint: '/api/stripe/checkout',
  couponEndpoint: '/api/coupons/validate',
  intentEndpoint: '/api/promptpay/intents',
  slipEndpoint: '/api/slip/verify',
  slipFields: {
    file: 'slip',
    paymentId: 'paymentId',
  },
  allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as readonly string[],
  maxSlipBytes: 5 * 1024 * 1024,
} as const;

export default function EnrollButton({ courseId, courseSlug, price, onEnrollmentChange }: EnrollButtonProps) {
  const router = useRouter();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status ?? 'unauthenticated';
  const exposureId = useProductExposureId();
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [promptPayIntent, setPromptPayIntent] = useState<{ paymentId: string; amount: number } | null>(null);
  const enrollmentTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string; code: string; discountAmount: number; finalPrice: number; description: string | null;
  } | null>(null);
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const updateEnrolled = useCallback((value: boolean) => {
    setEnrolled(value);
    onEnrollmentChange?.(value);
  }, [onEnrollmentChange]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      updateEnrolled(false);
      setChecking(false);
      return;
    }

    fetch(`/api/enrollments/check?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        updateEnrolled(data.enrolled);
      })
      .catch((error) => {
        console.error(error);
        updateEnrolled(false);
      })
      .finally(() => setChecking(false));
  }, [session, status, courseId, updateEnrolled]);

  const handleEnroll = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/courses/${courseSlug}`);
      return;
    }

    // ถ้าคอร์สมีราคา → แสดงตัวเลือกช่องทางชำระเงิน
    if (price > 0) {
      trackClientAnalyticsEvent({
        eventName: 'checkout_opened',
        courseId,
        placement: 'course_detail',
      });
      setPaymentStep('method');
      return;
    }

    // ถ้าคอร์สฟรี → ลงทะเบียนเลย
    setLoading(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.ok) {
        updateEnrolled(true);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: 'ยินดีด้วย! คุณลงทะเบียนคอร์สนี้เรียบร้อยแล้ว',
        });
      } else {
        if (data.error === 'คุณลงทะเบียนคอร์สนี้แล้ว') {
          updateEnrolled(true);
        } else {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: data.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่',
          });
        }
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setLoading(false);
    }
  };

  const effectivePrice = appliedCoupon ? appliedCoupon.finalPrice : price;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(COURSE_PAYMENT_CONTRACT.couponEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, courseId, originalPrice: price }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          couponId: data.couponId,
          code: data.code,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
          description: data.description,
        });
        setCouponError(null);
      } else {
        setCouponError(data.error || 'คูปองไม่ถูกต้อง');
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('เกิดข้อผิดพลาด');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleCouponEnrollment = async () => {
    if (!appliedCoupon || effectivePrice !== 0) return;

    setLoading(true);
    try {
      const res = await fetch(COURSE_PAYMENT_CONTRACT.enrollEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, couponId: appliedCoupon.couponId }),
      });
      const data = await res.json();

      if (res.ok) {
        updateEnrolled(true);
        setPaymentStep('idle');
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ลงทะเบียนสำเร็จ!',
          message: 'ใช้คูปองส่วนลด 100% ลงทะเบียนเรียบร้อยแล้ว',
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
        message: 'ไม่สามารถเชื่อมต่อได้',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(COURSE_PAYMENT_CONTRACT.stripeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...(appliedCoupon && { couponId: appliedCoupon.couponId }),
          ...(exposureId && { exposureId }),
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      } else {
        setPaymentStep('idle');
        setModal({
          isOpen: true,
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: data.error || 'ไม่สามารถสร้างหน้าชำระเงินได้ กรุณาลองใหม่',
        });
      }
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

  const handlePromptPayPayment = async () => {
    setLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch(COURSE_PAYMENT_CONTRACT.intentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, ...(appliedCoupon && { couponId: appliedCoupon.couponId }) }),
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!COURSE_PAYMENT_CONTRACT.allowedSlipTypes.includes(file.type)) {
      resetSlipState();
      setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > COURSE_PAYMENT_CONTRACT.maxSlipBytes) {
      resetSlipState();
      setVerifyError('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    setSlipFile(file);
    setVerifyError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSlipPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSlipVerify = async () => {
    if (!slipFile || !promptPayIntent) return;

    setPaymentStep('verifying');
    setVerifyError(null);

    try {
      const formData = new FormData();
      formData.append(COURSE_PAYMENT_CONTRACT.slipFields.file, slipFile);
      formData.append(COURSE_PAYMENT_CONTRACT.slipFields.paymentId, promptPayIntent.paymentId);

      const res = await fetch(COURSE_PAYMENT_CONTRACT.slipEndpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        updateEnrolled(true);
        setPaymentStep('idle');
        setPromptPayIntent(null);
        resetSlipState();
        setModal({
          isOpen: true,
          type: 'success',
          title: 'ชำระเงินสำเร็จ!',
          message: 'ตรวจสอบสลิปเรียบร้อย คุณสามารถเริ่มเรียนได้เลย',
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
    const wasSuccess = modal.type === 'success';
    setModal({ ...modal, isOpen: false });
    if (wasSuccess) {
      router.push(`/courses/${courseSlug}/learn`);
    }
  };

  const handleGoToLearn = () => {
    router.push(`/courses/${courseSlug}/learn`);
  };

  if (checking) {
    return (
      <Button type="button" className="w-full" disabled aria-busy="true">
        <Spinner data-icon="inline-start" aria-hidden="true" />
        กำลังตรวจสอบ...
      </Button>
    );
  }

  return (
    <>
      {enrolled ? (
        <Button
          type="button"
          onClick={handleGoToLearn}
          className="w-full"
        >
          <PlayCircle data-icon="inline-start" aria-hidden="true" />
          เข้าเรียน
        </Button>
      ) : (
        <Button
          ref={enrollmentTriggerRef}
          type="button"
          onClick={handleEnroll}
          disabled={loading}
          className="w-full"
          aria-busy={loading}
        >
          {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {loading ? 'กำลังดำเนินการ...' : price === 0 ? (
            'ลงทะเบียนเรียนฟรี'
          ) : (
            `ซื้อคอร์สนี้ ฿${price.toLocaleString()}`
          )}
        </Button>
      )}

      {/* Payment Method Selection Modal */}
      <DialogShell
        isOpen={paymentStep === 'method'}
        onClose={() => setPaymentStep('idle')}
        title={'เลือกช่องทางชำระเงิน'}
        description={appliedCoupon ? (
          <span className="flex flex-wrap items-center gap-2">
            <s>฿{price.toLocaleString()}</s>
            <strong>฿{effectivePrice.toLocaleString()}</strong>
            <Badge variant="secondary">คูปอง {appliedCoupon.code} ลด ฿{appliedCoupon.discountAmount.toLocaleString()}</Badge>
          </span>
        ) : (
          <span>ยอดชำระ <strong>฿{price.toLocaleString()}</strong></span>
        )}
        body={(
          <div className="flex flex-col gap-5">
            <Field data-invalid={Boolean(couponError) || undefined}>
              <FieldLabel htmlFor="course-coupon-code">มีโค้ดส่วนลด?</FieldLabel>
              {appliedCoupon ? (
                <Alert>
                  <TicketPercent aria-hidden="true" />
                  <AlertTitle>ใช้คูปอง {appliedCoupon.code} แล้ว</AlertTitle>
                  <AlertDescription>
                    {appliedCoupon.description || `ลด ฿${appliedCoupon.discountAmount.toLocaleString()}`}
                    <div className="mt-3"><Button type="button" variant="destructive" size="sm" onClick={handleRemoveCoupon}>ลบคูปอง</Button></div>
                  </AlertDescription>
                </Alert>
              ) : (
                <InputGroup>
                  <InputGroupInput
                    id="course-coupon-code"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                    placeholder="ใส่โค้ดส่วนลด"
                    aria-invalid={Boolean(couponError) || undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading && <Spinner data-icon="inline-start" aria-hidden="true" />}
                      {couponLoading ? 'กำลังตรวจ' : 'ใช้โค้ด'}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              )}
              {couponError && <FieldError>{couponError}</FieldError>}
            </Field>

            {effectivePrice === 0 && appliedCoupon ? null : (
              <ToggleGroup
                type="single"
                orientation="vertical"
                variant="outline"
                className="w-full"
                aria-label="ช่องทางชำระเงิน"
                onValueChange={(value) => {
                  if (value === 'stripe') void handleStripePayment();
                  if (value === 'promptpay') void handlePromptPayPayment();
                }}
              >
                  <ToggleGroupItem
                    value="stripe"
                    disabled={loading}
                    className="h-auto w-full justify-start p-4 text-left whitespace-normal"
                  >
                    <CreditCard aria-hidden="true" />
                    <span className="flex flex-col items-start gap-1">
                      <strong>บัตรเครดิต / เดบิต</strong>
                      <span>Visa, Mastercard ผ่าน Stripe</span>
                    </span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="promptpay"
                    disabled={loading}
                    className="h-auto w-full justify-start p-4 text-left whitespace-normal"
                  >
                    <Smartphone aria-hidden="true" />
                    <span className="flex flex-col items-start gap-1">
                      <strong>โอนเงิน / PromptPay</strong>
                      <span>โอนแล้วแนบสลิป ตรวจสอบอัตโนมัติ</span>
                    </span>
                  </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        )}
        dismissOnBackdrop={true}
        returnFocusRef={enrollmentTriggerRef}
        size={'wide'}
      >
        <Button
          type="button"
          onClick={() => setPaymentStep('idle')}
          variant="outline"
        >
          ยกเลิก
        </Button>
        {effectivePrice === 0 && appliedCoupon ? (
          <Button
            type="button"
            onClick={handleCouponEnrollment}
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Spinner data-icon="inline-start" aria-hidden="true" />}
            {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเรียนฟรี (คูปอง 100%)'}
          </Button>
        ) : null}
      </DialogShell>

      {/* Bank Transfer / Slip Upload Modal */}
      <DialogShell
        isOpen={paymentStep === 'transfer' || paymentStep === 'verifying'}
        onClose={() => { if (paymentStep !== 'verifying') { setPaymentStep('idle'); resetSlipState(); } }}
        title={'โอนเงินและแนบสลิป'}
        description={<span>ยอดที่ระบบจะตรวจสอบ <strong>฿{(promptPayIntent?.amount ?? effectivePrice).toLocaleString()}</strong></span>}
        body={(
          <div className="flex flex-col gap-5">
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
                  <div className="flex items-center justify-between gap-4"><dt>จำนวนเงิน</dt><dd><strong>฿{(promptPayIntent?.amount ?? effectivePrice).toLocaleString()}</strong></dd></div>
                </dl>
              </CardContent>
            </Card>

            <Field data-invalid={Boolean(verifyError) || undefined}>
              <FieldLabel htmlFor="course-slip-upload">แนบสลิปการโอนเงิน</FieldLabel>

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
                    onClick={() => resetSlipState()}
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
                id="course-slip-upload"
                ref={fileInputRef}
                type="file"
                tabIndex={-1}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
                aria-invalid={Boolean(verifyError) || undefined}
              />
            </Field>

            {verifyError && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>ตรวจสอบสลิปไม่สำเร็จ</AlertTitle>
                <AlertDescription>{verifyError}</AlertDescription>
              </Alert>
            )}
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
        buttonText={modal.type === 'success' ? 'เริ่มเรียนเลย' : 'ตกลง'}
      >
        {modal.message}
      </Modal>
    </>
  );
}
