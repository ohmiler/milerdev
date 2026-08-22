'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/ui/Toast';

interface Overview {
  totalRevenue: number;
  totalTransactions: number;
  totalUsers: number;
  totalEnrollments: number;
  totalCourses: number;
}

interface RecentStats {
  newUsers: number;
  newEnrollments: number;
  revenue: number;
}

interface MonthlyData {
  month: string;
  revenue?: number;
  transactions?: number;
  count?: number;
}

interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  coursePrice: string;
  enrollmentCount: number;
  completedCount: number;
  avgProgress: number;
}

interface RevenueByCourse {
  courseId: string;
  courseTitle: string;
  revenue: number;
  transactions: number;
}

interface RevenueByBundle {
  bundleId: string;
  bundleTitle: string;
  revenue: number;
  transactions: number;
}

interface UserStats {
  total: number;
  admins: number;
  instructors: number;
  students: number;
}

interface CompletionStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  revenue: number;
}

interface ReportData {
  overview: Overview;
  recentStats: RecentStats;
  monthlyRevenue: MonthlyData[];
  monthlyEnrollments: MonthlyData[];
  monthlyUsers: MonthlyData[];
  coursePerformance: CoursePerformance[];
  revenueByCourse: RevenueByCourse[];
  revenueByBundle: RevenueByBundle[];
  userStats: UserStats;
  completionStats: CompletionStats;
  paymentMethods: PaymentMethod[];
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('12');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?period=${period}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        return;
      }
      setData(json);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/admin/reports/export?type=${type}&period=${period}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
    } finally {
      setExporting(null);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(parseFloat(String(amount)));
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getMaxRevenue = () => {
    if (!data?.monthlyRevenue) return 1;
    return Math.max(...data.monthlyRevenue.map(m => m.revenue || 0), 1);
  };

  const tabs = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'revenue', label: 'รายได้' },
    { id: 'courses', label: 'คอร์ส' },
    { id: 'users', label: 'ผู้ใช้' },
    { id: 'export', label: 'ส่งออกข้อมูล' },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ color: 'var(--color-error-strong)', marginBottom: '16px' }}>{error}</div>
        <button
          onClick={fetchData}
          style={{
            padding: '10px 20px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
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
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>
            รายงานและวิเคราะห์
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>ดูสถิติและรายงานการใช้งานระบบ</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--card)',
            fontSize: '0.875rem',
          }}
        >
          <option value="3">3 เดือนล่าสุด</option>
          <option value="6">6 เดือนล่าสุด</option>
          <option value="12">12 เดือนล่าสุด</option>
          <option value="24">24 เดือนล่าสุด</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: 'var(--muted)',
        padding: '4px',
        borderRadius: '10px',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && data && data.overview && (
        <>
          {/* Main Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ background: 'var(--primary)', padding: '24px', borderRadius: '12px', color: 'var(--primary-foreground)' }}>
              <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '4px' }}>รายได้รวม</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(data.overview.totalRevenue)}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: '4px' }}>{formatNumber(data.overview.totalTransactions)} รายการ</div>
            </div>
            <div style={{ background: 'var(--color-success-strong)', padding: '24px', borderRadius: '12px', color: 'var(--primary-foreground)' }}>
              <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '4px' }}>การลงทะเบียน</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.overview.totalEnrollments)}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: '4px' }}>ทั้งหมด</div>
            </div>
            <div style={{ background: 'var(--color-warning-strong)', padding: '24px', borderRadius: '12px', color: 'var(--primary-foreground)' }}>
              <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '4px' }}>ผู้ใช้</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.overview.totalUsers)}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: '4px' }}>ทั้งหมด</div>
            </div>
            <div style={{ background: 'var(--primary)', padding: '24px', borderRadius: '12px', color: 'var(--primary-foreground)' }}>
              <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '4px' }}>คอร์ส</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(data.overview.totalCourses)}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: '4px' }}>ทั้งหมด</div>
            </div>
          </div>

          {/* 30-Day Stats */}
          {data.recentStats && (
            <div style={{
              background: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
                30 วันล่าสุด
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>รายได้</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-success-strong)' }}>{formatCurrency(data.recentStats.revenue)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>ผู้ใช้ใหม่</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>{formatNumber(data.recentStats.newUsers)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>การลงทะเบียนใหม่</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-warning-strong)' }}>{formatNumber(data.recentStats.newEnrollments)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Completion Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {data.completionStats && (
              <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
                  สถานะการเรียน
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>เรียนจบ</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-success-strong)' }}>{data.completionStats.completed}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(data.completionStats.completed / Math.max(data.completionStats.total, 1)) * 100}%`, height: '100%', background: 'var(--color-success-strong)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>กำลังเรียน</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{data.completionStats.inProgress}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(data.completionStats.inProgress / Math.max(data.completionStats.total, 1)) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>ยังไม่เริ่ม</span>
                      <span style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>{data.completionStats.notStarted}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(data.completionStats.notStarted / Math.max(data.completionStats.total, 1)) * 100}%`, height: '100%', background: 'var(--muted-foreground)', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {data.userStats && (
              <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
                  ประเภทผู้ใช้
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Admin</span>
                    <span style={{ padding: '4px 12px', background: 'var(--color-error-soft)', color: 'var(--color-error-strong)', borderRadius: '50px', fontWeight: 600, fontSize: '0.875rem' }}>{data.userStats.admins}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Instructor</span>
                    <span style={{ padding: '4px 12px', background: 'var(--secondary)', color: 'var(--primary)', borderRadius: '50px', fontWeight: 600, fontSize: '0.875rem' }}>{data.userStats.instructors}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Student</span>
                    <span style={{ padding: '4px 12px', background: 'var(--color-success-soft)', color: 'var(--color-success-strong)', borderRadius: '50px', fontWeight: 600, fontSize: '0.875rem' }}>{data.userStats.students}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && data && data.monthlyRevenue && (
        <>
          {/* Monthly Revenue Chart */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              รายได้รายเดือน
            </h3>
            {data.monthlyRevenue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', paddingTop: '20px' }}>
                {data.monthlyRevenue.map((item, index) => (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(item.revenue || 0)}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '40px',
                        height: `${Math.max(((item.revenue || 0) / getMaxRevenue()) * 150, 4)}px`,
                        background: 'var(--primary)',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <div style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                      {formatMonth(item.month)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              วิธีการชำระเงิน
            </h3>
            {data.paymentMethods.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {data.paymentMethods.map((method, index) => (
                  <div key={index} style={{ padding: '16px', background: 'var(--muted)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px', textTransform: 'capitalize' }}>
                      {method.method || 'ไม่ระบุ'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      <span>จำนวน: {method.count}</span>
                      <span>{formatCurrency(method.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && data && data.revenueByCourse && (
        <>
          {/* Revenue by Course */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              รายได้ตามคอร์ส (Top 10)
            </h3>
            {data.revenueByCourse.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>คอร์ส</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>รายได้</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>รายการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByCourse.map((course) => (
                      <tr key={course.courseId} style={{ borderBottom: '1px solid var(--muted)' }}>
                        <td style={{ padding: '12px', color: 'var(--foreground)' }}>{course.courseTitle || 'ไม่ระบุ'}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success-strong)' }}>{formatCurrency(course.revenue)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--muted-foreground)' }}>{course.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue by Bundle */}
          {data.revenueByBundle && data.revenueByBundle.length > 0 && (
            <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
                📦 รายได้ตาม Bundle (Top 10)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Bundle</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>รายได้</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>รายการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByBundle.map((bundle) => (
                      <tr key={bundle.bundleId} style={{ borderBottom: '1px solid var(--muted)' }}>
                        <td style={{ padding: '12px', color: 'var(--foreground)' }}>{bundle.bundleTitle || 'ไม่ระบุ'}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success-strong)' }}>{formatCurrency(bundle.revenue)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--muted-foreground)' }}>{bundle.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Course Performance */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              ความคืบหน้าการเรียนตามคอร์ส (Top 10)
            </h3>
            {data.coursePerformance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>คอร์ส</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>ลงทะเบียน</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>เรียนจบ</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>ความคืบหน้าเฉลี่ย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.coursePerformance.map((course) => (
                      <tr key={course.courseId} style={{ borderBottom: '1px solid var(--muted)' }}>
                        <td style={{ padding: '12px', color: 'var(--foreground)' }}>{course.courseTitle || 'ไม่ระบุ'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--muted-foreground)' }}>{course.enrollmentCount}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--color-success-strong)', fontWeight: 600 }}>{course.completedCount}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${course.avgProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{Math.round(course.avgProgress)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && data && data.monthlyUsers && (
        <>
          {/* Monthly New Users */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              ผู้ใช้ใหม่รายเดือน
            </h3>
            {data.monthlyUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', paddingTop: '20px' }}>
                {data.monthlyUsers.map((item, index) => {
                  const maxCount = Math.max(...data.monthlyUsers.map(m => m.count || 0), 1);
                  return (
                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground)', fontWeight: 600 }}>
                        {item.count}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '40px',
                          height: `${Math.max(((item.count || 0) / maxCount) * 150, 4)}px`,
                          background: 'var(--color-warning-strong)',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                      <div style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                        {formatMonth(item.month)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Enrollments */}
          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
              การลงทะเบียนรายเดือน
            </h3>
            {data.monthlyEnrollments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>ไม่มีข้อมูล</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', paddingTop: '20px' }}>
                {data.monthlyEnrollments.map((item, index) => {
                  const maxCount = Math.max(...data.monthlyEnrollments.map(m => m.count || 0), 1);
                  return (
                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground)', fontWeight: 600 }}>
                        {item.count}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '40px',
                          height: `${Math.max(((item.count || 0) / maxCount) * 150, 4)}px`,
                          background: 'var(--color-success-strong)',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                      <div style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                        {formatMonth(item.month)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '20px' }}>
            ส่งออกข้อมูลเป็น CSV
          </h3>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
            ดาวน์โหลดข้อมูลในรูปแบบ CSV เพื่อนำไปใช้งานใน Excel หรือโปรแกรมอื่น
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>รายงานการชำระเงิน</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '16px' }}>
                ข้อมูลการชำระเงินทั้งหมดในช่วง {period} เดือนล่าสุด
              </p>
              <button
                onClick={() => handleExport('payments')}
                disabled={exporting === 'payments'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exporting === 'payments' ? 'not-allowed' : 'pointer',
                  opacity: exporting === 'payments' ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {exporting === 'payments' ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>รายงานการลงทะเบียน</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '16px' }}>
                ข้อมูลการลงทะเบียนทั้งหมดในช่วง {period} เดือนล่าสุด
              </p>
              <button
                onClick={() => handleExport('enrollments')}
                disabled={exporting === 'enrollments'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-success-strong)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exporting === 'enrollments' ? 'not-allowed' : 'pointer',
                  opacity: exporting === 'enrollments' ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {exporting === 'enrollments' ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>รายงานผู้ใช้</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '16px' }}>
                รายชื่อผู้ใช้ทั้งหมดในระบบ พร้อมข้อมูลการลงทะเบียน
              </p>
              <button
                onClick={() => handleExport('users')}
                disabled={exporting === 'users'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-warning-strong)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exporting === 'users' ? 'not-allowed' : 'pointer',
                  opacity: exporting === 'users' ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {exporting === 'users' ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>รายงานคอร์ส</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '16px' }}>
                รายการคอร์สทั้งหมด พร้อมจำนวนการลงทะเบียนและรายได้
              </p>
              <button
                onClick={() => handleExport('courses')}
                disabled={exporting === 'courses'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exporting === 'courses' ? 'not-allowed' : 'pointer',
                  opacity: exporting === 'courses' ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {exporting === 'courses' ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
              </button>
            </div>

            <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>รายได้รายเดือน</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '16px' }}>
                สรุปรายได้รายเดือนในช่วง {period} เดือนล่าสุด
              </p>
              <button
                onClick={() => handleExport('revenue-monthly')}
                disabled={exporting === 'revenue-monthly'}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exporting === 'revenue-monthly' ? 'not-allowed' : 'pointer',
                  opacity: exporting === 'revenue-monthly' ? 0.7 : 1,
                  width: '100%',
                }}
              >
                {exporting === 'revenue-monthly' ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
