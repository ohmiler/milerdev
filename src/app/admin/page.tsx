import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, users, enrollments, lessons, payments } from '@/lib/db/schema';
import { count, desc, eq, sql, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type AdminDashboardData = {
  stats: Awaited<ReturnType<typeof getStats>>;
  revenueStats: Awaited<ReturnType<typeof getRevenueStats>>;
  recentEnrollments: Awaited<ReturnType<typeof getRecentEnrollments>>;
  recentPayments: Awaited<ReturnType<typeof getRecentPayments>>;
  sevenDayRevenue: Awaited<ReturnType<typeof getSevenDayRevenue>>;
  sevenDayEnrollments: Awaited<ReturnType<typeof getSevenDayEnrollmentTrend>>;
  paymentHealth: Awaited<ReturnType<typeof getPaymentHealthStats>>;
};

type AdminDashboardCacheEntry = {
  expiresAt: number;
  value: AdminDashboardData;
};

const ADMIN_DASHBOARD_CACHE_TTL_MS = 60_000;
let adminDashboardCache: AdminDashboardCacheEntry | null = null;

async function getStats() {
  const [coursesCount] = await db.select({ count: count() }).from(courses);
  const [usersCount] = await db.select({ count: count() }).from(users);
  const [enrollmentsCount] = await db.select({ count: count() }).from(enrollments);
  const [lessonsCount] = await db.select({ count: count() }).from(lessons);

  return {
    courses: coursesCount?.count || 0,
    users: usersCount?.count || 0,
    enrollments: enrollmentsCount?.count || 0,
    lessons: lessonsCount?.count || 0,
  };
}

async function getRevenueStats() {
  // Total revenue from completed payments
  const [totalRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
    })
    .from(payments);

  // This month's revenue
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthlyRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
    })
    .from(payments)
    .where(gte(payments.createdAt, startOfMonth));

  // Pending payments count
  const [pendingPayments] = await db
    .select({ count: count() })
    .from(payments)
    .where(eq(payments.status, 'pending'));

  return {
    totalRevenue: totalRevenue?.total || 0,
    monthlyRevenue: monthlyRevenue?.total || 0,
    pendingPayments: pendingPayments?.count || 0,
  };
}

async function getRecentEnrollments() {
  const recent = await db
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      userName: users.name,
      userEmail: users.email,
      courseTitle: courses.title,
    })
    .from(enrollments)
    .leftJoin(users, eq(enrollments.userId, users.id))
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(5);

  return recent;
}

async function getSevenDayRevenue() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`DATE_FORMAT(${payments.createdAt}, '%Y-%m-%d')`,
      total: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`,
    })
    .from(payments)
    .where(gte(payments.createdAt, startDate))
    .groupBy(sql`DATE_FORMAT(${payments.createdAt}, '%Y-%m-%d')`)
    .orderBy(sql`DATE_FORMAT(${payments.createdAt}, '%Y-%m-%d')`);

  const rowMap = new Map(rows.map((row) => [row.date, Number(row.total || 0)]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      total: rowMap.get(key) || 0,
    };
  });
}

async function getSevenDayEnrollmentTrend() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`DATE_FORMAT(${enrollments.enrolledAt}, '%Y-%m-%d')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(enrollments)
    .where(gte(enrollments.enrolledAt, startDate))
    .groupBy(sql`DATE_FORMAT(${enrollments.enrolledAt}, '%Y-%m-%d')`)
    .orderBy(sql`DATE_FORMAT(${enrollments.enrolledAt}, '%Y-%m-%d')`);

  const rowMap = new Map(rows.map((row) => [row.date, Number(row.count || 0)]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      count: rowMap.get(key) || 0,
    };
  });
}

