'use client';

import { useEffect, useState, useCallback } from 'react';

interface StalledUser {
    enrollmentId: string;
    userId: string;
    courseId: string;
    progressPercent: number | null;
    enrolledAt: string | null;
    userName: string | null;
    userEmail: string | null;
    courseTitle: string | null;
    courseSlug: string | null;
    lastActivityAt: string | null;
    daysSinceActivity: number | null;
}

interface Summary {
    total: number;
    noActivity: number;
    stalled7days: number;
    stalled14days: number;
    stalled30plus: number;
}

export default function NudgePage() {
    const [stalledUsers, setStalledUsers] = useState<StalledUser[]>([]);
    const [summary, setSummary] = useState<Summary>({ total: 0, noActivity: 0, stalled7days: 0, stalled14days: 0, stalled30plus: 0 });
    const [loading, setLoading] = useState(true);
    const [daysFilter, setDaysFilter] = useState(7);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [customMessage, setCustomMessage] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/nudge?days=${daysFilter}`);
            const data = await res.json();
            if (res.ok) {
                setStalledUsers(data.stalledUsers || []);
                setSummary(data.summary || { total: 0, noActivity: 0, stalled7days: 0, stalled14days: 0, stalled30plus: 0 });
            }
        } catch {
            console.error('Failed to fetch stalled learners');
        } finally {
            setLoading(false);
        }
    }, [daysFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleSelect = (idx: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === stalledUsers.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(stalledUsers.map((_, i) => i)));
        }
    };

    const handleSendNudge = async () => {
        if (selected.size === 0) return;
        setSending(true);
        setMessage(null);
        try {
            const selectedUsers = Array.from(selected).map(i => stalledUsers[i]);
            const res = await fetch('/api/admin/nudge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUsers.map(u => u.userId),
                    courseIds: selectedUsers.map(u => u.courseId),
                    customMessage: customMessage || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setSelected(new Set());
            } else {
                setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
            }
        } catch {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
        } finally {
            setSending(false);
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const getStalledBadge = (days: number | null) => {
        if (days === null) return { label: 'ไม่มีกิจกรรม', bg: '#fef3c7', color: '#92400e' };
        if (days >= 30) return { label: `${days} วัน`, bg: '#fee2e2', color: '#991b1b' };
        if (days >= 14) return { label: `${days} วัน`, bg: '#ffedd5', color: '#9a3412' };
        return { label: `${days} วัน`, bg: '#fef3c7', color: '#92400e' };
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        Learning Nudge
                    </h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0' }}>
                        แจ้งเตือนผู้เรียนที่หยุดเรียนค้าง เพื่อกระตุ้นให้กลับมาเรียนต่อ
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    style={{
                        padding: '8px 16px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                    }}
                >
                    🔄 รีเฟรช
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'ทั้งหมด', value: summary.total, color: '#6366f1', icon: '📊' },
                    { label: 'ไม่มีกิจกรรม', value: summary.noActivity, color: '#f59e0b', icon: '⚠️' },
                    { label: 'ค้าง 7-13 วัน', value: summary.stalled7days, color: '#f97316', icon: '⏰' },
                    { label: 'ค้าง 14-29 วัน', value: summary.stalled14days, color: '#ef4444', icon: '🔴' },
                    { label: 'ค้าง 30+ วัน', value: summary.stalled30plus, color: '#dc2626', icon: '🚨' },
                ].map(card => (
                    <div key={card.label} style={{
                        padding: '16px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                    }}>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>
                            {card.icon} {card.label}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Actions */}
            <div style={{
                display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px',
                padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', flexWrap: 'wrap',
            }}>
                <label style={{ fontSize: '0.875rem', color: '#64748b' }}>ไม่มีกิจกรรมเกิน:</label>
                <select
                    value={daysFilter}
                    onChange={(e) => { setDaysFilter(Number(e.target.value)); setSelected(new Set()); }}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                >
                    <option value={3}>3 วัน</option>
                    <option value={7}>7 วัน</option>
                    <option value={14}>14 วัน</option>
                    <option value={30}>30 วัน</option>
                </select>

                {selected.size > 0 && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                        <input
                            type="text"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="ข้อความกำหนดเอง (ไม่บังคับ)"
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                width: '280px',
                            }}
                        />
                        <button
                            onClick={handleSendNudge}
                            disabled={sending}
                            style={{
                                padding: '6px 16px',
                                background: '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                opacity: sending ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {sending ? 'กำลังส่ง...' : `📨 ส่ง Nudge (${selected.size})`}
                        </button>
                    </div>
                )}
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '0.875rem',
                }}>
                    {message.text}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>กำลังโหลด...</div>
            ) : stalledUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    ไม่พบผู้เรียนที่ค้างเกิน {daysFilter} วัน 🎉
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                                    <input
                                        type="checkbox"
                                        checked={selected.size === stalledUsers.length && stalledUsers.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>ผู้เรียน</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>คอร์ส</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>ความก้าวหน้า</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>ลงทะเบียน</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>กิจกรรมล่าสุด</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>ค้าง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stalledUsers.map((u, idx) => {
                                const badge = getStalledBadge(u.daysSinceActivity);
                                return (
                                    <tr key={`${u.enrollmentId}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selected.has(idx)}
                                                onChange={() => toggleSelect(idx)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{u.userName || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.userEmail || '-'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{u.courseTitle || '-'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '6px',
                                                    background: '#e2e8f0',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${u.progressPercent || 0}%`,
                                                        background: (u.progressPercent || 0) > 50 ? '#10b981' : '#f59e0b',
                                                        borderRadius: '3px',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.progressPercent || 0}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                                            {formatDate(u.enrolledAt)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                                            {formatDate(u.lastActivityAt)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '3px 10px',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: badge.bg,
                                                color: badge.color,
                                            }}>
                                                {badge.label}
                                            </span>
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
