'use client';

import { useEffect, useMemo, useState } from 'react';

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
  totals: {
    courseView: 0,
    checkoutStart: 0,
    paymentSuccess: 0,
    lessonCompleted: 0,
  },
  uniqueActors: {
    courseView: 0,
    checkoutStart: 0,
    paymentSuccess: 0,
    lessonCompleted: 0,
  },
  conversion: {
    viewToCheckout: 0,
    checkoutToPayment: 0,
    viewToPayment: 0,
  },
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

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('6');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsFunnelResponse>(EMPTY_DATA);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/analytics/funnel?period=${period}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        }

        if (mounted) {
          setData({ ...EMPTY_DATA, ...json });
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [period]);

  const maxTimelineValue = useMemo(() => {
    return Math.max(
      ...data.timeline.map((item) => Math.max(item.courseView, item.checkoutStart, item.paymentSuccess)),
      1
    );
  }, [data.timeline]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลดข้อมูล Analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            Product Analytics + Funnel
          </h1>
          <p style={{ color: '#64748b' }}>
            ติดตามเส้นทางผู้ใช้ตั้งแต่ดูสินค้า → เริ่มชำระเงิน → ชำระเงินสำเร็จ → เรียนจบ
          </p>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="1">1 เดือนล่าสุด</option>
          <option value="3">3 เดือนล่าสุด</option>
          <option value="6">6 เดือนล่าสุด</option>
          <option value="12">12 เดือนล่าสุด</option>
          <option value="24">24 เดือนล่าสุด</option>
        </select>
      </div>

      {!data.enabled && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #fcd34d',
          background: '#fffbeb',
          color: '#92400e',
          fontSize: '0.9rem',
        }}>
          Analytics ยังไม่ได้เปิดใช้งาน กรุณาเปิดค่า <strong>analytics_enabled</strong> ที่หน้า <a href="/admin/settings" style={{ color: '#b45309' }}>ตั้งค่า</a>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '4px' }}>Product Views</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatNumber(data.totals.courseView)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Unique: {formatNumber(data.uniqueActors.courseView)}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '4px' }}>Checkout Starts</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatNumber(data.totals.checkoutStart)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Unique: {formatNumber(data.uniqueActors.checkoutStart)}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '4px' }}>Payment Success</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatNumber(data.totals.paymentSuccess)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Unique: {formatNumber(data.uniqueActors.paymentSuccess)}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '4px' }}>Lesson Completed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatNumber(data.totals.lessonCompleted)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Unique: {formatNumber(data.uniqueActors.lessonCompleted)}</div>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Funnel Conversion</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>View → Checkout</div>
            <div style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>{formatPercent(data.conversion.viewToCheckout)}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Checkout → Payment</div>
            <div style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>{formatPercent(data.conversion.checkoutToPayment)}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>View → Payment</div>
            <div style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>{formatPercent(data.conversion.viewToPayment)}</div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Daily Trend</h2>
        {data.timeline.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {data.timeline.slice(-21).map((point) => {
              const paymentWidth = Math.max((point.paymentSuccess / maxTimelineValue) * 100, 2);
              const checkoutWidth = Math.max((point.checkoutStart / maxTimelineValue) * 100, 2);
              const viewWidth = Math.max((point.courseView / maxTimelineValue) * 100, 2);

              return (
                <div key={point.date} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>{point.date}</span>
                    <span style={{ color: '#334155' }}>
                      Views {point.courseView} · Checkout {point.checkoutStart} · Paid {point.paymentSuccess}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '8px', background: '#e0f2fe', borderRadius: '99px', width: `${viewWidth}%` }} />
                    <div style={{ height: '8px', background: '#c7d2fe', borderRadius: '99px', width: `${checkoutWidth}%` }} />
                    <div style={{ height: '8px', background: '#bbf7d0', borderRadius: '99px', width: `${paymentWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
      }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Top Courses Funnel</h2>
          {data.topCourses.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>คอร์ส</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>View</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>Checkout</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCourses.map((item) => (
                    <tr key={item.courseId || item.courseTitle} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px', color: '#1e293b', fontSize: '0.85rem' }}>{item.courseTitle}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7' }}>{item.views}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#4f46e5' }}>{item.checkouts}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{item.payments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Top Bundles Funnel</h2>
          {data.topBundles.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>Bundle</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>View</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>Checkout</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontSize: '0.75rem', color: '#64748b' }}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topBundles.map((item) => (
                    <tr key={item.bundleId || item.bundleTitle} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px', color: '#1e293b', fontSize: '0.85rem' }}>{item.bundleTitle}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7' }}>{item.views}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#4f46e5' }}>{item.checkouts}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{item.payments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginTop: '24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Checkout Methods</h2>
        {data.checkoutMethods.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {data.checkoutMethods.map((method) => (
              <span
                key={method.method}
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontSize: '0.85rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                {method.method}: {formatNumber(method.count)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