async function getPaymentHealthStats() {
  const [healthRow] = await db
    .select({
      completed: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      failed: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(payments);

  return {
    completed: Number(healthRow?.completed || 0),
    pending: Number(healthRow?.pending || 0),
    failed: Number(healthRow?.failed || 0),
  };
}

async function getRecentPayments() {
  const recent = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      method: payments.method,
      createdAt: payments.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  return recent;
}

function getInitials(nameOrEmail: string) {
  const value = nameOrEmail.trim();
  if (!value) return 'A';
  if (value.includes('@')) {
    return value.slice(0, 2).toUpperCase();
  }

  const parts = value.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'A';
}

function getSmoothLinePath(coordinates: Array<{ x: number; y: number }>) {
  if (coordinates.length === 0) return '';
  if (coordinates.length === 1) return `M ${coordinates[0].x} ${coordinates[0].y}`;

  return coordinates.reduce((path, point, index, allPoints) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previousPoint = allPoints[index - 1];
    const controlX = previousPoint.x + (point.x - previousPoint.x) / 2;
    return `${path} C ${controlX} ${previousPoint.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function getLineChartGeometry(values: number[], width = 320, height = 148) {
  const safeMax = Math.max(...values, 1);
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index * width) / (values.length - 1);
    const y = height - (value / safeMax) * (height - 18) - 9;
    return { x, y };
  });

  const points = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const linePath = getSmoothLinePath(coordinates);
  const areaPath = coordinates.length > 0
    ? `${linePath} L ${width} ${height} L 0 ${height} Z`
    : '';
  const guideValues = Array.from({ length: 4 }, (_, index) => Math.round((safeMax * (4 - index)) / 4));

  return {
    areaPath,
    coordinates,
    guideValues,
    height,
    linePath,
    points,
    width,
  };
}

async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = Date.now();
  if (adminDashboardCache && adminDashboardCache.expiresAt > now) {
    return adminDashboardCache.value;
  }

  const [stats, revenueStats, recentEnrollments, recentPayments, sevenDayRevenue, sevenDayEnrollments, paymentHealth] = await Promise.all([
    getStats(),
    getRevenueStats(),
    getRecentEnrollments(),
    getRecentPayments(),
    getSevenDayRevenue(),
    getSevenDayEnrollmentTrend(),
    getPaymentHealthStats(),
  ]);

  const value: AdminDashboardData = {
    stats,
    revenueStats,
    recentEnrollments,
    recentPayments,
    sevenDayRevenue,
    sevenDayEnrollments,
    paymentHealth,
  };

  adminDashboardCache = {
    value,
    expiresAt: now + ADMIN_DASHBOARD_CACHE_TTL_MS,
  };

  return value;
}

export default async function AdminDashboard() {
  const {
    stats,
    revenueStats,
    recentEnrollments,
    recentPayments,
    sevenDayRevenue,
    sevenDayEnrollments,
    paymentHealth,
  } = await getAdminDashboardData();

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(parseFloat(String(amount)));
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCompactNumber = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    return `฿${formatCompactNumber(value)}`;
  };

  const formatSignedCompactValue = (value: number, prefix = '') => {
    if (value === 0) return 'คงที่';
    return `${value > 0 ? '+' : '-'}${prefix}${formatCompactNumber(Math.abs(value))}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74' };
      case 'completed': return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'failed': return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' };
      default: return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const topPriorityAction = revenueStats.pendingPayments > 0
    ? {
      href: '/admin/payments?status=pending',
      label: 'ตรวจสอบการชำระเงินที่ค้างอยู่',
      note: `มี ${revenueStats.pendingPayments} รายการที่อาจทำให้การเข้าเรียนล่าช้า`,
    }
    : {
      href: '/admin/courses',
      label: 'ดูความพร้อมของคอร์สและบทเรียน',
      note: 'ไม่มีรายการค้างตรวจเร่งด่วนในตอนนี้',
    };

  const workflowActions = [
    { href: '/admin/courses/new', label: 'สร้างคอร์สใหม่', note: 'เริ่มงานคอนเทนต์และโครงสร้างใหม่' },
    { href: '/admin/courses', label: 'จัดการคอร์ส', note: 'ตรวจบทเรียนและความพร้อมของเนื้อหา' },
    { href: '/admin/payments', label: 'ติดตามการชำระเงิน', note: 'ดูสถานะธุรกรรมและรายการค้าง' },
    { href: '/admin/analytics', label: 'ดู Analytics', note: 'เช็กแนวโน้มรายได้และพฤติกรรมล่าสุด' },
    { href: '/admin/reconciliation', label: 'ตรวจ Reconcile', note: 'ยืนยันรายการที่ยังต้องจัดการ' },
  ];

  const totalPayments = paymentHealth.completed + paymentHealth.pending + paymentHealth.failed;
  const paymentSuccessRate = totalPayments > 0 ? (paymentHealth.completed / totalPayments) * 100 : 0;
  const sevenDayRevenueTotal = sevenDayRevenue.reduce((sum, item) => sum + item.total, 0);
  const sevenDayEnrollmentTotal = sevenDayEnrollments.reduce((sum, item) => sum + item.count, 0);
  const averageLessonsPerCourse = stats.courses > 0 ? (stats.lessons / stats.courses).toFixed(1) : '0.0';
  const averageEnrollmentsPerCourse = stats.courses > 0 ? (stats.enrollments / stats.courses).toFixed(1) : '0.0';
  const latestStudentLabel = recentEnrollments[0]?.userName || recentEnrollments[0]?.userEmail || 'ยังไม่มีข้อมูล';
  const latestStudentDetail = recentEnrollments[0]?.courseTitle ? `ลงทะเบียนใน ${recentEnrollments[0].courseTitle}` : 'ยังไม่มีการลงทะเบียนล่าสุดให้แสดง';
  const focusSummaryItems = [
    {
      label: 'รายได้รวมสะสม',
      value: formatCurrency(revenueStats.totalRevenue),
    },
    {
      label: 'คอร์สทั้งหมด',
      value: `${stats.courses}`,
    },
    {
      label: 'ผู้ใช้ทั้งหมด',
      value: `${stats.users}`,
    },
  ];
  const queueMonitorItems = [
    {
      label: 'รายได้เดือนนี้',
      value: formatCurrency(revenueStats.monthlyRevenue),
      note: 'มอนิเตอร์ยอดชำระเงินสำเร็จของเดือนปัจจุบัน',
      href: '/admin/payments',
      cta: 'เปิดรายได้เดือนนี้',
    },
    {
      label: 'นักเรียนล่าสุด',
      value: latestStudentLabel,
      note: latestStudentDetail,
      href: '/admin/enrollments',
      cta: 'เปิดการลงทะเบียนล่าสุด',
    },
  ];
  const snapshotKpis = [
    {
      label: 'รายได้เดือนนี้',
      value: formatCurrency(revenueStats.monthlyRevenue),
      detail: 'ยอด completed ของเดือนปัจจุบัน',
      tone: '#1d4ed8',
    },
    {
      label: 'รายได้ 7 วัน',
      value: formatCurrency(sevenDayRevenueTotal),
      detail: 'ภาพรวมรายได้ล่าสุดของสัปดาห์นี้',
      tone: '#0f172a',
    },
    {
      label: 'งานค้าง',
      value: `${revenueStats.pendingPayments} รายการ`,
      detail: 'รายการที่ควรเคลียร์ก่อนปล่อยเรียน',
      tone: revenueStats.pendingPayments > 0 ? '#d97706' : '#1d4ed8',
    },
    {
      label: 'อัตราสำเร็จ',
      value: `${paymentSuccessRate.toFixed(1)}%`,
      detail: 'ชำระเงินสำเร็จเทียบกับรายการทั้งหมด',
      tone: paymentSuccessRate >= 70 ? '#2563eb' : paymentSuccessRate >= 40 ? '#d97706' : '#dc2626',
    },
  ];
  const contentHealthItems = [
    {
      label: 'บทเรียน / คอร์ส',
      value: averageLessonsPerCourse,
      detail: 'เช็กความลึกของโครงสร้างเนื้อหา',
      tone: '#2563eb',
    },
    {
      label: 'ลงทะเบียน / คอร์ส',
      value: averageEnrollmentsPerCourse,
      detail: 'ดู demand เฉลี่ยของแต่ละคอร์ส',
      tone: '#ea580c',
    },
    {
      label: 'บทเรียนทั้งหมด',
      value: stats.lessons,
      detail: 'ปริมาณคอนเทนต์ที่มีอยู่ในระบบ',
      tone: '#0f766e',
    },
  ];
  const revenueChart = getLineChartGeometry(sevenDayRevenue.map((item) => item.total));
  const enrollmentChart = getLineChartGeometry(sevenDayEnrollments.map((item) => item.count));
  const revenueStartValue = sevenDayRevenue[0]?.total || 0;
  const revenueLatestValue = sevenDayRevenue[sevenDayRevenue.length - 1]?.total || 0;
  const revenuePeakPoint = sevenDayRevenue.reduce(
    (peak, item) => (item.total > peak.total ? item : peak),
    sevenDayRevenue[0] || { date: '', total: 0 },
  );
  const revenueDelta = revenueLatestValue - revenueStartValue;
  const revenueTrendTone = revenueDelta > 0 ? '#1d4ed8' : revenueDelta < 0 ? '#b45309' : '#475569';
  const revenuePeakIndex = sevenDayRevenue.findIndex((item) => item.date === revenuePeakPoint.date && item.total === revenuePeakPoint.total);
  const enrollmentStartValue = sevenDayEnrollments[0]?.count || 0;
  const enrollmentLatestValue = sevenDayEnrollments[sevenDayEnrollments.length - 1]?.count || 0;
  const enrollmentPeakPoint = sevenDayEnrollments.reduce(
    (peak, item) => (item.count > peak.count ? item : peak),
    sevenDayEnrollments[0] || { date: '', count: 0 },
  );
  const enrollmentDelta = enrollmentLatestValue - enrollmentStartValue;
  const enrollmentTrendTone = enrollmentDelta > 0 ? '#1d4ed8' : enrollmentDelta < 0 ? '#b45309' : '#475569';
  const enrollmentPeakIndex = sevenDayEnrollments.findIndex((item) => item.date === enrollmentPeakPoint.date && item.count === enrollmentPeakPoint.count);
  const lastUpdatedLabel = new Date().toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const revenueTrendLabel = revenueDelta > 0 ? 'Uptrend' : revenueDelta < 0 ? 'Cooling' : 'Stable';
  const enrollmentTrendLabel = enrollmentDelta > 0 ? 'Accelerating' : enrollmentDelta < 0 ? 'Slower' : 'Flat';
  const queueStatusLabel = revenueStats.pendingPayments > 0 ? 'Needs Review' : 'All Clear';

  return (
    <div className="admin-dashboard-shell" style={{ display: 'grid', gap: '18px' }}>
      <div className="admin-dashboard-ambient admin-dashboard-ambient-left" aria-hidden="true" />
      <div className="admin-dashboard-ambient admin-dashboard-ambient-right" aria-hidden="true" />
      <div className="admin-dashboard-grid">
      <section className="admin-dashboard-hero" style={{
        background: '#ffffff',
        border: '1px solid #dbe5f4',
        borderRadius: '22px',
        padding: '18px 20px',
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.05)',
      }}>
        <div className="admin-hero-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.9fr)',
          gap: '18px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Admin Overview
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
                มองภาพรวมธุรกิจจากตัวเลขหลัก งานเร่งด่วน และสัญญาณล่าสุดในจอเดียว
              </div>
            </div>

            <div className="admin-focus-panel" style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 58%, #2563eb 100%)',
              color: 'white',
              borderRadius: '18px',
              padding: '22px 24px',
              display: 'grid',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '208px',
            }}>
              <div style={{ position: 'absolute', inset: 'auto -72px -84px auto', width: '210px', height: '210px', borderRadius: '999px', background: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0))' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '10px' }}>
                <div className="admin-focus-heading" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Today Focus
                  </div>
                  <div className="admin-signal-pill admin-signal-pill-light">Live signal</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1 }}>{formatCurrency(revenueStats.monthlyRevenue)}</div>
                  <div className="admin-signal-pill admin-signal-pill-light">{revenueTrendLabel}</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.84rem', lineHeight: 1.7, maxWidth: '520px' }}>
                  โฟกัสยอดรายได้ของเดือนปัจจุบัน พร้อมกระโดดไปจัดการคิวงานสำคัญที่กระทบการดำเนินงานได้ทันที
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link className="admin-dashboard-action-link" href={topPriorityAction.href} style={{ padding: '10px 14px', borderRadius: '999px', background: '#ffffff', color: '#0f172a', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                    {topPriorityAction.label} →
                  </Link>
                  <div className="admin-live-caption" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.74rem', lineHeight: 1.6 }}>
                    อัปเดตล่าสุด {lastUpdatedLabel}
                  </div>
                </div>
              </div>

              <div className="admin-focus-summary" style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.2)',
              }}>
                {focusSummaryItems.map((item) => (
                  <div key={item.label} className="admin-focus-summary-card">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ color: '#ffffff', fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.12 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-control-panel" style={{
            display: 'grid',
            gap: '14px',
            paddingLeft: '18px',
            borderLeft: '1px solid #e2e8f0',
            alignSelf: 'stretch',
          }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '4px' }}>Priority Queue</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.6 }}>เรียงงานที่ควรเปิดก่อนเพื่อเคลียร์คิวธุรกรรม เนื้อหา หรือสัญญาณที่ต้องตัดสินใจ</div>
            </div>

            <div className="admin-priority-block" style={{ display: 'grid', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                <div style={{ color: '#334155', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Top Priority</div>
                <div className="admin-signal-pill">{queueStatusLabel}</div>
              </div>
              <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700, lineHeight: 1.45 }}>{topPriorityAction.label}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.65 }}>{topPriorityAction.note}</div>
              <Link className="admin-inline-link" href={topPriorityAction.href} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                ดูงานเร่งด่วน →
              </Link>
            </div>

            {queueMonitorItems.map((item) => (
              <div className="admin-monitor-card" key={item.label} style={{ display: 'grid', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ color: '#334155', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="admin-monitor-dot" />
                  Monitor
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                  <div style={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ color: '#1d4ed8', fontSize: '0.86rem', fontWeight: 700, textAlign: 'right' }}>{item.value}</div>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: 1.6 }}>{item.note}</div>
                <Link className="admin-inline-link" href={item.href} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 }}>
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-snapshot-section" style={{
        background: '#ffffff',
        borderRadius: '22px',
        padding: '18px 20px',
        border: '1px solid #dbe5f4',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
        display: 'grid',
        gap: '14px',
      }}>
        <div>
          <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Operational Snapshot
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
            แสดง KPI หลักของระบบและสุขภาพคอนเทนต์ที่ต้องมองเห็นได้ทันทีในมุมมองเดียว
          </div>
        </div>

        <div className="admin-snapshot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '12px' }}>
          {snapshotKpis.map((item, index) => (
            <div key={item.label} className="admin-snapshot-kpi" style={{ gridColumn: 'span 2', padding: '14px 16px', borderRadius: '14px', background: '#f8fbff', border: '1px solid #dbe5f4', display: 'grid', gap: '6px', minWidth: 0 }}>
              <div className="admin-kpi-index">0{index + 1}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', lineHeight: 1.4 }}>{item.label}</div>
              <div style={{ color: item.tone, fontSize: '1.45rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.55 }}>{item.detail}</div>
            </div>
          ))}

          <div className="admin-snapshot-health" style={{ gridColumn: 'span 4', padding: '15px 16px', borderRadius: '14px', background: '#ffffff', border: '1px solid #dbe5f4', display: 'grid', gap: '14px', minWidth: 0 }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.98rem', fontWeight: 700, marginBottom: '4px' }}>Content Health</div>
              <div style={{ color: '#64748b', fontSize: '0.74rem', lineHeight: 1.6 }}>สรุปความหนาแน่นของคอร์สและแรงตอบรับเฉลี่ยในมุมมองเดียว</div>
            </div>
            <div className="admin-snapshot-health-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              {contentHealthItems.map((item) => (
                <div className="admin-health-card" key={item.label} style={{ minWidth: 0, padding: '10px 10px 11px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                  <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '7px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.42rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '5px', lineHeight: 1.5 }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-signal-section" style={{
        background: '#ffffff',
        borderRadius: '22px',
        padding: '18px 20px',
        border: '1px solid #dbe5f4',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
        display: 'grid',
        gap: '14px',
      }}>
        <div className="admin-movement-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.9fr)', gap: '18px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Movement
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
                ดูการเปลี่ยนแปลงของรายได้และการลงทะเบียนใน 7 วันล่าสุดเพื่อจับ momentum ของธุรกิจ
              </div>
            </div>

            <div className="admin-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="admin-chart-panel" style={{ padding: '16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #dbe5f4', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '4px' }}>รายได้ 7 วัน</div>
                    <div style={{ color: '#64748b', fontSize: '0.74rem' }}>รวม {formatCurrency(sevenDayRevenueTotal)}</div>
                  </div>
                  <Link className="admin-inline-link" href="/admin/payments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700 }}>
                    ดูรายได้ →
                  </Link>
                </div>

                <div className="admin-chart-meta" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '4px' }}>ล่าสุด</div>
                    <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 700 }}>{formatCurrency(revenueLatestValue)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '4px' }}>สูงสุด</div>
                    <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 700 }}>{formatCurrency(revenuePeakPoint.total)}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.66rem', marginTop: '2px' }}>{formatShortDate(revenuePeakPoint.date)}</div>
                  </div>
                </div>

                <div className="admin-chart-canvas" style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: '10px', alignItems: 'stretch', padding: '14px 12px 12px', borderRadius: '14px', background: 'linear-gradient(180deg, #fbfdff 0%, #ffffff 100%)', border: '1px solid #e6eefb' }}>
                  <div style={{ display: 'grid', alignItems: 'space-between', color: '#94a3b8', fontSize: '0.65rem' }}>
                    {revenueChart.guideValues.map((value, index) => (
                      <div key={`revenue-guide-${index}-${value}`} style={{ height: `${revenueChart.height / revenueChart.guideValues.length}px`, display: 'flex', alignItems: 'flex-start' }}>
                        {formatCompactCurrency(value)}
                      </div>
                    ))}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <svg viewBox={`0 0 ${revenueChart.width} ${revenueChart.height}`} style={{ width: '100%', height: '160px', display: 'block' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="adminRevenueArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(59,130,246,0.28)" />
                          <stop offset="100%" stopColor="rgba(59,130,246,0.02)" />
                        </linearGradient>
                      </defs>
                      {revenueChart.guideValues.map((_, index) => {
                        const y = (revenueChart.height / (revenueChart.guideValues.length - 1 || 1)) * index;
                        return <line key={`revenue-line-${index}`} x1="0" y1={y} x2={revenueChart.width} y2={y} stroke="#dbe5f4" strokeDasharray="3 5" />;
                      })}
                      <path d={revenueChart.areaPath} fill="url(#adminRevenueArea)" />
                      <path d={revenueChart.linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                      {revenueChart.coordinates.map((point, index) => (
                        <g key={`revenue-point-${sevenDayRevenue[index]?.date || index}`}>
                          <circle cx={point.x} cy={point.y} r={index === revenueChart.coordinates.length - 1 ? '7' : '5'} fill="#ffffff" stroke="#2563eb" strokeWidth={index === revenueChart.coordinates.length - 1 ? '3' : '2'} />
                          {(index === revenueChart.coordinates.length - 1 || (index === revenuePeakIndex && index !== revenueChart.coordinates.length - 1)) && (
                            <text x={point.x} y={Math.max(point.y - 12, 12)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700">
                              {formatCompactCurrency(sevenDayRevenue[index]?.total || 0)}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sevenDayRevenue.length}, minmax(0, 1fr))`, gap: '6px', marginTop: '8px' }}>
                      {sevenDayRevenue.map((item) => (
                        <div key={item.date} style={{ color: '#94a3b8', fontSize: '0.68rem', textAlign: 'center' }}>{formatShortDate(item.date)}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.72rem', lineHeight: 1.6 }}>
                  <div>เส้นแนวโน้มรายได้ 7 วันล่าสุดพร้อมจุดล่าสุดที่ถูกเน้นเป็นพิเศษ</div>
                  <div className="admin-trend-pill" style={{ color: revenueTrendTone }}>แนวโน้ม {formatSignedCompactValue(revenueDelta, '฿')} · {revenueTrendLabel}</div>
                </div>
              </div>

              <div className="admin-chart-panel" style={{ padding: '16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #dbe5f4', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '4px' }}>การลงทะเบียน 7 วัน</div>
                    <div style={{ color: '#64748b', fontSize: '0.74rem' }}>รวม {sevenDayEnrollmentTotal} รายการ</div>
                  </div>
                  <Link className="admin-inline-link" href="/admin/enrollments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700 }}>
                    ดูการลงทะเบียน →
                  </Link>
                </div>

                <div className="admin-chart-meta" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '4px' }}>ล่าสุด</div>
                    <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 700 }}>{enrollmentLatestValue} รายการ</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '4px' }}>สูงสุด</div>
                    <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 700 }}>{enrollmentPeakPoint.count} รายการ</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.66rem', marginTop: '2px' }}>{formatShortDate(enrollmentPeakPoint.date)}</div>
                  </div>
                </div>

                <div className="admin-chart-canvas" style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: '10px', alignItems: 'stretch', padding: '14px 12px 12px', borderRadius: '14px', background: 'linear-gradient(180deg, #fbfdff 0%, #ffffff 100%)', border: '1px solid #e6eefb' }}>
                  <div style={{ display: 'grid', alignItems: 'space-between', color: '#94a3b8', fontSize: '0.65rem' }}>
                    {enrollmentChart.guideValues.map((value, index) => (
                      <div key={`enrollment-guide-${index}-${value}`} style={{ height: `${enrollmentChart.height / enrollmentChart.guideValues.length}px`, display: 'flex', alignItems: 'flex-start' }}>
                        {value}
                      </div>
                    ))}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <svg viewBox={`0 0 ${enrollmentChart.width} ${enrollmentChart.height}`} style={{ width: '100%', height: '160px', display: 'block' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="adminEnrollmentArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(96,165,250,0.24)" />
                          <stop offset="100%" stopColor="rgba(96,165,250,0.03)" />
                        </linearGradient>
                      </defs>
                      {enrollmentChart.guideValues.map((_, index) => {
                        const y = (enrollmentChart.height / (enrollmentChart.guideValues.length - 1 || 1)) * index;
                        return <line key={`enrollment-line-${index}`} x1="0" y1={y} x2={enrollmentChart.width} y2={y} stroke="#dbe5f4" strokeDasharray="3 5" />;
                      })}
                      <path d={enrollmentChart.areaPath} fill="url(#adminEnrollmentArea)" />
                      <path d={enrollmentChart.linePath} fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                      {enrollmentChart.coordinates.map((point, index) => (
                        <g key={`enrollment-point-${sevenDayEnrollments[index]?.date || index}`}>
                          <circle cx={point.x} cy={point.y} r={index === enrollmentChart.coordinates.length - 1 ? '7' : '5'} fill="#ffffff" stroke="#1d4ed8" strokeWidth={index === enrollmentChart.coordinates.length - 1 ? '3' : '2'} />
                          {(index === enrollmentChart.coordinates.length - 1 || (index === enrollmentPeakIndex && index !== enrollmentChart.coordinates.length - 1)) && (
                            <text x={point.x} y={Math.max(point.y - 12, 12)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700">
                              {sevenDayEnrollments[index]?.count || 0}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sevenDayEnrollments.length}, minmax(0, 1fr))`, gap: '6px', marginTop: '8px' }}>
                      {sevenDayEnrollments.map((item) => (
                        <div key={item.date} style={{ color: '#94a3b8', fontSize: '0.68rem', textAlign: 'center' }}>{formatShortDate(item.date)}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.72rem', lineHeight: 1.6 }}>
                  <div>ใช้ดูแรงส่งของการสมัครเรียนในสัปดาห์ล่าสุดและจุดที่ volume สูงสุด</div>
                  <div className="admin-trend-pill" style={{ color: enrollmentTrendTone }}>แนวโน้ม {formatSignedCompactValue(enrollmentDelta)} · {enrollmentTrendLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-quick-access-panel" style={{ paddingLeft: '18px', borderLeft: '1px solid #e2e8f0', display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Quick Access
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
                ทางลัดไปยังพื้นที่ปฏิบัติงานที่ใช้บ่อย พร้อมจังหวะการตัดสินใจที่ชัดเจน
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px', alignContent: 'stretch', gridAutoRows: '1fr' }}>
              {workflowActions.map((action, index) => (
                <Link
                  className="admin-rail-link"
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '14px 14px',
                    minHeight: '64px',
                    height: '100%',
                    borderRadius: '12px',
                    border: index === 0 ? '1px solid #2563eb' : '1px solid #dbe5f4',
                    background: index === 0 ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : '#ffffff',
                    color: index === 0 ? '#ffffff' : '#0f172a',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="admin-action-kicker">{index === 0 ? 'Primary path' : 'Action'}</span>
                    <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '3px' }}>{action.label}</span>
                    <span style={{ display: 'block', color: index === 0 ? 'rgba(255,255,255,0.78)' : '#64748b', fontSize: '0.74rem', lineHeight: 1.55 }}>{action.note}</span>
                  </span>
                  <span style={{ color: index === 0 ? '#ffffff' : '#94a3b8', flexShrink: 0 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="admin-activity-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.9fr)', gap: '18px' }}>
        {/* Recent Enrollments */}
        <section className="admin-activity-section" style={{
          background: '#ffffff',
          borderRadius: '22px',
          border: '1px solid #dbe5f4',
          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Recent Activity</div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>การลงทะเบียนล่าสุด</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.6 }}>ผู้ใช้ที่เพิ่งเข้าสู่คอร์สล่าสุด พร้อมเวลาที่เกิดรายการ</div>
            </div>
            <Link className="admin-inline-link" href="/admin/enrollments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div>
            {recentEnrollments.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                ยังไม่มีการลงทะเบียน
              </div>
            ) : (
              recentEnrollments.map((enrollment) => (
                <div className="admin-activity-row" key={enrollment.id} style={{ padding: '14px 18px', borderBottom: '1px solid #eef4fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div className="admin-avatar-chip" style={{ width: '34px', height: '34px', borderRadius: '999px', background: '#e8f1ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(enrollment.userName || enrollment.userEmail || 'A')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '3px' }}>{enrollment.userName || enrollment.userEmail || 'ไม่ระบุ'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{enrollment.courseTitle}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '4px', justifyItems: 'end', flexShrink: 0 }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{formatDate(enrollment.enrolledAt)}</div>
                    <Link className="admin-inline-link" href="/admin/enrollments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700 }}>
                      ดูรายการ →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Payments */}
        <section className="admin-activity-section" style={{
          background: '#ffffff',
          borderRadius: '22px',
          border: '1px solid #dbe5f4',
          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Transactions</div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>การชำระเงินล่าสุด</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.6 }}>อัปเดตสถานะธุรกรรมล่าสุดและตรวจรายการที่ต้องตามต่อ</div>
            </div>
            <Link className="admin-inline-link" href="/admin/payments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div>
            {recentPayments.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                ยังไม่มีการชำระเงิน
              </div>
            ) : (
              recentPayments.map((payment) => (
                <div className="admin-activity-row" key={payment.id} style={{ padding: '14px 18px', borderBottom: '1px solid #eef4fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div className="admin-avatar-chip" style={{ width: '34px', height: '34px', borderRadius: '999px', background: '#e8f1ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(payment.userName || payment.userEmail || 'A')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '3px' }}>{payment.userName || payment.userEmail || 'ไม่ระบุ'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatCurrency(payment.amount)}{payment.method ? ` · ${payment.method}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '6px', justifyItems: 'end', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ padding: '4px 9px', borderRadius: '50px', fontSize: '0.68rem', fontWeight: 600, ...getStatusStyle(payment.status) }}>
                        {payment.status === 'completed' ? 'สำเร็จ' : payment.status === 'pending' ? 'รอ' : 'ล้มเหลว'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{formatDate(payment.createdAt)}</span>
                    </div>
                    <Link className="admin-inline-link" href={payment.status === 'pending' ? '/admin/payments?status=pending' : '/admin/payments'} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700 }}>
                      ดูรายการ →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <style>{`
        .admin-dashboard-shell {
          position: relative;
          isolation: isolate;
          gap: 20px !important;
          padding: 4px 4px 24px;
        }

        .admin-dashboard-grid {
          position: relative;
          display: grid;
          gap: 22px;
          z-index: 1;
        }

        .admin-signal-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(96, 165, 250, 0.26);
          background: rgba(239, 246, 255, 0.92);
          color: #1d4ed8;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .admin-signal-pill-light {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
        }

        .admin-live-caption,
        .admin-monitor-card,
        .admin-health-card,
        .admin-focus-summary-card,
        .admin-avatar-chip {
          position: relative;
        }

        .admin-live-caption::before {
          content: '';
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 8px;
          border-radius: 999px;
          background: #93c5fd;
          box-shadow: 0 0 0 4px rgba(147, 197, 253, 0.16);
          vertical-align: middle;
        }

        .admin-focus-summary-card {
          padding: 10px 12px;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .admin-monitor-card {
          padding: 12px 12px 14px !important;
          border-radius: 16px;
          border-bottom: none !important;
          background: #ffffff;
          border: 1px solid rgba(203, 213, 225, 0.9);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .admin-monitor-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #2563eb;
          box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.12);
          flex-shrink: 0;
        }

        .admin-kpi-index {
          color: #93a7c2;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-health-card {
          overflow: hidden;
        }

        .admin-trend-pill {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(203, 213, 225, 0.8);
          font-weight: 700;
        }

        .admin-action-kicker {
          display: inline-flex;
          margin-bottom: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: inherit;
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-avatar-chip {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 10px 18px rgba(37, 99, 235, 0.12);
        }

        .admin-dashboard-ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          opacity: 0.22;
          pointer-events: none;
          z-index: 0;
        }

        .admin-dashboard-ambient-left {
          width: 280px;
          height: 280px;
          top: -40px;
          left: -30px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.16), rgba(15, 23, 42, 0));
        }

        .admin-dashboard-ambient-right {
          width: 300px;
          height: 300px;
          top: 240px;
          right: -90px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.14), rgba(15, 23, 42, 0));
        }

        .admin-dashboard-hero,
        .admin-snapshot-section,
        .admin-signal-section,
        .admin-activity-section {
          animation: adminFadeUp 560ms ease both;
        }

        .admin-dashboard-action-link,
        .admin-inline-link,
        .admin-activity-row,
        .admin-control-panel,
        .admin-rail-link,
        .admin-priority-block,
        .admin-chart-panel,
        .admin-snapshot-kpi,
        .admin-snapshot-health,
        .admin-quick-access-panel {
          transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease;
        }

        .admin-dashboard-hero,
        .admin-snapshot-section,
        .admin-signal-section,
        .admin-activity-section {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%) !important;
          border: 1px solid rgba(203, 213, 225, 0.8) !important;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.82) !important;
          backdrop-filter: blur(6px);
        }

        .admin-dashboard-hero::before,
        .admin-snapshot-section::before,
        .admin-signal-section::before,
        .admin-activity-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent 32%);
          pointer-events: none;
        }

        .admin-focus-panel {
          min-height: 240px !important;
          border: 1px solid rgba(96, 165, 250, 0.3) !important;
          box-shadow: 0 22px 40px rgba(29, 78, 216, 0.22);
        }

        .admin-control-panel,
        .admin-quick-access-panel {
          position: relative;
          padding: 20px 0 0 20px !important;
          border-left: 1px solid rgba(226, 232, 240, 0.95) !important;
        }

        .admin-control-panel::before,
        .admin-quick-access-panel::before {
          content: '';
          position: absolute;
          top: 20px;
          bottom: 20px;
          left: 0;
          width: 1px;
          background: linear-gradient(180deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0));
          pointer-events: none;
        }

        .admin-priority-block,
        .admin-chart-panel,
        .admin-snapshot-kpi,
        .admin-snapshot-health,
        .admin-quick-access-panel .admin-rail-link,
        .admin-activity-row {
          backdrop-filter: blur(10px);
        }

        .admin-priority-block,
        .admin-chart-panel,
        .admin-snapshot-kpi,
        .admin-snapshot-health {
          background: #ffffff !important;
          border: 1px solid rgba(203, 213, 225, 0.85) !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .admin-priority-block {
          padding: 16px 16px 18px !important;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff, #f8fbff) !important;
        }

        .admin-snapshot-grid {
          gap: 14px !important;
        }

        .admin-snapshot-kpi {
          position: relative;
          padding: 18px 18px 20px !important;
          min-height: 142px;
          overflow: hidden;
        }

        .admin-snapshot-kpi::after {
          content: '';
          position: absolute;
          inset: auto 16px 16px auto;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0));
          pointer-events: none;
        }

        .admin-snapshot-health {
          padding: 18px 18px 20px !important;
          background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
        }

        .admin-snapshot-health-grid > div,
        .admin-chart-meta > div,
        .admin-chart-canvas {
          background: linear-gradient(180deg, #ffffff, #f8fbff) !important;
          border: 1px solid rgba(219, 234, 254, 0.92) !important;
        }

        .admin-chart-panel {
          padding: 18px !important;
          overflow: hidden;
        }

        .admin-chart-canvas {
          position: relative;
          overflow: hidden;
        }

        .admin-chart-canvas::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(37, 99, 235, 0.03), rgba(255, 255, 255, 0));
          pointer-events: none;
        }

        .admin-rail-link {
          position: relative;
          overflow: hidden;
          border-radius: 16px !important;
          border: 1px solid rgba(203, 213, 225, 0.84) !important;
          background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .admin-rail-link::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0));
          opacity: 0;
          transition: opacity 180ms ease;
          pointer-events: none;
        }

        .admin-rail-link:first-child,
        .admin-rail-link:first-child:hover {
          border-color: rgba(37, 99, 235, 0.5) !important;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
          box-shadow: 0 18px 30px rgba(29, 78, 216, 0.22);
          color: #ffffff !important;
        }

        .admin-rail-link:first-child .admin-action-kicker {
          background: rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.92);
        }

        .admin-activity-section {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)) !important;
        }

        .admin-activity-section > div:first-child {
          position: relative;
          z-index: 1;
          padding: 18px 20px !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.92) !important;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.7));
        }

        .admin-activity-row {
          position: relative;
          z-index: 1;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
        }

        .admin-dashboard-action-link:hover,
        .admin-inline-link:hover {
          transform: translateY(-1px);
        }

        .admin-rail-link:hover {
          transform: translateY(-2px);
          border-color: rgba(96, 165, 250, 0.6) !important;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.1);
        }

        .admin-rail-link:hover::before {
          opacity: 1;
        }

        .admin-control-panel:hover,
        .admin-chart-panel:hover,
        .admin-snapshot-kpi:hover,
        .admin-snapshot-health:hover,
        .admin-quick-access-panel:hover {
          transform: translateY(-1px);
          border-color: rgba(148, 163, 184, 0.88) !important;
        }

        .admin-activity-row:hover {
          background: linear-gradient(90deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98)) !important;
          transform: translateX(1px);
        }

        .admin-dashboard-hero,
        .admin-snapshot-section,
        .admin-signal-section,
        .admin-activity-section,
        .admin-chart-panel,
        .admin-snapshot-kpi,
        .admin-snapshot-health,
        .admin-priority-block,
        .admin-rail-link,
        .admin-activity-row {
          will-change: transform;
        }

        @keyframes adminFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 980px) {
          .admin-dashboard-shell {
            padding-inline: 0;
          }

          .admin-hero-grid,
          .admin-movement-grid,
          .admin-activity-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-control-panel {
            border-left: none !important;
            border-top: 1px solid rgba(191, 219, 254, 0.72);
            padding-left: 0 !important;
            padding-top: 16px !important;
          }

          .admin-control-panel::before,
          .admin-quick-access-panel::before {
            display: none;
          }

          .admin-quick-access-panel {
            border-left: none !important;
            border-top: 1px solid rgba(191, 219, 254, 0.72);
            padding-left: 0 !important;
            padding-top: 16px !important;
          }

          .admin-snapshot-grid > div {
            grid-column: span 6 !important;
          }
        }

        @media (max-width: 720px) {
          .admin-dashboard-shell {
            gap: 18px !important;
            padding-bottom: 16px;
          }

          .admin-dashboard-hero,
          .admin-snapshot-section,
          .admin-signal-section,
          .admin-activity-section {
            padding: 18px !important;
          }

          .admin-focus-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-snapshot-health-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-snapshot-grid > div {
            grid-column: span 12 !important;
          }
        }

        @media (max-width: 560px) {
          .admin-focus-summary,
          .admin-chart-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-dashboard-shell {
            padding-top: 0;
          }

          .admin-chart-meta {
            grid-template-columns: 1fr !important;
          }

          .admin-chart-canvas {
            grid-template-columns: 1fr !important;
          }

          .admin-activity-row {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .admin-activity-row > div:last-child {
            justify-items: flex-start !important;
          }
        }
      `}</style>
      </div>
    </div>

  );
}
