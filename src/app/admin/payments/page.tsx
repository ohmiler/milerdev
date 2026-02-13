'use client';

import { useState, useEffect } from 'react';
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
  
  // Filters
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
    if (!confirm('ต้องการลบรายการ pending ที่ค้างเกิน 24 ชั่วโมงทั้งหมดใช่ไหม?')) return;
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'completed': return 'สำเร็จ';
      case 'failed': return 'ล้มเหลว';
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fef3c7', color: '#d97706' };
      case 'completed': return { background: '#dcfce7', color: '#16a34a' };
      case 'failed': return { background: '#fef2f2', color: '#dc2626' };
      default: return { background: '#f1f5f9', color: '#64748b' };
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'stripe': return 'Stripe';
      case 'promptpay': return 'PromptPay';
      case 'bank_transfer': return 'โอนเงิน';
      default: return method;
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            จัดการการชำระเงิน
          </h1>
          <p style={{ color: '#64748b' }}>ตรวจสอบและจัดการรายการชำระเงินทั้งหมด</p>
        </div>
        <button
          onClick={handleCleanup}
          style={{
            padding: '8px 16px',
            background: '#fef3c7',
            color: '#d97706',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          🧹 ล้าง Pending เก่า (24 ชม.)
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>สำเร็จ</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{stats.completed}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>รายได้รวม</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
          <svg
            style={{
              position: 'absolute',
              left: '12px',
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
            placeholder="ค้นหาชื่อ, อีเมล, คอร์ส..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="completed">สำเร็จ</option>
          <option value="failed">ล้มเหลว</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">ช่องทางทั้งหมด</option>
          <option value="stripe">Stripe</option>
          <option value="promptpay">PromptPay</option>
          <option value="bank_transfer">โอนเงิน</option>
        </select>
      </div>

      {/* Payments Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {loading && payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            กำลังโหลด...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ไม่พบรายการชำระเงิน
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      รายละเอียด
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      คอร์ส
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      จำนวน
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      ช่องทาง
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      สถานะ
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                      วันที่
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem', width: '60px' }}>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px' }}>
                        <div
                          onClick={() => payment.userId && (window.location.href = `/admin/users/${payment.userId}`)}
                          style={{ cursor: payment.userId ? 'pointer' : 'default' }}
                        >
                          <div style={{ fontWeight: 500, color: payment.userId ? '#2563eb' : '#1e293b', marginBottom: '4px' }}>
                            {payment.userName || 'ไม่ระบุชื่อ'}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {payment.userEmail || '-'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ color: '#1e293b', fontSize: '0.875rem' }}>
                          {payment.bundleTitle ? (
                            <span>📦 {payment.bundleTitle}</span>
                          ) : payment.courseTitle ? (
                            payment.courseTitle
                          ) : payment.itemTitle ? (
                            <span style={{ color: '#94a3b8' }}>{payment.itemTitle} (ถูกลบ)</span>
                          ) : (
                            '-'
                          )}
                        </div>
                        {payment.slipUrl && (
                          payment.slipUrl.startsWith('http') ? (
                            <a
                              href={payment.slipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: '#2563eb',
                                textDecoration: 'none',
                                display: 'inline-block',
                                marginTop: '4px',
                              }}
                            >
                              🧾 ดูสลิป
                            </a>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                              🧾 Ref: <span style={{ fontFamily: 'monospace', color: '#475569', userSelect: 'all' }}>{payment.slipUrl}</span>
                            </div>
                          )
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}>
                          {getMethodText(payment.method)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          ...getStatusStyle(payment.status),
                        }}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDate(payment.createdAt)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setDeleteConfirm(payment.id)}
                          title="ลบ"
                          style={{
                            padding: '6px 10px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ก่อนหน้า
                </button>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  หน้า {currentPage} จาก {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                  }}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบรายการชำระเงิน"
        message="คุณแน่ใจหรือไม่ที่จะลบรายการชำระเงินนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบ"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
