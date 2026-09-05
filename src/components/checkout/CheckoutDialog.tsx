'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { CreditCard, Smartphone, X } from 'lucide-react';
import DialogShell from '@/components/ui/DialogShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import OrderReviewSummary, { formatOrderAmount } from './OrderReviewSummary';
import type { OrderReview } from '@/lib/order-review';
import type { PaymentPresentation } from '@/lib/payment-presentation';

export const CHECKOUT_CONTRACT = {
  reviewEndpoint: '/api/checkout/review',
  intentEndpoint: '/api/promptpay/intents',
  allowedSlipTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as readonly string[],
  maxSlipBytes: 5 * 1024 * 1024,
};

type Intent = { paymentId: string; amount: number; itemTitle: string; expiresAt: string };
type Props = {
  open: boolean;
  onClose: () => void;
  target: { type: 'course' | 'bundle'; id: string };
  exposureId: string | null | undefined;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onEnrolled: () => void;
};

export default function CheckoutDialog({ open, onClose, target, exposureId, returnFocusRef, onEnrolled }: Props) {
  const [review, setReview] = useState<OrderReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [presentation, setPresentation] = useState<PaymentPresentation | null>(null);
  const [expired, setExpired] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const reviewRequest = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const couponId = useId();
  const slipId = useId();
  const body = target.type === 'course' ? { courseId: target.id } : { bundleId: target.id };
  const endpoints = target.type === 'course'
    ? { stripe: '/api/stripe/checkout', slip: '/api/slip/verify', enroll: '/api/enroll' }
    : { stripe: '/api/stripe/bundle-checkout', slip: '/api/bundles/slip/verify', enroll: '/api/bundles/enroll' };

  useEffect(() => {
    if (!open || intent) return;
    const controller = new AbortController();
    const version = ++reviewRequest.current;
    // Every fresh opening revalidates product/ownership facts. Coupons are reapplied explicitly.
    fetch(CHECKOUT_CONTRACT.reviewEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target.type === 'course' ? { courseId: target.id } : { bundleId: target.id }),
      signal: controller.signal,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.review) throw new Error(data.error || 'ยังตรวจสอบรายการไม่ได้');
      if (!controller.signal.aborted && version === reviewRequest.current) setReview(data.review);
    }).catch((reason) => {
      if (!controller.signal.aborted && version === reviewRequest.current) setError(reason instanceof Error ? reason.message : 'ยังตรวจสอบรายการไม่ได้');
    });
    return () => controller.abort();
  }, [open, intent, target.type, target.id]);

  useEffect(() => {
    if (!intent) return;
    const remaining = new Date(intent.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => setExpired(true), Math.min(2_147_483_647, Math.max(0, remaining)));
    return () => clearTimeout(timer);
  }, [intent]);

  useEffect(() => {
    if (!slipFile) return;
    const url = URL.createObjectURL(slipFile);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);

  const close = () => {
    if (busyRef.current) return;
    if (!intent && !uncertain) setError(null);
    setCouponError(null);
    reviewRequest.current += 1;
    setReview(null);
    setCouponCode('');
    setSlipFile(null);
    setSlipPreview(null);
    onClose();
  };

  const refreshReview = async (code?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    if (!intent && !uncertain) setError(null);
    setCouponError(null);
    reviewRequest.current += 1;
    setReview(null);
    try {
      const response = await fetch(CHECKOUT_CONTRACT.reviewEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ...(code ? { couponCode: code } : {}) }),
      });
      const data = await response.json();
      if (!response.ok || !data.review) {
        if (code) setCouponError(data.error || 'คูปองนี้ใช้ไม่ได้');
        else setError(data.error || 'ยังตรวจสอบรายการไม่ได้');
        return;
      }
      setReview(data.review);
      if (!code) setCouponCode('');
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบรายการอีกครั้ง');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const startPayment = async (method: 'stripe' | 'promptpay' | 'free') => {
    if (busyRef.current || !review || intent) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(method === 'stripe' ? endpoints.stripe : method === 'promptpay' ? CHECKOUT_CONTRACT.intentEndpoint : endpoints.enroll, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body, ...(review.coupon ? { couponId: review.coupon.id } : {}),
          ...(method !== 'free' ? { expectedAmount: review.price.amountDue } : {}),
          ...(method === 'stripe' && exposureId ? { exposureId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) setUncertain(true);
        setReview(null);
        setError(data.error || 'ยังเริ่มรายการไม่ได้ กรุณาตรวจสอบรายการอีกครั้ง');
        return;
      }
      if (method === 'free') {
        onEnrolled();
        onClose();
      } else if (method === 'stripe' && data.url) {
        window.location.assign(data.url);
      } else if (method === 'promptpay' && data.paymentId && typeof data.amount === 'number' && data.expiresAt) {
        setExpired(false);
        setIntent(data);
      } else {
        setUncertain(true);
        setError('ยังยืนยันผลการเริ่มรายการไม่ได้ กรุณาดูประวัติการชำระเงินก่อนลองใหม่');
      }
    } catch {
      setUncertain(true);
      setError('การเชื่อมต่อขาดหาย ยังยืนยันผลรายการไม่ได้ อย่าชำระซ้ำ กรุณาดูประวัติการชำระเงิน');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const checkAttempt = async () => {
    if (!intent || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const response = await fetch(`${CHECKOUT_CONTRACT.intentEndpoint}?paymentId=${encodeURIComponent(intent.paymentId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.presentation) throw new Error();
      setPresentation(data.presentation);
      setUncertain(!data.canSubmitSlip);
      if (data.canSubmitSlip) setError(null);
      if (data.presentation.payment.state === 'completed-ready') {
        onEnrolled();
        onClose();
      }
    } catch {
      setUncertain(true);
      setError('ยังตรวจสอบสถานะไม่ได้ อย่าชำระซ้ำ กรุณาตรวจสถานะอีกครั้งหรือติดต่อพร้อมเลขอ้างอิง');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const verifySlip = async () => {
    if (busyRef.current || !intent || !slipFile || uncertain || expired || Date.now() >= new Date(intent.expiresAt).getTime()) return;
    busyRef.current = true;
    setVerifying(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40_000);
    try {
      const form = new FormData();
      form.append('slip', slipFile);
      form.append('paymentId', intent.paymentId);
      const response = await fetch(endpoints.slip, { method: 'POST', body: form, signal: controller.signal });
      const data = await response.json();
      if (response.ok && data.success) {
        setUncertain(true);
        setSlipFile(null);
        setSlipPreview(null);
        const statusResponse = await fetch(`${CHECKOUT_CONTRACT.intentEndpoint}?paymentId=${encodeURIComponent(intent.paymentId)}`, { cache: 'no-store', signal: controller.signal });
        const status = await statusResponse.json();
        if (!statusResponse.ok || !status.presentation) throw new Error('Status unavailable');
        setPresentation(status.presentation);
        if (status.presentation.payment.state === 'completed-ready') {
          onEnrolled();
          onClose();
        }
      } else {
        // Only a definite rejection permits resubmitting the same proof/attempt.
        setUncertain(response.status !== 400);
        setError(response.status === 400 ? data.error || 'สลิปไม่ผ่านการตรวจสอบ กรุณาตรวจสอบสลิปเดิมและลองใหม่' : 'ผลการตรวจสอบยังไม่ยืนยัน อย่าชำระหรือส่งสลิปซ้ำ กรุณาตรวจสถานะอีกครั้ง');
      }
    } catch {
      setUncertain(true);
      setError('การตรวจสอบใช้เวลานานหรือการเชื่อมต่อขาดหาย อย่าชำระหรือส่งสลิปซ้ำ กรุณาตรวจสถานะอีกครั้ง');
    } finally {
      clearTimeout(timeout);
      busyRef.current = false;
      setVerifying(false);
    }
  };

  const selectSlip = (file?: File) => {
    if (busyRef.current) return;
    setSlipFile(null);
    setSlipPreview(null);
    setSlipError(null);
    if (!file) return;
    if (!CHECKOUT_CONTRACT.allowedSlipTypes.includes(file.type)) setSlipError('รองรับเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น');
    else if (file.size > CHECKOUT_CONTRACT.maxSlipBytes) setSlipError('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
    else setSlipFile(file);
  };
  const pending = loading || verifying;

  return (
    <DialogShell
      isOpen={open} onClose={close} returnFocusRef={returnFocusRef} size="wide"
      title={intent ? 'โอนเงินและแนบสลิป' : 'เลือกช่องทางชำระเงิน'}
      description={intent ? 'ใช้รายการและยอดนี้ในการตรวจสอบสลิป หากโอนแล้วอย่าชำระซ้ำ' : 'ทบทวนสินค้า ยอดชำระ และสิทธิ์เรียนก่อนเลือกวิธีชำระเงิน'}
      body={(
        <div className="flex min-w-0 flex-col gap-4" aria-busy={pending}>
          {error ? <Alert variant="destructive"><AlertTitle>ยังดำเนินการไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          {intent ? (
            <>
              <p className="break-words font-medium">{intent.itemTitle}</p>
              <dl className="grid gap-3 text-sm [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-2 [&_dd]:min-w-0 [&_dd]:break-all">
                <div><dt>ยอดที่ระบบจะตรวจสอบ (THB)</dt><dd><strong>{formatOrderAmount(intent.amount)}</strong></dd></div>
                <div><dt>เลขอ้างอิง</dt><dd>{intent.paymentId}</dd></div>
                <div><dt>หมดเวลา</dt><dd>{new Date(intent.expiresAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (เวลาไทย)</dd></div>
              </dl>
              {expired ? <Alert><AlertTitle>รายการพร้อมเพย์หมดเวลาแล้ว</AlertTitle><AlertDescription>หากโอนเงินแล้วอย่าชำระซ้ำ กรุณาติดต่อพร้อมเลขอ้างอิงเพื่อตรวจสอบรายการ</AlertDescription></Alert> : null}
              {presentation ? <Alert><AlertTitle>{presentation.payment.heading}</AlertTitle><AlertDescription>{presentation.payment.description}</AlertDescription></Alert> : null}
              {verifying ? <p role="status">กำลังตรวจสอบสลิป กรุณารอผล อย่าชำระหรือส่งสลิปซ้ำ</p> : null}
              {!expired && !uncertain ? (
                <>
                  <dl className="grid gap-2 text-sm [&_dd]:break-words">
                    <div><dt>ธนาคาร</dt><dd>{process.env.NEXT_PUBLIC_BANK_NAME || 'กสิกรไทย (KBank)'}</dd></div>
                    <div><dt>เลขบัญชี</dt><dd>{process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'xxx-x-xxxxx-x'}</dd></div>
                    <div><dt>ชื่อบัญชี</dt><dd>{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'MilerDev'}</dd></div>
                  </dl>
                  <p className="text-sm text-muted-foreground">แนบเฉพาะสลิปของรายการนี้ สลิปมีข้อมูลส่วนบุคคลและจะส่งให้ผู้ให้บริการตรวจสอบการโอนเงิน กรุณาอย่าส่งเอกสารอื่นหรือข้อมูลที่ไม่เกี่ยวข้อง</p>
                  <Field data-invalid={Boolean(slipError) || undefined}>
                    <FieldLabel htmlFor={slipId}>แนบสลิปการโอนเงิน</FieldLabel>
                    <Input ref={fileRef} id={slipId} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" disabled={pending} aria-invalid={Boolean(slipError) || undefined} aria-describedby={slipError ? `${slipId}-error` : undefined} onChange={(event) => selectSlip(event.target.files?.[0])} />
                    <p className="text-sm text-muted-foreground">JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                    {slipError ? <FieldError id={`${slipId}-error`}>{slipError}</FieldError> : null}
                  </Field>
                  {slipFile && slipPreview ? <div className="relative">
                    <Image src={slipPreview} alt="สลิปที่เลือก" width={720} height={900} unoptimized className="h-auto max-h-64 w-full object-contain" />
                    <Button type="button" variant="outline" size="icon" disabled={pending} className="absolute top-2 right-2" aria-label="ลบรูปสลิปที่เลือก" onClick={() => { selectSlip(); if (fileRef.current) fileRef.current.value = ''; }}><X data-icon="inline-start" aria-hidden="true" /></Button>
                  </div> : null}
                </>
              ) : null}
              <Button type="button" variant="outline" disabled={pending} onClick={checkAttempt}>ตรวจสถานะอีกครั้ง</Button>
              {(expired || uncertain) ? <Button asChild variant="outline"><Link href="/contact">ติดต่อพร้อมเลขอ้างอิง</Link></Button> : null}
            </>
          ) : (
            <>
              {review ? <OrderReviewSummary review={review} /> : !error && !couponError ? <p role="status">กำลังตรวจสอบรายการ...</p> : null}
              {target.type === 'course' && !uncertain ? (
                <FieldGroup>
                  <Field data-invalid={Boolean(couponError) || undefined}>
                    <FieldLabel htmlFor={couponId}>มีโค้ดส่วนลด?</FieldLabel>
                    <Input id={couponId} value={couponCode} disabled={pending} maxLength={100} aria-invalid={Boolean(couponError) || undefined} aria-describedby={couponError ? `${couponId}-error` : undefined} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void refreshReview(couponCode.trim()); } }} />
                    {couponError ? <FieldError id={`${couponId}-error`}>{couponError}</FieldError> : null}
                    <Button type="button" variant="outline" disabled={pending || !couponCode.trim()} onClick={() => refreshReview(couponCode.trim())}>ใช้โค้ด</Button>
                    {review?.coupon ? <><p role="status">ใช้คูปอง {review.coupon.code} แล้ว</p><Button type="button" variant="outline" disabled={pending} onClick={() => refreshReview()}>ลบคูปอง</Button></> : null}
                  </Field>
                </FieldGroup>
              ) : null}
              {!review && (error || couponError) && !uncertain ? <Button type="button" variant="outline" disabled={pending} onClick={() => refreshReview()}>ตรวจสอบรายการใหม่โดยไม่ใช้คูปอง</Button> : null}
              {review?.action === 'unavailable' ? <Alert><AlertTitle>ยังไม่เปิดรับสมัคร</AlertTitle><AlertDescription>สินค้านี้ยังไม่พร้อมรับการลงทะเบียน กรุณากลับมาตรวจสอบภายหลัง</AlertDescription></Alert> : null}
              {review?.action === 'owned' ? <Button asChild><Link href="/dashboard">ไปการเรียนของฉัน</Link></Button> : null}
              {review?.action === 'pay' && !uncertain ? <div className="flex flex-col gap-3" role="group" aria-label="ช่องทางชำระเงิน">
                <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal py-3" disabled={pending} onClick={() => startPayment('stripe')}><CreditCard data-icon="inline-start" aria-hidden="true" />ชำระด้วยบัตรผ่าน Stripe</Button>
                <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal py-3" disabled={pending} onClick={() => startPayment('promptpay')}><Smartphone data-icon="inline-start" aria-hidden="true" />โอนเงิน / PromptPay</Button>
              </div> : null}
              {review?.action === 'enroll-free' && !uncertain ? <Button type="button" disabled={pending} onClick={() => startPayment('free')}>{review.coupon ? 'ลงทะเบียนเรียนฟรี (คูปอง 100%)' : 'ยืนยันลงทะเบียนเรียนฟรี'}</Button> : null}
              {loading ? <p role="status"><Spinner aria-hidden="true" />กำลังดำเนินการ...</p> : null}
            </>
          )}
          {(intent || uncertain) ? <Button asChild variant="outline"><Link href="/dashboard/payments">ดูประวัติการชำระเงิน</Link></Button> : null}
        </div>
      )}
    >
      <Button type="button" variant="outline" disabled={pending} onClick={close}>{intent ? 'ปิดและเก็บรายการไว้' : 'ยกเลิก'}</Button>
      {intent && !expired && !uncertain ? <Button type="button" disabled={pending || !slipFile} aria-busy={verifying} onClick={verifySlip}>{verifying ? <><Spinner data-icon="inline-start" aria-hidden="true" />กำลังตรวจสอบสลิป...</> : 'ตรวจสอบและชำระเงิน'}</Button> : null}
    </DialogShell>
  );
}
