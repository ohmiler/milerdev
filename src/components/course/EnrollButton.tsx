'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import styles from './EnrollButton.module.css';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

type PaymentStep = 'idle' | 'method' | 'transfer' | 'verifying';

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
      const res = await fetch('/api/coupons/validate', {
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

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
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
    if (!slipFile) return;

    setPaymentStep('verifying');
    setVerifyError(null);

    try {
      const formData = new FormData();
      formData.append('slip', slipFile);
      formData.append('courseId', courseId);
      formData.append('amount', effectivePrice.toString());

      const res = await fetch('/api/slip/verify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        updateEnrolled(true);
        setPaymentStep('idle');
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
      {paymentStep === 'method' && createPortal(
        <div className={styles.dialogLayer} onClick={() => setPaymentStep('idle')}>
          <div className={styles.dialogBackdrop} aria-hidden="true" />
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="payment-method-title" onClick={(e) => e.stopPropagation()}>
            <p className={styles.dialogEyebrow}>Payment / เลือกวิธีชำระ</p>
            <h3 id="payment-method-title" className={styles.dialogTitle}>เลือกช่องทางชำระเงิน</h3>
            <div className={styles.paymentSummary}>
              {appliedCoupon ? (
                <div>
                  <span className={styles.originalPrice}>฿{price.toLocaleString()}</span>
                  <strong className={styles.effectivePrice}>฿{effectivePrice.toLocaleString()}</strong>
                  <div className={styles.couponSaving}>ใช้คูปอง {appliedCoupon.code} ลด ฿{appliedCoupon.discountAmount.toLocaleString()}</div>
                </div>
              ) : (
                <p>ยอดชำระ <strong>฿{price.toLocaleString()}</strong></p>
              )}
            </div>

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

            {/* If coupon makes it free, show enroll button instead of payment */}
            {effectivePrice === 0 && appliedCoupon ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch('/api/enroll', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ courseId, couponId: appliedCoupon.couponId }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        updateEnrolled(true);
                        setPaymentStep('idle');
                        setModal({ isOpen: true, type: 'success', title: 'ลงทะเบียนสำเร็จ!', message: 'ใช้คูปองส่วนลด 100% ลงทะเบียนเรียบร้อยแล้ว' });
                      } else {
                        setModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: data.error || 'ไม่สามารถลงทะเบียนได้' });
                      }
                    } catch { setModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเชื่อมต่อได้' }); }
                    finally { setLoading(false); }
                  }}
                  disabled={loading}
                  className={`${styles.primaryButton} ${styles.successButton}`}
                >
                  {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเรียนฟรี (คูปอง 100%)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStep('idle')}
                  className={`${styles.textButton} ${styles.cancelButton}`}
                >
                  ยกเลิก
                </button>
              </>
            ) : (
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
                      setPaymentStep('transfer');
                    }}
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

                <button
                  type="button"
                  onClick={() => setPaymentStep('idle')}
                  className={`${styles.textButton} ${styles.cancelButton}`}
                >
                  ยกเลิก
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Bank Transfer / Slip Upload Modal */}
      {(paymentStep === 'transfer' || paymentStep === 'verifying') && createPortal(
        <div className={styles.dialogLayer} onClick={() => { if (paymentStep !== 'verifying') { setPaymentStep('idle'); resetSlipState(); } }}>
          <div className={styles.dialogBackdrop} aria-hidden="true" />
          <div className={`${styles.dialog} ${styles.transferDialog}`} role="dialog" aria-modal="true" aria-labelledby="slip-payment-title" onClick={(e) => e.stopPropagation()}>
            <p className={styles.dialogEyebrow}>PromptPay / Slip verification</p>
            <h3 id="slip-payment-title" className={styles.dialogTitle}>โอนเงินและแนบสลิป</h3>
            <div className={styles.paymentSummary}>ยอดชำระ <strong>฿{effectivePrice.toLocaleString()}</strong></div>

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
                  <strong className={styles.amount}>฿{effectivePrice.toLocaleString()}</strong>
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

            {/* Actions */}
            <div className={styles.dialogActions}>
              <button
                type="button"
                onClick={handleSlipVerify}
                disabled={!slipFile || paymentStep === 'verifying'}
                className={`${styles.primaryButton} ${styles.successButton}`}
              >
                {paymentStep === 'verifying' ? (
                  <span className={styles.loadingContent}>
                    <span className={styles.spinner} aria-hidden="true" />
                    กำลังตรวจสอบสลิป...
                  </span>
                ) : 'ตรวจสอบและชำระเงิน'}
              </button>
              <button
                type="button"
                onClick={() => { setPaymentStep('method'); resetSlipState(); }}
                disabled={paymentStep === 'verifying'}
                className={styles.secondaryButton}
              >
                กลับ
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

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
