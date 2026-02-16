'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import { trackClientAnalyticsEvent } from '@/lib/analytics-client';

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  onEnrollmentChange?: (enrolled: boolean) => void;
}

type PaymentStep = 'idle' | 'method' | 'transfer' | 'verifying';

export default function EnrollButton({ courseId, courseSlug, price, onEnrollmentChange }: EnrollButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
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

  const trackCheckoutStart = useCallback((paymentMethod: 'stripe' | 'promptpay' | 'coupon_free') => {
    void trackClientAnalyticsEvent({
      eventName: 'checkout_start',
      courseId,
      metadata: {
        itemType: 'course',
        paymentMethod,
      },
    });
  }, [courseId]);

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
    trackCheckoutStart('stripe');
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
        disabled
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          padding: '16px',
          fontSize: '1.125rem',
          background: '#e2e8f0',
          color: '#64748b',
          border: 'none',
          borderRadius: '12px',
          cursor: 'not-allowed',
        }}
      >
        กำลังตรวจสอบ...
      </button>
    );
  }

  return (
    <>
      {enrolled ? (
        <button
          onClick={handleGoToLearn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'center',
            padding: '16px',
            fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          เข้าเรียน
        </button>
      ) : (
        <button
          onClick={handleEnroll}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'center',
            padding: '16px',
            fontSize: '1.125rem',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            boxShadow: loading ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s',
          }}
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
      {paymentStep === 'method' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPaymentStep('idle')}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>เลือกช่องทางชำระเงิน</h3>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              {appliedCoupon ? (
                <div>
                  <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.9rem' }}>฿{price.toLocaleString()}</span>
                  {' '}
                  <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>฿{effectivePrice.toLocaleString()}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '2px' }}>ใช้คูปอง {appliedCoupon.code} ลด ฿{appliedCoupon.discountAmount.toLocaleString()}</div>
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>ยอดชำระ <strong style={{ color: '#2563eb' }}>฿{price.toLocaleString()}</strong></p>
              )}
            </div>

            {/* Coupon Input */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>มีโค้ดส่วนลด?</label>
              {appliedCoupon ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{appliedCoupon.code}</span>
                    {appliedCoupon.description && <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '8px' }}>{appliedCoupon.description}</span>}
                  </div>
                  <button onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>ลบ</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                    placeholder="ใส่โค้ดส่วนลด"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: couponLoading ? 'wait' : 'pointer', opacity: couponLoading || !couponCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
                  >
                    {couponLoading ? '...' : 'ใช้โค้ด'}
                  </button>
                </div>
              )}
              {couponError && <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '6px', margin: '6px 0 0' }}>{couponError}</p>}
            </div>

            {/* If coupon makes it free, show enroll button instead of payment */}
            {effectivePrice === 0 && appliedCoupon ? (
              <>
                <button
                  onClick={async () => {
                    trackCheckoutStart('coupon_free');
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
                  style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนเรียนฟรี (คูปอง 100%)'}
                </button>
                <button
                  onClick={() => setPaymentStep('idle')}
                  style={{ width: '100%', padding: '12px', marginTop: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Stripe Card */}
                  <button
                    onClick={handleStripePayment}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px 20px', background: '#f8fafc', border: '2px solid #e2e8f0',
                      borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', textAlign: 'left', width: '100%',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg style={{ width: '22px', height: '22px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>บัตรเครดิต / เดบิต</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>Visa, Mastercard ผ่าน Stripe</div>
                    </div>
                  </button>

                  {/* Bank Transfer */}
                  <button
                    onClick={() => {
                      trackCheckoutStart('promptpay');
                      setPaymentStep('transfer');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px 20px', background: '#f8fafc', border: '2px solid #e2e8f0',
                      borderRadius: '12px', cursor: 'pointer',
                      transition: 'all 0.2s', textAlign: 'left', width: '100%',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#f0fdf4'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg style={{ width: '22px', height: '22px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>โอนเงิน / PromptPay</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>โอนแล้วแนบสลิป ตรวจสอบอัตโนมัติ</div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setPaymentStep('idle')}
                  style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  ยกเลิก
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bank Transfer / Slip Upload Modal */}
      {(paymentStep === 'transfer' || paymentStep === 'verifying') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { if (paymentStep !== 'verifying') { setPaymentStep('idle'); resetSlipState(); } }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>โอนเงินและแนบสลิป</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>ยอดชำระ <strong style={{ color: '#2563eb', fontSize: '1.1rem' }}>฿{effectivePrice.toLocaleString()}</strong></p>

            {/* Bank Info */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อมูลสำหรับโอนเงิน</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>ธนาคาร</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>เลขบัญชี</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>ชื่อบัญชี</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>จำนวนเงิน</span>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>฿{effectivePrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                แนบสลิปการโอนเงิน
              </label>

              {!slipPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: '#f8fafc',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <svg style={{ width: '40px', height: '40px', color: '#94a3b8', margin: '0 auto 8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>คลิกเพื่อเลือกรูปสลิป</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0' }}>JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={slipPreview} alt="สลิป" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#f8fafc' }} />
                  <button
                    onClick={() => resetSlipState()}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
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
                style={{ display: 'none' }}
              />
            </div>

            {/* Error */}
            {verifyError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#dc2626', fontSize: '0.875rem' }}>
                {verifyError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSlipVerify}
                disabled={!slipFile || paymentStep === 'verifying'}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: !slipFile || paymentStep === 'verifying' ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', fontWeight: 600, fontSize: '1rem',
                  cursor: !slipFile || paymentStep === 'verifying' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {paymentStep === 'verifying' ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    กำลังตรวจสอบสลิป...
                  </span>
                ) : 'ตรวจสอบและชำระเงิน'}
              </button>
              <button
                onClick={() => { setPaymentStep('method'); resetSlipState(); }}
                disabled={paymentStep === 'verifying'}
                style={{
                  padding: '14px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                  background: 'white', color: '#64748b', cursor: paymentStep === 'verifying' ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                กลับ
              </button>
            </div>
          </div>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
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
