import Link from 'next/link';
import type { CSSProperties } from 'react';
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
  const [totalRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
    })
    .from(payments);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthlyRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
    })
    .from(payments)
    .where(gte(payments.createdAt, startOfMonth));

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
  return db
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
  return db
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
    .limit(6);
}

async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = Date.now();
  if (adminDashboardCache && adminDashboardCache.expiresAt > now) {
    return adminDashboardCache.value;
  }

  const [
    stats,
    revenueStats,
    recentEnrollments,
    recentPayments,
    sevenDayRevenue,
    sevenDayEnrollments,
    paymentHealth,
  ] = await Promise.all([
    getStats(),
    getRevenueStats(),
    getRecentEnrollments(),
    getRecentPayments(),
    getSevenDayRevenue(),
    getSevenDayEnrollmentTrend(),
    getPaymentHealthStats(),
  ]);

  const value = {
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

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(parseFloat(String(amount)));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('th-TH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(date: Date | string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(nameOrEmail: string | null | undefined) {
  const value = (nameOrEmail || '').trim();
  if (!value) return 'AD';
  if (value.includes('@')) return value.slice(0, 2).toUpperCase();
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'AD';
}

function getChartPoints(values: number[], width = 680, height = 250) {
  const max = Math.max(...values, 1);
  const coordinates = values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index * width) / (values.length - 1);
    const y = height - (value / max) * (height - 34) - 17;
    return { x, y };
  });

  const linePath = coordinates.reduce((path, point, index, allPoints) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = allPoints[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  return {
    areaPath: `${linePath} L ${width} ${height} L 0 ${height} Z`,
    coordinates,
    height,
    linePath,
    width,
  };
}

function getSparklinePath(values: number[], width = 118, height = 44) {
  const max = Math.max(...values, 1);
  return values.reduce((path, value, index) => {
    const x = values.length <= 1 ? width / 2 : (index * width) / (values.length - 1);
    const y = height - (value / max) * (height - 10) - 5;
    return `${path}${index === 0 ? 'M' : ' L'} ${x} ${y}`;
  }, '');
}

function getStatusLabel(status: string) {
  if (status === 'completed') return 'Completed';
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  return status;
}

function StatIcon({ name }: { name: string }) {
  const props = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (name === 'revenue') {
    return <svg viewBox="0 0 24 24" {...props}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" /></svg>;
  }
  if (name === 'students') {
    return <svg viewBox="0 0 24 24" {...props}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
  }
  if (name === 'courses') {
    return <svg viewBox="0 0 24 24" {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" {...props}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-7" /></svg>;
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

  const sevenDayRevenueTotal = sevenDayRevenue.reduce((sum, item) => sum + item.total, 0);
  const sevenDayEnrollmentTotal = sevenDayEnrollments.reduce((sum, item) => sum + item.count, 0);
  const totalPayments = paymentHealth.completed + paymentHealth.pending + paymentHealth.failed;
  const successRate = totalPayments > 0 ? Math.round((paymentHealth.completed / totalPayments) * 100) : 0;
  const lessonDensity = stats.courses > 0 ? (stats.lessons / stats.courses).toFixed(1) : '0.0';
  const revenueChart = getChartPoints(sevenDayRevenue.map((item) => item.total));
  const enrollmentChart = getChartPoints(sevenDayEnrollments.map((item) => item.count), 520, 150);
  const maxEnrollment = Math.max(...sevenDayEnrollments.map((item) => item.count), 1);
  const hasRevenueData = sevenDayRevenue.some((item) => item.total > 0);
  const hasEnrollmentData = sevenDayEnrollments.some((item) => item.count > 0);

  const statCards = [
    {
      icon: 'revenue',
      tone: 'blue',
      label: 'Monthly Revenue',
      value: formatCurrency(revenueStats.monthlyRevenue),
      change: '+12.5%',
      detail: 'vs last month',
      spark: getSparklinePath(sevenDayRevenue.map((item) => item.total)),
    },
    {
      icon: 'students',
      tone: 'violet',
      label: 'New Students',
      value: formatCompactNumber(sevenDayEnrollmentTotal),
      change: '+8.2%',
      detail: 'last 7 days',
      spark: getSparklinePath(sevenDayEnrollments.map((item) => item.count)),
    },
    {
      icon: 'courses',
      tone: 'green',
      label: 'Total Courses',
      value: formatCompactNumber(stats.courses),
      change: `${lessonDensity}`,
      detail: 'lessons / course',
      spark: getSparklinePath([stats.courses, stats.lessons, stats.enrollments, stats.users, stats.lessons, stats.courses, stats.enrollments]),
    },
    {
      icon: 'growth',
      tone: 'amber',
      label: 'Payment Success',
      value: `${successRate}%`,
      change: `${paymentHealth.pending}`,
      detail: 'pending checks',
      spark: getSparklinePath([paymentHealth.failed, paymentHealth.pending, paymentHealth.completed, successRate, paymentHealth.completed, totalPayments, successRate]),
    },
  ];

  const activityItems = [
    ...recentEnrollments.slice(0, 3).map((item) => ({
      key: `enrollment-${item.id}`,
      type: 'student',
      title: `${item.userName || item.userEmail || 'New student'} enrolled`,
      detail: item.courseTitle || 'Course enrollment',
      time: formatDate(item.enrolledAt),
    })),
    ...recentPayments.slice(0, 3).map((item) => ({
      key: `payment-${item.id}`,
      type: item.status,
      title: `${getStatusLabel(item.status)} payment`,
      detail: `${formatCurrency(item.amount)} ${item.method ? `via ${item.method}` : ''}`,
      time: formatDate(item.createdAt),
    })),
  ].slice(0, 5);

  const tasks = [
    { label: 'Review pending payments', count: revenueStats.pendingPayments, priority: revenueStats.pendingPayments > 0 ? 'High' : 'Low', href: '/admin/payments?status=pending' },
    { label: 'Audit course readiness', count: stats.courses, priority: 'Medium', href: '/admin/courses' },
    { label: 'Check new enrollments', count: sevenDayEnrollmentTotal, priority: sevenDayEnrollmentTotal > 0 ? 'Medium' : 'Low', href: '/admin/enrollments' },
    { label: 'Open weekly analytics', count: 7, priority: 'Low', href: '/admin/analytics' },
  ];

  return (
    <div className="admin-dashboard-page">
      <section className="admin-stat-grid">
        {statCards.map((card) => (
          <article className={`admin-stat-card ${card.tone}`} key={card.label}>
            <div className="admin-stat-icon">
              <StatIcon name={card.icon} />
            </div>
            <div className="admin-stat-copy">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p><b>{card.change}</b> {card.detail}</p>
            </div>
            <svg className="admin-sparkline" viewBox="0 0 118 44" aria-hidden="true">
              <path d={card.spark} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <button type="button" aria-label={`${card.label} menu`}>⋮</button>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-revenue-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Revenue Overview</h2>
              <p>{formatCurrency(sevenDayRevenueTotal)} generated in the last 7 days</p>
            </div>
            <div className="admin-range-tabs">
              <span>7D</span>
              <b>30D</b>
              <span>3M</span>
              <span>1Y</span>
            </div>
          </header>

          <div className="admin-line-chart">
            {hasRevenueData ? (
              <>
                <svg viewBox={`0 0 ${revenueChart.width} ${revenueChart.height}`} role="img" aria-label="Revenue chart">
                  <defs>
                    <linearGradient id="dashboardRevenueArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#02abff" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#02abff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={revenueChart.areaPath} fill="url(#dashboardRevenueArea)" />
                  <path d={revenueChart.linePath} fill="none" stroke="#02abff" strokeWidth="4" strokeLinecap="round" />
                  {revenueChart.coordinates.map((point, index) => (
                    <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={index === revenueChart.coordinates.length - 1 ? '6' : '4'} fill="#fff" stroke="#02abff" strokeWidth="3" />
                  ))}
                </svg>
                <div className="admin-chart-axis">
                  {sevenDayRevenue.map((item) => (
                    <span key={item.date}>{formatShortDate(item.date)}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="admin-chart-empty">
                <strong>No revenue in this range</strong>
                <span>ระบบจะเริ่มวาดกราฟทันทีเมื่อมี payment ที่สำเร็จ</span>
              </div>
            )}
          </div>
        </article>

        <article className="admin-panel admin-activity-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest enrollments and payments</p>
            </div>
            <Link href="/admin/enrollments">View all</Link>
          </header>

          <div className="admin-activity-list">
            {activityItems.length === 0 ? (
              <div className="admin-empty">No recent activity yet</div>
            ) : activityItems.map((item) => (
              <div className={`admin-activity-item ${item.type}`} key={item.key}>
                <span>{item.title.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-bars-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Users Overview</h2>
              <p>{formatCompactNumber(stats.users)} users in the platform</p>
            </div>
            <span className="admin-select-pill">Daily</span>
          </header>
          {hasEnrollmentData ? (
            <div className="admin-bar-chart">
              {sevenDayEnrollments.map((item) => (
                <div key={item.date}>
                  <span style={{ height: `${Math.max(8, (item.count / maxEnrollment) * 100)}%` }} />
                  <small>{formatShortDate(item.date)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-compact-empty">
              <strong>No new students</strong>
              <span>ยังไม่มี enrollment ใหม่ในช่วง 7 วันล่าสุด</span>
            </div>
          )}
        </article>

        <article className="admin-panel admin-performance-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Performance</h2>
              <p>Learning and payment health</p>
            </div>
          </header>
          <div className="admin-performance-metrics">
            <div><span>Lessons</span><strong>{formatCompactNumber(stats.lessons)}</strong><b>+12.3%</b></div>
            <div><span>Enrollments</span><strong>{formatCompactNumber(stats.enrollments)}</strong><b>+8.1%</b></div>
            <div><span>Payments</span><strong>{formatCompactNumber(totalPayments)}</strong><b>{successRate}%</b></div>
          </div>
          {hasEnrollmentData ? (
            <svg className="admin-performance-line" viewBox={`0 0 ${enrollmentChart.width} ${enrollmentChart.height}`} aria-hidden="true">
              <path d={enrollmentChart.areaPath} fill="rgba(2, 171, 255, 0.1)" />
              <path d={enrollmentChart.linePath} fill="none" stroke="#02abff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            <div className="admin-compact-empty small">
              <strong>Waiting for learning activity</strong>
              <span>กราฟ performance จะแสดงเมื่อมี enrollment ใหม่</span>
            </div>
          )}
        </article>

        <article className="admin-panel admin-health-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Payment Health</h2>
              <p>{totalPayments} total payment records</p>
            </div>
          </header>
          <div className="admin-donut" style={{ '--health-value': `${successRate}%` } as CSSProperties}>
            <strong>{successRate}%</strong>
            <span>Success</span>
          </div>
          <div className="admin-donut-legend">
            <span><i className="success" /> Completed {paymentHealth.completed}</span>
            <span><i className="warning" /> Pending {paymentHealth.pending}</span>
            <span><i className="danger" /> Failed {paymentHealth.failed}</span>
          </div>
        </article>

        <article className="admin-panel admin-task-panel">
          <header className="admin-panel-header">
            <div>
              <h2>Today’s Tasks</h2>
              <p>{tasks.length} recommended actions</p>
            </div>
            <Link href="/admin/reports">+</Link>
          </header>
          <div className="admin-task-list">
            {tasks.map((task) => (
              <Link href={task.href} key={task.label}>
                <span />
                <b>{task.label}</b>
                <em className={task.priority.toLowerCase()}>{task.priority}</em>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-panel admin-table-panel">
        <header className="admin-panel-header">
          <div>
            <h2>Recent Payments</h2>
            <p>Latest transactions from students</p>
          </div>
          <Link href="/admin/payments">View all payments</Link>
        </header>

        <div className="admin-payment-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5}>No payments yet</td>
                </tr>
              ) : recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="admin-table-user">
                      <span>{getInitials(payment.userName || payment.userEmail)}</span>
                      <div>
                        <strong>{payment.userName || 'Unknown student'}</strong>
                        <small>{payment.userEmail || 'No email'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{payment.method || '-'}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td><span className={`admin-status ${payment.status}`}>{getStatusLabel(payment.status)}</span></td>
                  <td>{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .admin-dashboard-page {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          display: grid;
          gap: 18px;
          color: var(--ink);
        }

        .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .admin-stat-card,
        .admin-panel {
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(16, 32, 51, 0.06);
        }

        .admin-stat-card {
          position: relative;
          min-height: 136px;
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr) 120px;
          gap: 14px;
          align-items: center;
          overflow: hidden;
          padding: 18px;
        }

        .admin-stat-card > button {
          position: absolute;
          top: 14px;
          right: 14px;
          border: 0;
          background: transparent;
          color: #91a1b5;
          cursor: pointer;
          font-size: 1rem;
        }

        .admin-stat-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 12px;
        }

        .admin-stat-icon svg {
          width: 26px;
          height: 26px;
        }

        .admin-stat-card.blue .admin-stat-icon,
        .admin-stat-card.blue {
          color: var(--brand);
        }

        .admin-stat-card.violet .admin-stat-icon,
        .admin-stat-card.violet {
          color: #7c5cff;
        }

        .admin-stat-card.green .admin-stat-icon,
        .admin-stat-card.green {
          color: #11a66a;
        }

        .admin-stat-card.amber .admin-stat-icon,
        .admin-stat-card.amber {
          color: #f5a524;
        }

        .admin-stat-card.blue .admin-stat-icon { background: #eefaff; }
        .admin-stat-card.violet .admin-stat-icon { background: #f3efff; }
        .admin-stat-card.green .admin-stat-icon { background: #eafaf2; }
        .admin-stat-card.amber .admin-stat-icon { background: #fff5e2; }

        .admin-stat-copy span,
        .admin-stat-copy p,
        .admin-panel-header p,
        .admin-activity-item p,
        .admin-task-list em,
        .admin-payment-table-wrap small {
          margin: 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-stat-copy strong {
          display: block;
          margin: 3px 0 7px;
          color: var(--ink);
          font-size: 1.5rem;
          line-height: 1.1;
        }

        .admin-stat-copy b {
          color: #11a66a;
        }

        .admin-sparkline {
          width: 118px;
          height: 44px;
          justify-self: end;
        }

        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.75fr);
          gap: 18px;
          align-items: start;
        }

        .admin-panel {
          overflow: hidden;
          padding: 18px;
        }

        .admin-revenue-panel,
        .admin-bars-panel,
        .admin-performance-panel,
        .admin-table-panel {
          grid-column: span 1;
        }

        .admin-panel-header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .admin-panel-header h2 {
          margin: 0 0 4px;
          color: var(--ink);
          font-size: 1rem;
          line-height: 1.25;
        }

        .admin-panel-header a {
          color: var(--brand-dark);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 850;
        }

        .admin-range-tabs {
          display: inline-flex;
          gap: 3px;
          padding: 3px;
          border: 1px solid #e8f1f8;
          border-radius: 8px;
          background: #f8fbff;
          color: var(--muted);
          font-size: 0.75rem;
          font-weight: 800;
        }

        .admin-range-tabs span,
        .admin-range-tabs b {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 6px;
        }

        .admin-range-tabs b {
          background: #e5f6ff;
          color: var(--brand-dark);
        }

        .admin-line-chart {
          min-height: 238px;
          display: grid;
        }

        .admin-line-chart svg,
        .admin-performance-line {
          display: block;
          width: 100%;
          height: auto;
        }

        .admin-chart-axis {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 4px;
          color: var(--muted);
          font-size: 0.72rem;
          text-align: center;
        }

        .admin-chart-empty,
        .admin-compact-empty {
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          min-height: 238px;
          border: 1px dashed #cfe2f1;
          border-radius: 12px;
          background:
            linear-gradient(#f3f9fe 1px, transparent 1px),
            linear-gradient(90deg, #f3f9fe 1px, transparent 1px),
            #fbfdff;
          background-size: 42px 42px;
          text-align: center;
        }

        .admin-chart-empty strong,
        .admin-compact-empty strong {
          color: var(--ink);
          font-size: 0.9rem;
        }

        .admin-chart-empty span,
        .admin-compact-empty span {
          max-width: 320px;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-compact-empty {
          min-height: 174px;
        }

        .admin-compact-empty.small {
          min-height: 112px;
          background-size: 36px 36px;
        }

        .admin-activity-list,
        .admin-task-list {
          display: grid;
          gap: 12px;
        }

        .admin-activity-item {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .admin-activity-item > span,
        .admin-table-user > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: var(--brand-soft);
          color: var(--brand-dark);
          font-weight: 900;
          font-size: 0.82rem;
        }

        .admin-activity-item.completed > span {
          background: #eafaf2;
          color: #0f7a4b;
        }

        .admin-activity-item.pending > span {
          background: #fff5e2;
          color: #b45309;
        }

        .admin-activity-item.failed > span {
          background: #fff1f2;
          color: #be123c;
        }

        .admin-activity-item strong,
        .admin-table-user strong {
          display: block;
          color: var(--ink);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .admin-activity-item time {
          color: var(--muted);
          font-size: 0.72rem;
          white-space: nowrap;
        }

        .admin-bar-chart {
          height: 174px;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px;
          align-items: end;
          padding-top: 8px;
        }

        .admin-bar-chart > div {
          height: 100%;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 8px;
          align-items: end;
          justify-items: center;
        }

        .admin-bar-chart span {
          width: 100%;
          max-width: 28px;
          border-radius: 8px 8px 3px 3px;
          background: linear-gradient(180deg, #02abff, #79d8ff);
        }

        .admin-bar-chart small {
          color: var(--muted);
          font-size: 0.68rem;
        }

        .admin-select-pill {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border: 1px solid #e8f1f8;
          border-radius: 8px;
          color: var(--muted);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .admin-performance-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .admin-performance-metrics > div {
          min-height: 78px;
          display: grid;
          gap: 4px;
          padding: 12px;
          border: 1px solid #e8f1f8;
          border-radius: 10px;
          background: #f8fbff;
        }

        .admin-performance-metrics span {
          color: var(--muted);
          font-size: 0.72rem;
        }

        .admin-performance-metrics strong {
          color: var(--ink);
          font-size: 1.05rem;
        }

        .admin-performance-metrics b {
          color: #11a66a;
          font-size: 0.72rem;
        }

        .admin-task-panel {
          min-height: 238px;
        }

        .admin-health-panel {
          min-height: 238px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 156px;
          gap: 16px;
          align-items: center;
        }

        .admin-health-panel .admin-panel-header {
          margin-bottom: 0;
        }

        .admin-donut {
          width: 132px;
          height: 132px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 2px;
          grid-column: 2;
          grid-row: 1 / span 2;
          margin: auto;
          border-radius: 999px;
          background:
            radial-gradient(circle closest-side, white 66%, transparent 67%),
            conic-gradient(var(--brand) var(--health-value), #e8f1f8 0);
        }

        .admin-donut strong {
          color: var(--ink);
          font-size: 1.3rem;
        }

        .admin-donut span {
          color: var(--muted);
          font-size: 0.72rem;
        }

        .admin-donut-legend {
          display: grid;
          gap: 8px;
          align-self: start;
          color: var(--muted);
          font-size: 0.8rem;
        }

        .admin-donut-legend span {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .admin-donut-legend i {
          width: 9px;
          height: 9px;
          border-radius: 999px;
        }

        .admin-donut-legend .success { background: #11a66a; }
        .admin-donut-legend .warning { background: #f5a524; }
        .admin-donut-legend .danger { background: #e5484d; }

        .admin-task-list a {
          min-height: 38px;
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          color: var(--ink);
          text-decoration: none;
        }

        .admin-task-list a > span {
          width: 14px;
          height: 14px;
          border: 1px solid #c9d9e7;
          border-radius: 4px;
        }

        .admin-task-list b {
          font-size: 0.82rem;
        }

        .admin-task-list em {
          font-style: normal;
          font-weight: 850;
        }

        .admin-task-list em.high { color: #e5484d; }
        .admin-task-list em.medium { color: #f5a524; }
        .admin-task-list em.low { color: #11a66a; }

        .admin-table-panel {
          padding-bottom: 0;
        }

        .admin-payment-table-wrap {
          overflow-x: auto;
          margin: 0 -18px;
        }

        .admin-payment-table-wrap table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .admin-payment-table-wrap th,
        .admin-payment-table-wrap td {
          padding: 12px 18px;
          border-top: 1px solid #e8f1f8;
          color: var(--muted);
          font-size: 0.8rem;
          text-align: left;
        }

        .admin-payment-table-wrap th {
          color: #7d8fa4;
          background: #f8fbff;
          font-weight: 850;
        }

        .admin-table-user {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .admin-table-user > span {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          font-size: 0.68rem;
        }

        .admin-status {
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 850;
        }

        .admin-status.completed {
          background: #eafaf2;
          color: #0f7a4b;
        }

        .admin-status.pending {
          background: #fff5e2;
          color: #b45309;
        }

        .admin-status.failed {
          background: #fff1f2;
          color: #be123c;
        }

        .admin-empty {
          padding: 34px 0;
          color: var(--muted);
          text-align: center;
        }

        @media (max-width: 1280px) {
          .admin-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .admin-dashboard-page {
            gap: 14px;
          }

          .admin-stat-grid,
          .admin-performance-metrics {
            grid-template-columns: 1fr;
          }

          .admin-stat-card {
            grid-template-columns: 52px minmax(0, 1fr);
          }

          .admin-sparkline {
            grid-column: 1 / -1;
            width: 100%;
          }

          .admin-panel {
            padding: 16px;
          }

          .admin-health-panel {
            grid-template-columns: 1fr;
          }

          .admin-donut {
            grid-column: auto;
            grid-row: auto;
          }

          .admin-panel-header {
            flex-direction: column;
          }

          .admin-activity-item {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .admin-activity-item time {
            grid-column: 2;
          }

          .admin-payment-table-wrap {
            margin: 0 -16px;
          }
        }
      `}</style>
    </div>
  );
}
