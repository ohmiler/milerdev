'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  AdminButton,
  AdminPageHero,
  AdminPill,
  AdminSectionHeading,
  AdminSurfaceCard,
} from '@/components/admin/ui/AdminPrimitives';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentId: string | null;
  slipUrl: string | null;
  createdAt: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  bundleTitle: string | null;
  itemTitle: string | null;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
  totalRevenue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
        method: methodFilter,
        ...(searchDebounce && { search: searchDebounce }),
      });

      const res = await fetch(`/api/admin/payments?${params}`);
      const data = await res.json();

      setPayments(data.payments || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, currentPage, searchDebounce]);

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบรายการชำระเงินสำเร็จ', 'success');
        await fetchPayments();
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('ต้องการล้างรายการ pending ที่ค้างเกิน 24 ชั่วโมงใช่ไหม?')) return;
    try {
      const res = await fetch('/api/admin/payments/cleanup', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.message} (${data.deleted} รายการ)`, 'success');
        await fetchPayments();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`เปลี่ยนสถานะเป็น "${getStatusText(newStatus)}" สำเร็จ`, 'success');
        await fetchPayments();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'รอดำเนินการ';
      case 'completed':
        return 'สำเร็จ';
      case 'failed':
        return 'ล้มเหลว';
      case 'refunded':
        return 'คืนเงิน';
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { background: '#fff7ed', color: '#b45309' };
      case 'completed':
        return { background: '#eefbf3', color: '#15803d' };
      case 'failed':
        return { background: '#fef2f2', color: '#dc2626' };
      case 'refunded':
        return { background: '#eff6ff', color: '#1d4ed8' };
      default:
        return { background: '#f8fafc', color: '#475569' };
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'stripe':
        return 'Stripe';
      case 'promptpay':
        return 'PromptPay';
      case 'bank_transfer':
        return 'โอนเงิน';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(parseFloat(String(amount)));
  };

  const summaryCards = stats
    ? [
        {
          label: 'ธุรกรรมทั้งหมด',
          value: stats.total,
          note: 'ภาพรวมรายการที่อยู่ในระบบ',
          color: '#0f172a',
        },
        {
          label: 'สำเร็จแล้ว',
          value: stats.completed,
          note: 'พร้อมใช้งานตาม entitlement',
          color: '#15803d',
        },
        {
          label: 'รอดำเนินการ',
          value: stats.pending,
          note: 'ควรติดตามเพื่อปิดงานให้ครบ',
          color: '#b45309',
        },
        {
          label: 'รายได้รวม',
          value: formatCurrency(stats.totalRevenue),
          note: 'ธุรกรรมสำเร็จที่ปิดยอดแล้ว',
          color: '#2563eb',
        },
      ]
    : [];

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <AdminPageHero
        eyebrow="Payment Operations"
        title="จัดการรายการชำระเงินและสถานะธุรกรรม"
        description="รวมการค้นหา กรอง ตรวจสอบรายการที่มีปัญหา และคำสั่งอัปเดตสถานะไว้ใน workspace เดียว เพื่อให้ทีมจัดการ payment operations ได้เร็วและมั่นใจขึ้น"
        actions={
          <>
            <AdminButton tone="dark" onClick={handleCleanup}>
              ล้าง pending เก่า
            </AdminButton>
            <AdminPill tone={statusFilter === 'all' ? 'default' : 'warning'}>
              {statusFilter === 'all' ? 'ทุกสถานะ' : `สถานะ ${getStatusText(statusFilter)}`}
            </AdminPill>
            <AdminPill tone={methodFilter === 'all' ? 'default' : 'info'}>
              {methodFilter === 'all' ? 'ทุกช่องทาง' : getMethodText(methodFilter)}
            </AdminPill>
          </>
        }
        meta="โฟกัสกับรายการที่ต้องปิดงาน เช่น pending ค้าง, รายการล้มเหลว และการยืนยันสิทธิ์หลังชำระเงินให้ครบในที่เดียว"
      />

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
          {summaryCards.map((card) => (
            <AdminSurfaceCard key={card.label} style={{ padding: '20px 22px' }}>
              <div
                style={{
                  color: '#64748b',
                  fontSize: '0.78rem',
                  marginBottom: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {card.label}
              </div>
              <div style={{ color: card.color, fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '6px' }}>
                {card.value}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.6 }}>{card.note}</div>
            </AdminSurfaceCard>
          ))}
        </div>
      )}

      <AdminSurfaceCard>
        <AdminSectionHeading
          title="Payment Ledger"
          description="ค้นหา กรอง และจัดการสถานะธุรกรรมพร้อมข้อมูลผู้ใช้ รายการที่ซื้อ และหลักฐานการโอนในมุมมองเดียว"
        />

        <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#94a3b8',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาจากชื่อ อีเมล หรือชื่อคอร์ส"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  border: '1px solid #dbe5f0',
                  borderRadius: '14px',
                  fontSize: '0.9rem',
                  background: '#f8fbff',
                  color: '#0f172a',
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '12px 14px',
                border: '1px solid #dbe5f0',
                borderRadius: '14px',
                background: '#f8fbff',
                fontSize: '0.875rem',
                color: '#334155',
              }}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="completed">สำเร็จ</option>
              <option value="failed">ล้มเหลว</option>
              <option value="refunded">คืนเงิน</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '12px 14px',
                border: '1px solid #dbe5f0',
                borderRadius: '14px',
                background: '#f8fbff',
                fontSize: '0.875rem',
                color: '#334155',
              }}
            >
              <option value="all">ทุกช่องทาง</option>
              <option value="stripe">Stripe</option>
              <option value="promptpay">PromptPay</option>
              <option value="bank_transfer">โอนเงิน</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <AdminPill tone="default">ทั้งหมด {pagination?.total ?? payments.length} รายการ</AdminPill>
            <AdminPill tone="success">สำเร็จ {stats?.completed ?? 0}</AdminPill>
            <AdminPill tone="warning">รอจัดการ {stats?.pending ?? 0}</AdminPill>
          </div>
        </div>

        {loading && payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 24px', color: '#64748b' }}>กำลังโหลดรายการชำระเงิน...</div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 24px', color: '#64748b' }}>ไม่พบรายการที่ตรงกับตัวกรองตอนนี้</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', background: 'white' }}>
                <thead>
                  <tr style={{ background: '#f8fbff', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={headerCellStyle}>ผู้ชำระเงิน</th>
                    <th style={headerCellStyle}>รายการ</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>จำนวน</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>ช่องทาง</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>สถานะ</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>เวลา</th>
                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={bodyCellStyle}>
                        <div
                          onClick={() => payment.userId && (window.location.href = `/admin/users/${payment.userId}`)}
                          style={{ cursor: payment.userId ? 'pointer' : 'default' }}
                        >
                          <div style={{ fontWeight: 700, color: payment.userId ? '#2563eb' : '#0f172a', marginBottom: '5px', fontSize: '0.94rem' }}>
                            {payment.userName || 'ไม่ระบุชื่อ'}
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>{payment.userEmail || '-'}</div>
                        </div>
                      </td>
                      <td style={bodyCellStyle}>
                        <div style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 600 }}>
                          {payment.bundleTitle || payment.courseTitle || payment.itemTitle || '-'}
                        </div>
                        {payment.slipUrl && (
                          payment.slipUrl.startsWith('http') ? (
                            <a
                              href={payment.slipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.76rem',
                                color: '#2563eb',
                                textDecoration: 'none',
                                display: 'inline-block',
                                marginTop: '6px',
                                fontWeight: 600,
                              }}
                            >
                              ดูสลิป
                            </a>
                          ) : (
                            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '6px' }}>
                              Ref: <span style={{ fontFamily: 'monospace', color: '#475569', userSelect: 'all' }}>{payment.slipUrl}</span>
                            </div>
                          )
                        )}
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(payment.amount)}</div>
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '50px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: '#f8fafc',
                            color: '#475569',
                          }}
                        >
                          {getMethodText(payment.method)}
                        </span>
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                        <select
                          value={payment.status}
                          onChange={(e) => handleStatusChange(payment.id, e.target.value)}
                          disabled={updatingStatus === payment.id}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            border: '1px solid #dbe5f0',
                            cursor: updatingStatus === payment.id ? 'wait' : 'pointer',
                            opacity: updatingStatus === payment.id ? 0.5 : 1,
                            ...getStatusStyle(payment.status),
                          }}
                        >
                          <option value="pending">รอดำเนินการ</option>
                          <option value="completed">สำเร็จ</option>
                          <option value="failed">ล้มเหลว</option>
                          <option value="refunded">คืนเงิน</option>
                        </select>
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'center', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
                        {formatDate(payment.createdAt)}
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => setDeleteConfirm(payment.id)}
                          title="ลบ"
                          style={{
                            padding: '8px 12px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '18px',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={paginationButtonStyle(currentPage === 1)}
                >
                  ก่อนหน้า
                </button>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>
                  หน้า {currentPage} จาก {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={paginationButtonStyle(currentPage === pagination.totalPages)}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </AdminSurfaceCard>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบรายการชำระเงิน"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบรายการ"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

const headerCellStyle: CSSProperties = {
  padding: '15px 18px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#64748b',
  fontSize: '0.79rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bodyCellStyle: CSSProperties = {
  padding: '18px',
  verticalAlign: 'middle',
};

const paginationButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '9px 16px',
  border: '1px solid #dbe5f0',
  borderRadius: '10px',
  background: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
