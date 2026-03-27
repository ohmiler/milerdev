'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminButton, AdminPageHero, AdminSurfaceCard } from '@/components/admin/ui/AdminPrimitives';

interface FunnelTotals {
  courseView: number;
  checkoutStart: number;
  paymentSuccess: number;
  lessonCompleted: number;
}

interface ConversionStats {
  viewToCheckout: number;
  checkoutToPayment: number;
  viewToPayment: number;
}

interface TimelinePoint {
  date: string;
  courseView: number;
  checkoutStart: number;
  paymentSuccess: number;
  lessonCompleted: number;
}

interface TopCourse {
  courseId: string | null;
  courseTitle: string;
  views: number;
  checkouts: number;
  payments: number;
  viewToCheckout: number;
  checkoutToPayment: number;
}

interface TopBundle {
  bundleId: string | null;
  bundleTitle: string;
  views: number;
  checkouts: number;
  payments: number;
  viewToCheckout: number;
  checkoutToPayment: number;
}

interface CheckoutMethod {
  method: string;
  count: number;
}

interface AnalyticsFunnelResponse {
  enabled: boolean;
  periodMonths: number;
  totals: FunnelTotals;
  uniqueActors: FunnelTotals;
  conversion: ConversionStats;
  timeline: TimelinePoint[];
  topCourses: TopCourse[];
  topBundles: TopBundle[];
  checkoutMethods: CheckoutMethod[];
}

