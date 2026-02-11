'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: 'สำเร็จ', bg: '#dcfce7', color: '#16a34a' },
  pending: { label: 'รอดำเนินการ', bg: '#fef9c3', color: '#ca8a04' },
  failed: { label: 'ไม่สำเร็จ', bg: '#fef2f2', color: '#dc2626' },
  refunded: { label: 'คืนเงินแล้ว', bg: '#f0f9ff', color: '#2563eb' },
};

export default function UserPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments')
      .then(res => res.json())
      .then(data => setPayments(data.payments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (currency === 'THB') return `฿${num.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    return `${num.toLocaleString()} ${currency}`;
  };

  const totalSpent = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '40px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <Link href="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← กลับไปแดชบอร์ด
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '12px' }}>
              ประวัติการชำระเงิน
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>
              รายการชำระเงินทั้งหมดของคุณ
            </p>
          </div>

          {/* Summary Stats */}
          {!loading && payments.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <div style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '4px' }}>รายการทั้งหมด</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{payments.length}</div>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <div style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '4px' }}>ชำระสำเร็จ</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                  {payments.filter(p => p.status === 'completed').length}
                </div>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <div style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '4px' }}>ยอดรวมที่ชำระ</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>
                  ฿{totalSpent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Payment List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>กำลังโหลด...</div>
          ) : payments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💳</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                ยังไม่มีประวัติการชำระเงิน
              </h2>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                ประวัติจะแสดงที่นี่เมื่อคุณชำระเงินสำหรับคอร์สเรียน
              </p>
              <Link
                href="/courses"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                ดูคอร์สทั้งหมด
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.map(payment => {
                const status = statusConfig[payment.status] || statusConfig.pending;
                return (
                  <div
                    key={payment.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}>
                      {/* Left: Course/Bundle & method */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        {payment.courseTitle ? (
                          <Link
                            href={`/courses/${payment.courseSlug}`}
                            style={{ color: '#1e293b', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}
                          >
                            {payment.courseTitle}
                          </Link>
                        ) : payment.bundleTitle ? (
                          <Link
                            href={`/bundles/${payment.bundleSlug}`}
                            style={{ color: '#1e293b', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}
                          >
                            📦 {payment.bundleTitle}
                          </Link>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>รายการถูกลบแล้ว</span>
                        )}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.8125rem', color: '#64748b' }}>
                          <span>{methodLabels[payment.method] || payment.method}</span>
                          <span>•</span>
                          <span>{formatDate(payment.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right: Amount & status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                            {formatAmount(payment.amount, payment.currency)}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: status.bg,
                          color: status.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
