'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/components/account/LearnerAccount.module.css';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  courseId: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  bundleId: string | null;
  bundleTitle: string | null;
  bundleSlug: string | null;
}

const methodLabels: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  stripe: 'บัตรเครดิต/เดบิต',
  bank_transfer: 'โอนเงิน',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'สำเร็จ', className: styles.statusSuccess },
  pending: { label: 'รอดำเนินการ', className: styles.statusPending },
  verifying: { label: 'กำลังตรวจสอบ', className: styles.statusInfo },
  failed: { label: 'ไม่สำเร็จ', className: styles.statusDanger },
  refunded: { label: 'คืนเงินแล้ว', className: styles.statusInfo },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: string, currency: string) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  if (currency === 'THB') return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  return `${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ${currency}`;
}

export default function PaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch('/api/payments', { signal: controller.signal });
        if (!response.ok) throw new Error('Payment request failed');
        const data = await response.json();
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPayments();
    return () => controller.abort();
  }, [reloadKey]);

  const completed = payments.filter((payment) => payment.status === 'completed');
  const totalSpent = completed.reduce((sum, payment) => {
    const value = Number.parseFloat(payment.amount);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  if (loading) {
    return (
      <section className={styles.state} aria-live="polite" aria-busy="true">
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>SYNCING PAYMENT RECORDS</p>
          <h2>กำลังโหลดรายการชำระเงิน</h2>
          <div className={styles.loadingBar} aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.state} role="alert">
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>PAYMENT RECORDS UNAVAILABLE</p>
          <h2>ยังดึงรายการชำระเงินไม่ได้</h2>
          <p>ตรวจสอบการเชื่อมต่อหรือสถานะการเข้าสู่ระบบ แล้วลองโหลดข้อมูลอีกครั้ง</p>
          <button className={styles.primaryAction} type="button" onClick={retry}>ลองใหม่</button>
        </div>
      </section>
    );
  }

  if (payments.length === 0) {
    return (
      <section className={styles.state}>
        <div className={styles.stateInner}>
          <p className={styles.stateCode}>NO PAYMENT RECORDS</p>
          <h2>ยังไม่มีประวัติการชำระเงิน</h2>
          <p>เมื่อคุณชำระเงินสำหรับคอร์สหรือชุดคอร์ส รายการและสถานะจะปรากฏที่นี่</p>
          <Link className={styles.primaryAction} href="/courses">เลือกคอร์สเรียน</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.summary} aria-label="สรุปการชำระเงิน">
        <div><span>รายการทั้งหมด</span><strong>{payments.length}</strong></div>
        <div><span>ชำระสำเร็จ</span><strong>{completed.length}</strong></div>
        <div><span>ยอดชำระสำเร็จ</span><strong data-accent="true">฿{totalSpent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></div>
      </section>

      <section aria-labelledby="payment-records-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionLabel}>Payment ledger</p>
            <h2 id="payment-records-title">รายการล่าสุด</h2>
          </div>
          <p className={styles.sectionNote}>{payments.length} รายการ</p>
        </div>

        <div className={styles.records}>
          {payments.map((payment, index) => {
            const status = statusConfig[payment.status] ?? statusConfig.pending;
            const title = payment.courseTitle ?? payment.bundleTitle;
            const href = payment.courseSlug
              ? `/courses/${payment.courseSlug}`
              : payment.bundleSlug ? `/bundles/${payment.bundleSlug}` : null;

            return (
              <article className={styles.record} key={payment.id}>
                <span className={styles.recordIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={styles.recordTitle}>
                    {title && href ? <Link href={href}>{title}</Link> : title ?? 'รายการนี้ไม่มีหน้าสินค้าแล้ว'}
                  </h3>
                  <div className={styles.recordMeta}>
                    <span>{methodLabels[payment.method] ?? payment.method}</span>
                    <span>{formatDate(payment.createdAt)}</span>
                  </div>
                </div>
                <strong className={styles.amount}>{formatAmount(payment.amount, payment.currency)}</strong>
                <span className={`${styles.status} ${status.className}`}>{status.label}</span>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