const EMPTY_DATA: AnalyticsFunnelResponse = {
  enabled: false,
  periodMonths: 6,
  totals: { courseView: 0, checkoutStart: 0, paymentSuccess: 0, lessonCompleted: 0 },
  uniqueActors: { courseView: 0, checkoutStart: 0, paymentSuccess: 0, lessonCompleted: 0 },
  conversion: { viewToCheckout: 0, checkoutToPayment: 0, viewToPayment: 0 },
  timeline: [],
  topCourses: [],
  topBundles: [],
  checkoutMethods: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDateTime(value: Date | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function conversionColor(pct: number) {
  if (pct >= 10) return '#16a34a';
  if (pct >= 3) return '#d97706';
  return '#dc2626';
}

function SkeletonBlock({ w = '100%', h = 20 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: 6,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBlock w={280} h={28} />
          <SkeletonBlock w={380} h={16} />
        </div>
        <SkeletonBlock w={160} h={38} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ borderRadius: 12, padding: 20, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <SkeletonBlock w={100} h={14} />
            <div style={{ marginTop: 8 }}><SkeletonBlock w={80} h={32} /></div>
            <div style={{ marginTop: 6 }}><SkeletonBlock w={120} h={12} /></div>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
        <SkeletonBlock w={160} h={18} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} h={60} />)}
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <SkeletonBlock w={120} h={18} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} h={28} />)}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('6');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsFunnelResponse>(EMPTY_DATA);
  const [trendPage, setTrendPage] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const TREND_PAGE_SIZE = 21;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/funnel?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      setData({ ...EMPTY_DATA, ...json });
      setLastUpdatedAt(new Date());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => { setTrendPage(0); }, [period]);

  const maxTimelineValue = useMemo(() => {
    return Math.max(
      ...data.timeline.map((item) => Math.max(item.courseView, item.checkoutStart, item.paymentSuccess)),
      1
    );
  }, [data.timeline]);

  const totalCheckouts = useMemo(() => data.checkoutMethods.reduce((s, m) => s + m.count, 0), [data.checkoutMethods]);
  const lessonCompletionRateFromPayments = useMemo(() => {
    if (data.totals.paymentSuccess <= 0) return 0;
    return Number(((data.totals.lessonCompleted / data.totals.paymentSuccess) * 100).toFixed(2));
  }, [data.totals.lessonCompleted, data.totals.paymentSuccess]);
  const uniqueLessonCompletionRateFromPayments = useMemo(() => {
    if (data.uniqueActors.paymentSuccess <= 0) return 0;
    return Number(((data.uniqueActors.lessonCompleted / data.uniqueActors.paymentSuccess) * 100).toFixed(2));
  }, [data.uniqueActors.lessonCompleted, data.uniqueActors.paymentSuccess]);

  const header = (
    <AdminPageHero
      eyebrow="Analytics"
      title="Product Analytics"
      description="ติดตามยอดการดูสินค้า ยอดเริ่มชำระเงิน ยอดจ่ายสำเร็จ และผลการเรียนแยกกันให้ตีความได้ชัดขึ้น"
      meta={<><strong>อัปเดตล่าสุด:</strong> {formatDateTime(lastUpdatedAt)}</>}
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '10px 14px', border: '1px solid #dbe5f4', borderRadius: 12, background: '#ffffff', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', minHeight: '42px' }}
          >
            <option value="1">1 เดือนล่าสุด</option>
            <option value="3">3 เดือนล่าสุด</option>
            <option value="6">6 เดือนล่าสุด</option>
            <option value="12">12 เดือนล่าสุด</option>
            <option value="24">24 เดือนล่าสุด</option>
          </select>
          <AdminButton type="button" tone="default" onClick={fetchData}>
            รีเฟรช
          </AdminButton>
        </div>
      }
    />
  );

  if (loading) return <div>{header}<LoadingSkeleton /></div>;

  if (error) {
    return (
      <div>
        {header}
        <AdminSurfaceCard style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>เกิดข้อผิดพลาด</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>{error}</div>
          <AdminButton type="button" tone="info" onClick={fetchData}>ลองใหม่</AdminButton>
        </AdminSurfaceCard>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Product Views', total: data.totals.courseView, unique: data.uniqueActors.courseView, gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)' },
    { label: 'Checkout Starts', total: data.totals.checkoutStart, unique: data.uniqueActors.checkoutStart, gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    { label: 'Payment Success', total: data.totals.paymentSuccess, unique: data.uniqueActors.paymentSuccess, gradient: 'linear-gradient(135deg, #16a34a, #15803d)' },
  ];

  return (
    <div>
      {header}

      {!data.enabled && (
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 10, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Analytics ยังไม่ได้เปิดใช้งาน กรุณาเปิดค่า <strong>analytics_enabled</strong> ที่หน้า <Link href="/admin/settings" style={{ color: '#b45309', textDecoration: 'underline' }}>ตั้งค่า</Link>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ background: card.gradient, color: 'white', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 4, fontWeight: 500, letterSpacing: '0.01em' }}>{card.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{formatNumber(card.total)}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: 4 }}>Unique: {formatNumber(card.unique)}</div>
          </div>
        ))}
      </div>

      {/* Funnel Conversion */}
      <AdminSurfaceCard style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Funnel Conversion</h2>
        <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 14 }}>ส่วนนี้ใช้วัด conversion เชิงยอดขายเท่านั้น โดยยังไม่รวมผลลัพธ์การเรียนเพื่อหลีกเลี่ยงการตีความ funnel ผิด</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Stage: Views */}
          <div style={{ flex: 1, minWidth: 120, padding: '14px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>Views</div>
            <div style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.totals.courseView)}</div>
          </div>

          {/* Arrow + rate */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: conversionColor(data.conversion.viewToCheckout), fontWeight: 700 }}>{formatPercent(data.conversion.viewToCheckout)}</div>
            <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>→</div>
          </div>

          {/* Stage: Checkout */}
          <div style={{ flex: 1, minWidth: 120, padding: '14px 16px', borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe', textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>Checkout</div>
            <div style={{ color: '#4f46e5', fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.totals.checkoutStart)}</div>
          </div>

          {/* Arrow + rate */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: conversionColor(data.conversion.checkoutToPayment), fontWeight: 700 }}>{formatPercent(data.conversion.checkoutToPayment)}</div>
            <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>→</div>
          </div>

          {/* Stage: Payment */}
          <div style={{ flex: 1, minWidth: 120, padding: '14px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>Paid</div>
            <div style={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.totals.paymentSuccess)}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>&ge;10% ดี</span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', flexShrink: 0, marginLeft: 8 }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>3–10% พอใช้</span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', flexShrink: 0, marginLeft: 8 }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>&lt;3% ต่ำ</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>View→Payment รวม: <strong style={{ color: conversionColor(data.conversion.viewToPayment) }}>{formatPercent(data.conversion.viewToPayment)}</strong></span>
        </div>
      </AdminSurfaceCard>

      {/* Learning Outcome */}
      <AdminSurfaceCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Learning Outcome</h2>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>แยกผลการเรียนออกจาก sales funnel เพื่อให้เห็นว่าหลังจ่ายแล้ว ผู้เรียนไปถึงขั้นเรียนจบมากน้อยแค่ไหน</div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>อิงจาก Lesson Completed event ในช่วงเวลาที่เลือก</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ borderRadius: 12, padding: 18, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ color: '#92400e', fontSize: '0.78rem', marginBottom: 6, fontWeight: 600 }}>Lesson Completed</div>
            <div style={{ color: '#d97706', fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.1 }}>{formatNumber(data.totals.lessonCompleted)}</div>
            <div style={{ color: '#a16207', fontSize: '0.78rem', marginTop: 6 }}>Unique learners: {formatNumber(data.uniqueActors.lessonCompleted)}</div>
          </div>
          <div style={{ borderRadius: 12, padding: 18, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginBottom: 6, fontWeight: 600 }}>Completed / Payments</div>
            <div style={{ color: conversionColor(lessonCompletionRateFromPayments), fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.1 }}>{formatPercent(lessonCompletionRateFromPayments)}</div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 6 }}>เทียบ event เรียนจบกับจำนวน payment success</div>
          </div>
          <div style={{ borderRadius: 12, padding: 18, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginBottom: 6, fontWeight: 600 }}>Unique Completed / Unique Payers</div>
            <div style={{ color: conversionColor(uniqueLessonCompletionRateFromPayments), fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.1 }}>{formatPercent(uniqueLessonCompletionRateFromPayments)}</div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 6 }}>ช่วยดูภาพคร่าว ๆ ของคุณภาพหลังการขายจากผู้ใช้ไม่ซ้ำ</div>
          </div>
        </div>
      </AdminSurfaceCard>

      {/* Daily Trend */}
      <AdminSurfaceCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Daily Trend</h2>
            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>แสดงจำนวน event รายวันของการดูสินค้า เริ่มชำระเงิน และจ่ายสำเร็จ</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { color: '#0ea5e9', label: 'Views' },
              { color: '#6366f1', label: 'Checkout' },
              { color: '#16a34a', label: 'Paid' },
            ].map((item) => (
              <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#64748b' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        {data.timeline.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>ไม่มีข้อมูลในช่วงเวลานี้</div>
        ) : (() => {
          const totalPages = Math.ceil(data.timeline.length / TREND_PAGE_SIZE);
          const safePage = Math.min(trendPage, totalPages - 1);
          const pageItems = data.timeline.slice(
            safePage * TREND_PAGE_SIZE,
            (safePage + 1) * TREND_PAGE_SIZE
          );
          return (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                {pageItems.map((point) => {
                  const viewWidth = Math.max((point.courseView / maxTimelineValue) * 100, 1);
                  const checkoutWidth = Math.max((point.checkoutStart / maxTimelineValue) * 100, 1);
                  const paymentWidth = Math.max((point.paymentSuccess / maxTimelineValue) * 100, 1);
                  return (
                    <div key={point.date} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.75rem' }}>
                        <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{point.date}</span>
                        <span style={{ color: '#334155' }}>
                          <span style={{ color: '#0284c7' }}>{point.courseView}</span>
                          {' · '}
                          <span style={{ color: '#4f46e5' }}>{point.checkoutStart}</span>
                          {' · '}
                          <span style={{ color: '#16a34a' }}>{point.paymentSuccess}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ height: 7, background: '#0ea5e9', borderRadius: 99, width: `${viewWidth}%`, opacity: 0.8 }} />
                        <div style={{ height: 7, background: '#6366f1', borderRadius: 99, width: `${checkoutWidth}%`, opacity: 0.8 }} />
                        <div style={{ height: 7, background: '#16a34a', borderRadius: 99, width: `${paymentWidth}%`, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setTrendPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: safePage === 0 ? '#f8fafc' : 'white', color: safePage === 0 ? '#94a3b8' : '#334155', cursor: safePage === 0 ? 'default' : 'pointer', fontSize: '0.82rem' }}
                  >
                    ← ก่อนหน้า
                  </button>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    หน้า {safePage + 1} / {totalPages} ({data.timeline.length} วัน)
                  </span>
                  <button
                    onClick={() => setTrendPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
                    style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: safePage === totalPages - 1 ? '#f8fafc' : 'white', color: safePage === totalPages - 1 ? '#94a3b8' : '#334155', cursor: safePage === totalPages - 1 ? 'default' : 'pointer', fontSize: '0.82rem' }}
                  >
                    ถัดไป →
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </AdminSurfaceCard>

      {/* Top Courses & Bundles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        {[
          { title: 'Top Courses Funnel', items: data.topCourses, keyField: 'courseId' as const, titleField: 'courseTitle' as const },
          { title: 'Top Bundles Funnel', items: data.topBundles, keyField: 'bundleId' as const, titleField: 'bundleTitle' as const },
        ].map(({ title, items, keyField, titleField }) => (
          <div key={title} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>{title}</h2>
            {items.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>ชื่อ</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', color: '#0284c7', fontWeight: 600 }}>Views</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', color: '#4f46e5', fontWeight: 600 }}>Checkout</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', color: '#16a34a', fontWeight: 600 }}>Paid</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>V→C</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>C→P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={(item as unknown as Record<string, unknown>)[keyField] as string || (item as unknown as Record<string, unknown>)[titleField] as string} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '9px 10px', color: '#1e293b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(item as unknown as Record<string, unknown>)[titleField] as string}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>{item.views}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>{item.checkouts}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.payments}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: conversionColor(item.viewToCheckout), fontWeight: 600 }}>{formatPercent(item.viewToCheckout)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: conversionColor(item.checkoutToPayment), fontWeight: 600 }}>{formatPercent(item.checkoutToPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Checkout Methods */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Checkout Methods</h2>
        {data.checkoutMethods.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.checkoutMethods.map((method) => {
              const pct = totalCheckouts > 0 ? (method.count / totalCheckouts) * 100 : 0;
              return (
                <div key={method.method}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{method.method}</span>
                    <span style={{ color: '#64748b' }}>{formatNumber(method.count)} <span style={{ color: '#94a3b8' }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #4f46e5)', borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
