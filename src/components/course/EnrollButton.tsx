'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { buttonVariants } from '@/components/ui/button';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';

const styles = {
  primaryButton: buttonVariants({ className: 'w-full' }),
  successButton: 'bg-emerald-600 text-white hover:bg-emerald-700',
  discountSummary: 'grid gap-1 rounded-lg bg-primary/5 p-4',
  originalPrice: 'text-sm text-muted-foreground line-through',
  effectivePrice: 'text-2xl text-primary',
  couponSaving: 'text-sm text-muted-foreground',
  dialogAmount: 'text-foreground',
  couponPanel: 'grid gap-2 rounded-lg border bg-muted/30 p-4',
  fieldLabel: 'text-sm font-medium text-foreground',
  couponApplied: 'flex items-center justify-between gap-3',
  couponCode: 'font-mono font-semibold text-primary',
  couponDescription: 'ml-2 text-sm text-muted-foreground',
  textButton: buttonVariants({ variant: 'ghost', size: 'sm' }),
  dangerText: 'text-destructive hover:text-destructive',
  couponInputRow: 'flex gap-2',
  couponInput: 'h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
  compactButton: buttonVariants({ variant: 'outline', size: 'sm' }),
  errorText: 'text-sm text-destructive',
  methodList: 'grid gap-3',
  methodButton: 'flex w-full items-center gap-4 rounded-lg border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50',
  methodIcon: 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
  transferIcon: 'bg-emerald-500/10 text-emerald-700',
  methodTitle: 'font-semibold text-foreground',
  methodDescription: 'mt-1 text-sm text-muted-foreground',
  secondaryButton: buttonVariants({ variant: 'outline' }),
  bankInfo: 'rounded-lg border bg-muted/30 p-4',
  bankInfoLabel: 'mb-3 font-semibold text-foreground',
  bankRows: 'grid gap-2 text-sm',
  bankRow: 'flex items-center justify-between gap-4',
  accountNumber: 'font-mono tracking-wide',
  amount: 'text-lg text-primary',
  uploadField: 'grid gap-2',
  uploadButton: 'flex w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5',
  uploadTitle: 'font-medium text-foreground',
  uploadHint: 'mt-1 text-sm text-muted-foreground',
  slipPreview: 'relative overflow-hidden rounded-lg border bg-muted',
  removePreviewButton: 'absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-lg shadow-sm hover:bg-background',
  hiddenInput: 'hidden',
  errorPanel: 'grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive',
  loadingContent: 'inline-flex items-center gap-2',
  spinner: 'size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
};

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
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [promptPayIntent, setPromptPayIntent] = useState<{ paymentId: string; amount: number } | null>(null);
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
      setChecking(false);
      return;
    }

    fetch(`/api/enrollments/check?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        updateEnrolled(data.enrolled);
      })
      .catch(console.error)
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
        body: JSON.stringify({ courseId, ...(appliedCoupon && { couponId: appliedCoupon.couponId }) }),
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
      setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > COURSE_PAYMENT_CONTRACT.maxSlipBytes) {
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

      if (data.success) {
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
      <button
        type="button"
        disabled
        className={styles.primaryButton}
      >
        กำลังตรวจสอบ...
      </button>
    );
  }

  return (
    <>
      {enrolled ? (
        <button
          type="button"
          onClick={handleGoToLearn}
          className={`${styles.primaryButton} ${styles.successButton}`}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          เข้าเรียน
        </button>
      ) : (
        <button
          type="button"
          onClick={handleEnroll}
          disabled={loading}
          className={styles.primaryButton}
        >
          {loading ? (
            'กำลังดำเนินการ...'
          ) : price === 0 ? (
            'ลงทะเบียนเรียนฟรี'
          ) : (
            `ซื้อคอร์สนี้ ฿${price.toLocaleString()}`
          )}
        </button>
      )}

      {/* Payment Method Selection Modal */}
      <DialogShell
        isOpen={paymentStep === 'method'}
        onClose={() => setPaymentStep('idle')}
        title={'เลือกช่องทางชำระเงิน'}
        description={appliedCoupon ? (
          <span className={styles.discountSummary}>
            <span className={styles.originalPrice}>฿{price.toLocaleString()}</span>
            <strong className={styles.effectivePrice}>฿{effectivePrice.toLocaleString()}</strong>
            <span className={styles.couponSaving}>ใช้คูปอง {appliedCoupon.code} ลด ฿{appliedCoupon.discountAmount.toLocaleString()}</span>
          </span>
        ) : (
          <span>ยอดชำระ <strong className={styles.dialogAmount}>฿{price.toLocaleString()}</strong></span>
        )}
        body={(
          <>

            {/* Coupon Input */}
            <div className={styles.couponPanel}>
              <label className={styles.fieldLabel} htmlFor="course-coupon-code">มีโค้ดส่วนลด?</label>
              {appliedCoupon ? (
                <div className={styles.couponApplied}>
                  <div>
                    <span className={styles.couponCode}>{appliedCoupon.code}</span>
                    {appliedCoupon.description && <span className={styles.couponDescription}>{appliedCoupon.description}</span>}
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} className={`${styles.textButton} ${styles.dangerText}`}>ลบ</button>
                </div>
              ) : (
                <div className={styles.couponInputRow}>
                  <input
                    id="course-coupon-code"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                    placeholder="ใส่โค้ดส่วนลด"
                    className={styles.couponInput}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className={styles.compactButton}
                  >
                    {couponLoading ? '...' : 'ใช้โค้ด'}
                  </button>
                </div>
              )}
              {couponError && <p className={styles.errorText}>{couponError}</p>}
            </div>

            {effectivePrice === 0 && appliedCoupon ? null : (
              <>
                <div className={styles.methodList}>
                  {/* Stripe Card */}
                  <button
                    type="button"
                    onClick={handleStripePayment}
                    disabled={loading}
                    className={styles.methodButton}
                  >
                    <div className={styles.methodIcon}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.methodTitle}>บัตรเครดิต / เดบิต</div>
                      <div className={styles.methodDescription}>Visa, Mastercard ผ่าน Stripe</div>
                    </div>
                  </button>

                  {/* Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => {
                      void handlePromptPayPayment();
                    }}
                    disabled={loading}
                    className={styles.methodButton}
                  >
                    <div className={`${styles.methodIcon} ${styles.transferIcon}`}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.methodTitle}>โอนเงิน / PromptPay</div>
                      <div className={styles.methodDescription}>โอนแล้วแนบสลิป ตรวจสอบอัตโนมัติ</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </>
        )}
        dismissOnBackdrop={true}
        size={'wide'}
      >
        <button
          type={'button'}
          onClick={() => setPaymentStep('idle')}
          className={styles.secondaryButton}
        >
          ยกเลิก
        </button>
        {effectivePrice === 0 && appliedCoupon ? (
          <button
            type={'button'}
            onClick={handleCouponEnrollment}
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเรียนฟรี (คูปอง 100%)'}
          </button>
        ) : null}
      </DialogShell>

      {/* Bank Transfer / Slip Upload Modal */}
      <DialogShell
        isOpen={paymentStep === 'transfer' || paymentStep === 'verifying'}
        onClose={() => { if (paymentStep !== 'verifying') { setPaymentStep('idle'); resetSlipState(); } }}
        title={'โอนเงินและแนบสลิป'}
        description={<span>ยอดที่ระบบจะตรวจสอบ <strong className={styles.dialogAmount}>฿{(promptPayIntent?.amount ?? effectivePrice).toLocaleString()}</strong></span>}
        body={(
          <>

            {/* Bank Info */}
            <div className={styles.bankInfo}>
              <div className={styles.bankInfoLabel}>ข้อมูลสำหรับโอนเงิน</div>
              <div className={styles.bankRows}>
                <div className={styles.bankRow}>
                  <span>ธนาคาร</span>
                  <strong>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</strong>
                </div>
                <div className={styles.bankRow}>
                  <span>เลขบัญชี</span>
                  <strong className={styles.accountNumber}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</strong>
                </div>
                <div className={styles.bankRow}>
                  <span>ชื่อบัญชี</span>
                  <strong>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</strong>
                </div>
                <div className={styles.bankRow}>
                  <span>จำนวนเงิน</span>
                  <strong className={styles.amount}>฿{(promptPayIntent?.amount ?? effectivePrice).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className={styles.uploadField}>
              <label className={styles.fieldLabel}>
                แนบสลิปการโอนเงิน
              </label>

              {!slipPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadButton}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className={styles.uploadTitle}>คลิกเพื่อเลือกรูปสลิป</p>
                  <p className={styles.uploadHint}>JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                </button>
              ) : (
                <div className={styles.slipPreview}>
                  <img src={slipPreview} alt="สลิป" />
                  <button
                    type="button"
                    onClick={() => resetSlipState()}
                    className={styles.removePreviewButton}
                    aria-label="ลบรูปสลิปที่เลือก"
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                tabIndex={-1}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
            </div>

            {/* Error */}
            {verifyError && (
              <div className={styles.errorPanel} role="alert">
                {verifyError}
              </div>
            )}

          </>
        )}
        dismissOnBackdrop={paymentStep !== 'verifying'}
        size={'wide'}
      >
        <button
          type={'button'}
          onClick={() => { setPaymentStep('method'); setPromptPayIntent(null); resetSlipState(); }}
          disabled={paymentStep === 'verifying'}
          className={styles.secondaryButton}
        >
          กลับ
        </button>
        <button
          type={'button'}
          onClick={handleSlipVerify}
          disabled={!slipFile || !promptPayIntent || paymentStep === 'verifying'}
          className={styles.primaryButton}
        >
          {paymentStep === 'verifying' ? (
            <span className={styles.loadingContent}>
              <span className={styles.spinner} aria-hidden={true} />
              กำลังตรวจสอบสลิป...
            </span>
          ) : 'ตรวจสอบและชำระเงิน'}
        </button>
      </DialogShell>

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        type={modal.type}
        title={modal.title}
        buttonText={modal.type === 'success' ? 'เริ่มเรียนเลย' : 'ตกลง'}
      >
        {modal.message}
      </Modal>
    </>
  );
}
