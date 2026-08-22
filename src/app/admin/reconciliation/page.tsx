'use client';

import { useEffect, useState, useCallback } from 'react';

interface PaymentRecord {
    id: string;
    userId: string | null;
    courseId: string | null;
    bundleId: string | null;
    amount: string;
    currency: string;
    method: string;
    status: string;
    itemTitle: string | null;
    slipUrl: string | null;
    retryCount: number | null;
    lastRetryAt: string | null;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
    courseTitle: string | null;
    bundleTitle: string | null;
}

interface Summary {
    verifying: number;
    failed: number;
    pending: number;
}

type StatusFilter = 'verifying' | 'failed' | 'pending';

export default function ReconciliationPage() {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [summary, setSummary] = useState<Summary>({ verifying: 0, failed: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('verifying');
    const [daysBack, setDaysBack] = useState(30);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/reconciliation?status=${statusFilter}&days=${daysBack}`);
            const data = await res.json();
            if (res.ok) {
                setPayments(data.payments || []);
                setSummary(data.summary || { verifying: 0, failed: 0, pending: 0 });
            }
        } catch {
            console.error('Failed to fetch reconciliation data');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, daysBack]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRetry = async (paymentId: string, action: 'approve' | 'reject') => {
        const reason = window.prompt(
            action === 'approve'
                ? 'ระบุเหตุผลและหลักฐานที่ใช้อนุมัติ (อย่างน้อย 5 ตัวอักษร)'
                : 'ระบุเหตุผลที่ปฏิเสธ (อย่างน้อย 5 ตัวอักษร)'
        );
        if (reason === null) return;
        if (reason.trim().length < 5) {
            setMessage({ type: 'error', text: 'เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร' });
            return;
        }

        setActionLoading(paymentId);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reconciliation/${paymentId}/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason: reason.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchData();
            } else {
                setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
            }
        } catch {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkMarkFailed = async () => {
        if (selected.size === 0) return;
        const reason = window.prompt('ระบุเหตุผลที่ทำเครื่องหมายรายการเหล่านี้ว่าล้มเหลว (อย่างน้อย 5 ตัวอักษร)');
        if (reason === null) return;
        if (reason.trim().length < 5) {
            setMessage({ type: 'error', text: 'เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร' });
            return;
        }
        setMessage(null);
        try {
            const res = await fetch('/api/admin/reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_failed',
                    paymentIds: Array.from(selected),
                    reason: reason.trim(),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setSelected(new Set());
                fetchData();
            } else {
                setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
            }
        } catch {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === payments.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(payments.map(p => p.id)));
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return '-';
        return new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formatAmount = (amount: string, _currency?: string) => {
        return `฿${parseFloat(amount).toLocaleString()}`;
    };

    const statusColors: Record<string, { bg: string; text: string }> = {
        verifying: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning-strong)' },
        failed: { bg: 'var(--color-error-soft)', text: 'var(--color-error-strong)' },
        pending: { bg: 'var(--secondary)', text: 'var(--primary)' },
        completed: { bg: 'var(--color-success-soft)', text: 'var(--color-success-strong)' },
    };

    const getStatusStyle = (status: string) => statusColors[status] || { bg: 'var(--muted)', text: 'var(--muted-foreground)' };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                        Payment Reconciliation
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
                        จัดการรายการชำระเงินที่ค้าง/ล้มเหลว
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                    }}
                >
                    🔄 รีเฟรช
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {([
                    { key: 'verifying' as StatusFilter, label: 'รอตรวจสอบ', icon: '⏳', color: 'var(--color-warning-strong)' },
                    { key: 'failed' as StatusFilter, label: 'ล้มเหลว', icon: '❌', color: 'var(--color-error-strong)' },
                    { key: 'pending' as StatusFilter, label: 'รอดำเนินการ', icon: '🕐', color: 'var(--primary)' },
                ]).map(card => (
                    <button
                        key={card.key}
                        onClick={() => setStatusFilter(card.key)}
                        style={{
                            padding: '20px',
                            background: statusFilter === card.key ? 'var(--muted)' : 'white',
                            border: statusFilter === card.key ? `2px solid ${card.color}` : '1px solid var(--border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                            {card.icon} {card.label}
                        </div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color }}>
                            {summary[card.key]}
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px',
                padding: '12px 16px', background: 'var(--muted)', borderRadius: '8px',
            }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>ย้อนหลัง:</label>
                <select
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
                >
                    <option value={7}>7 วัน</option>
                    <option value={14}>14 วัน</option>
                    <option value={30}>30 วัน</option>
                    <option value={60}>60 วัน</option>
                    <option value={90}>90 วัน</option>
                </select>

                {statusFilter === 'verifying' && selected.size > 0 && (
                    <button
                        onClick={handleBulkMarkFailed}
                        style={{
                            marginLeft: 'auto',
                            padding: '6px 16px',
                            background: 'var(--color-error-strong)',
                            color: 'var(--primary-foreground)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        Mark {selected.size} as Failed
                    </button>
                )}
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'var(--color-success-soft)' : 'var(--color-error-soft)',
                    color: message.type === 'success' ? 'var(--color-success-strong)' : 'var(--color-error-strong)',
                    fontSize: '0.875rem',
                }}>
                    {message.text}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted-foreground)' }}>กำลังโหลด...</div>
            ) : payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted-foreground)' }}>
                    ไม่พบรายการ {statusFilter === 'verifying' ? 'รอตรวจสอบ' : statusFilter === 'failed' ? 'ล้มเหลว' : 'รอดำเนินการ'}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                                {statusFilter === 'verifying' && (
                                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                                        <input
                                            type="checkbox"
                                            checked={selected.size === payments.length && payments.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                )}
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: 600 }}>วันที่</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: 600 }}>ผู้ชำระ</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: 600 }}>รายการ</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: 600 }}>จำนวน</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: 600 }}>สถานะ</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: 600 }}>Retry</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: 600 }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => {
                                const statusStyle = getStatusStyle(p.status);
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--muted)' }}>
                                        {statusFilter === 'verifying' && (
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(p.id)}
                                                    onChange={() => toggleSelect(p.id)}
                                                />
                                            </td>
                                        )}
                                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                            {formatDate(p.createdAt)}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>{p.userName || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{p.userEmail || '-'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                                                {p.itemTitle || p.courseTitle || p.bundleTitle || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                {p.bundleId ? 'Bundle' : 'Course'} • ID: {p.id.slice(0, 8)}...
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                                            {formatAmount(p.amount, p.currency)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: statusStyle.bg,
                                                color: statusStyle.text,
                                            }}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                            {p.retryCount || 0}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                {(p.status === 'verifying' || p.status === 'failed') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRetry(p.id, 'approve')}
                                                            disabled={actionLoading === p.id}
                                                            style={{
                                                                padding: '4px 12px',
                                                                background: 'var(--color-success-strong)',
                                                                color: 'var(--primary-foreground)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: actionLoading === p.id ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.75rem',
                                                                opacity: actionLoading === p.id ? 0.6 : 1,
                                                            }}
                                                        >
                                                            {actionLoading === p.id ? '...' : '✓ อนุมัติ'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRetry(p.id, 'reject')}
                                                            disabled={actionLoading === p.id}
                                                            style={{
                                                                padding: '4px 12px',
                                                                background: 'var(--color-error-strong)',
                                                                color: 'var(--primary-foreground)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: actionLoading === p.id ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.75rem',
                                                                opacity: actionLoading === p.id ? 0.6 : 1,
                                                            }}
                                                        >
                                                            ✗ ปฏิเสธ
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
