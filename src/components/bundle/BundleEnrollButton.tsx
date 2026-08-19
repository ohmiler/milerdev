'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { buttonVariants } from '@/components/ui/button';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';

const styles = {
  primaryButton: buttonVariants({ className: 'w-full' }),
  successButton: 'bg-emerald-600 text-white hover:bg-emerald-700',
  loadingContent: 'inline-flex items-center gap-2',
  spinner: 'size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
  dialogAmount: 'text-foreground',
  methodList: 'grid gap-3',
  methodButton: 'flex w-full items-center gap-4 rounded-lg border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50',
  methodIcon: 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
  transferIcon: 'bg-emerald-500/10 text-emerald-700',
  methodTitle: 'block font-semibold text-foreground',
  methodDescription: 'mt-1 block text-sm text-muted-foreground',
  secondaryButton: buttonVariants({ variant: 'outline' }),
  bankInfo: 'rounded-lg border bg-muted/30 p-4',
  bankRows: 'mt-3 grid gap-2 text-sm [&_div]:flex [&_div]:justify-between [&_div]:gap-4 [&_dt]:text-muted-foreground',
  accountNumber: 'font-mono tracking-wide',
  amount: 'text-lg text-primary',
  uploadField: 'grid gap-2',
  fieldLabel: 'text-sm font-medium text-foreground',
  uploadButton: 'flex w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5',
  uploadTitle: 'font-medium text-foreground',
  uploadHint: 'mt-1 text-sm text-muted-foreground',
  slipPreview: 'relative overflow-hidden rounded-lg border bg-muted',
  removePreviewButton: 'absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-lg shadow-sm hover:bg-background',
  hiddenInput: 'hidden',
  errorPanel: 'grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive',
  verifyButton: buttonVariants({ className: 'w-full' }),
};

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
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [promptPayIntent, setPromptPayIntent] = useState<{ paymentId: string; amount: number } | null>(null);
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
        body: JSON.stringify({ bundleId }),
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
      setVerifyError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
      return;
    }
    if (file.size > BUNDLE_PAYMENT_CONTRACT.maxSlipBytes) {
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

      if (data.success) {
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
      <Link className={`${styles.primaryButton} ${styles.successButton}`} href={'/dashboard'}>
        <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2} aria-hidden={true}>
          <path d={'M22 11.08V12a10 10 0 1 1-5.93-9.14'} />
          <path d={'m9 11 3 3L22 4'} />
        </svg>
        ลงทะเบียนครบแล้ว — เข้าเรียน
      </Link>
    );
  }

  if (!available) {
    return (
      <div className="grid gap-2 rounded-xl border border-dashed bg-muted/30 p-4">
        <strong>Bundle นี้กำลังเตรียมเนื้อหา</strong>
        <p className="text-sm leading-6 text-muted-foreground">จะเปิดรับสมัครเมื่อทุกคอร์สใน Bundle มีบทเรียนพร้อมแล้ว</p>
        <button className={styles.primaryButton} type="button" disabled>ยังไม่เปิดรับสมัคร</button>
      </div>
    );
  }

  return (
    <>
      <button className={styles.primaryButton} type={'button'} onClick={handleEnroll} disabled={loading}>
        {loading
          ? <span className={styles.loadingContent}><span className={styles.spinner} aria-hidden={true} />กำลังดำเนินการ...</span>
          : price === 0
            ? 'ลงทะเบียน Bundle ฟรี'
            : `ซื้อ Bundle ฿${price.toLocaleString()}`}
      </button>

      <DialogShell
        isOpen={paymentStep === 'method'}
        onClose={() => setPaymentStep('idle')}
        title={'เลือกช่องทางชำระเงิน'}
        description={<span>ยอดชำระ <strong className={styles.dialogAmount}>฿{price.toLocaleString()}</strong></span>}
        body={(
          <div className={styles.methodList} data-payment-step={'method'}>
            <button className={styles.methodButton} type={'button'} onClick={() => void handlePromptPayPayment()} disabled={loading}>
              <span className={`${styles.methodIcon} ${styles.transferIcon}`} aria-hidden={true}>
                <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2}>
                  <rect x={1} y={4} width={22} height={16} rx={2} />
                  <path d={'M1 10h22'} />
                </svg>
              </span>
              <span>
                <strong className={styles.methodTitle}>โอนเงิน / PromptPay</strong>
                <span className={styles.methodDescription}>โอนเงินแล้วแนบสลิปเพื่อตรวจสอบอัตโนมัติ</span>
              </span>
            </button>

            <button
              className={styles.methodButton}
              type={'button'}
              onClick={() => { setPaymentStep('idle'); handleStripePayment(); }}
              disabled={loading}
            >
              <span className={styles.methodIcon} aria-hidden={true}>
                <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2}>
                  <rect x={1} y={4} width={22} height={16} rx={2} />
                  <path d={'M1 10h22'} />
                </svg>
              </span>
              <span>
                <strong className={styles.methodTitle}>{loading ? 'กำลังเปิดหน้าชำระเงิน...' : 'บัตรเครดิต / เดบิต'}</strong>
                <span className={styles.methodDescription}>ชำระผ่าน Stripe (Visa, Mastercard)</span>
              </span>
            </button>
          </div>
        )}
        dismissOnBackdrop={true}
      >
        <button className={styles.secondaryButton} type={'button'} onClick={() => setPaymentStep('idle')}>ยกเลิก</button>
      </DialogShell>

      <DialogShell
        isOpen={paymentStep === 'transfer' || paymentStep === 'verifying'}
        onClose={closeTransfer}
        title={'โอนเงินและแนบสลิป'}
        description={<span>ยอดที่ระบบจะตรวจสอบ <strong className={styles.dialogAmount}>฿{(promptPayIntent?.amount ?? price).toLocaleString()}</strong></span>}
        body={(
          <div data-payment-step={paymentStep}>
            <section className={styles.bankInfo} aria-labelledby={'bundle-bank-details'}>
              <h4 id={'bundle-bank-details'}>ข้อมูลสำหรับโอนเงิน</h4>
              <dl className={styles.bankRows}>
                <div><dt>ธนาคาร</dt><dd>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</dd></div>
                <div><dt>เลขบัญชี</dt><dd className={styles.accountNumber}>{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</dd></div>
                <div><dt>ชื่อบัญชี</dt><dd>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</dd></div>
                <div><dt>จำนวนเงิน</dt><dd className={styles.amount}>฿{(promptPayIntent?.amount ?? price).toLocaleString()}</dd></div>
              </dl>
            </section>

            <div className={styles.uploadField}>
              <span className={styles.fieldLabel}>แนบสลิปการโอนเงิน</span>
              {!slipPreview ? (
                <button className={styles.uploadButton} type={'button'} onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} aria-hidden={true}>
                    <path strokeLinecap={'round'} strokeLinejoin={'round'} strokeWidth={1.5} d={'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'} />
                  </svg>
                  <span className={styles.uploadTitle}>เลือกไฟล์รูปสลิป</span>
                  <span className={styles.uploadHint}>JPG, PNG, WEBP — ไม่เกิน 5MB</span>
                </button>
              ) : (
                <div className={styles.slipPreview}>
                  <img src={slipPreview} alt={'ตัวอย่างสลิปที่เลือก'} />
                  <button className={styles.removePreviewButton} type={'button'} onClick={resetSlipState} aria-label={'นำสลิปที่เลือกออก'}>×</button>
                </div>
              )}
              <input
                ref={fileInputRef}
                className={styles.hiddenInput}
                type={'file'}
                tabIndex={-1}
                accept={'image/jpeg,image/jpg,image/png,image/webp'}
                onChange={handleFileChange}
              />
            </div>

            {verifyError ? <div className={styles.errorPanel} role={'alert'}><strong>ตรวจสอบไม่สำเร็จ</strong><span>{verifyError}</span></div> : null}
          </div>
        )}
        dismissOnBackdrop={paymentStep !== 'verifying'}
        size={'wide'}
      >
        <button
          className={styles.secondaryButton}
          type={'button'}
          onClick={() => { setPaymentStep('method'); setPromptPayIntent(null); resetSlipState(); }}
          disabled={paymentStep === 'verifying'}
        >
          กลับ
        </button>
        <button
          className={styles.verifyButton}
          type={'button'}
          onClick={handleSlipVerify}
          disabled={!slipFile || !promptPayIntent || paymentStep === 'verifying'}
        >
          {paymentStep === 'verifying'
            ? <span className={styles.loadingContent}><span className={styles.spinner} aria-hidden={true} />กำลังตรวจสอบสลิป...</span>
            : 'ตรวจสอบและชำระเงิน'}
        </button>
      </DialogShell>

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        type={modal.type}
        title={modal.title}
        buttonText={modal.type === 'success' ? 'เรียบร้อย' : 'ตกลง'}
      >
        {modal.message}
      </Modal>
    </>
  );
}
