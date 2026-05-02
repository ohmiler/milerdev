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
    .limit(5);
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

function getChartPoints(values: number[], width = 560, height = 190) {
  const max = Math.max(...values, 1);
  const coordinates = values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index * width) / (values.length - 1);
    const y = height - (value / max) * (height - 26) - 13;
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

function getStatusLabel(status: string) {
  if (status === 'completed') return 'สำเร็จ';
  if (status === 'pending') return 'รอตรวจ';
  if (status === 'failed') return 'ไม่สำเร็จ';
  return status;
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
  const enrollmentDensity = stats.courses > 0 ? (stats.enrollments / stats.courses).toFixed(1) : '0.0';
  const revenueChart = getChartPoints(sevenDayRevenue.map((item) => item.total));
  const enrollmentChart = getChartPoints(sevenDayEnrollments.map((item) => item.count));
  const latestEnrollment = recentEnrollments[0];
  const priorityHref = revenueStats.pendingPayments > 0 ? '/admin/payments?status=pending' : '/admin/courses';
  const priorityLabel = revenueStats.pendingPayments > 0 ? 'ตรวจรายการชำระเงินที่รออยู่' : 'ตรวจความพร้อมของคอร์ส';
  const priorityDetail = revenueStats.pendingPayments > 0
    ? `${revenueStats.pendingPayments} รายการอาจทำให้ผู้เรียนเข้าเรียนล่าช้า`
    : 'ไม่มีรายการชำระเงินค้างตรวจในตอนนี้';

  const kpis = [
    {
      label: 'รายได้เดือนนี้',
      value: formatCurrency(revenueStats.monthlyRevenue),
      detail: 'ยอดชำระสำเร็จในเดือนปัจจุบัน',
    },
    {
      label: 'รายได้ 7 วัน',
      value: formatCurrency(sevenDayRevenueTotal),
      detail: 'ยอดรวมจากสัปดาห์ล่าสุด',
    },
    {
      label: 'ผู้เรียนใหม่ 7 วัน',
      value: formatCompactNumber(sevenDayEnrollmentTotal),
      detail: 'การลงทะเบียนล่าสุด',
    },
    {
      label: 'อัตราชำระสำเร็จ',
      value: `${successRate}%`,
      detail: `${paymentHealth.completed}/${totalPayments || 0} รายการสำเร็จ`,
    },
  ];

  const libraryStats = [
    { label: 'คอร์ส', value: stats.courses, href: '/admin/courses' },
    { label: 'บทเรียน', value: stats.lessons, href: '/admin/courses' },
    { label: 'ผู้ใช้', value: stats.users, href: '/admin/users' },
    { label: 'ลงทะเบียน', value: stats.enrollments, href: '/admin/enrollments' },
  ];

  const quickActions = [
    { href: '/admin/courses/new', label: 'สร้างคอร์สใหม่', detail: 'เริ่มโครงสร้างคอร์สและบทเรียน' },
    { href: '/admin/payments', label: 'จัดการการชำระเงิน', detail: 'ดูสถานะและรายการที่ต้องตามต่อ' },
    { href: '/admin/analytics', label: 'ดู Analytics', detail: 'อ่านแนวโน้มรายได้และผู้เรียน' },
    { href: '/admin/reconciliation', label: 'Reconcile', detail: 'ตรวจรายการที่ยังไม่ตรงกัน' },
  ];

  return (
    <div className="admin-redesign-page">
      <section className="admin-redesign-hero">
        <div className="admin-hero-copy">
          <span className="admin-kicker">Admin cockpit</span>
          <h1>ภาพรวมระบบเรียนออนไลน์</h1>
          <p>
            ดูสถานะรายได้ งานค้าง ความพร้อมของคอร์ส และกิจกรรมล่าสุดในหน้าเดียว
            เพื่อให้ตัดสินใจได้เร็วขึ้นโดยไม่ต้องไล่เปิดหลายเมนู
          </p>
        </div>

        <div className="admin-priority-panel">
          <span className={revenueStats.pendingPayments > 0 ? 'admin-status-dot warning' : 'admin-status-dot'} />
          <div>
            <div className="admin-priority-label">งานที่ควรทำต่อ</div>
            <h2>{priorityLabel}</h2>
            <p>{priorityDetail}</p>
          </div>
          <Link href={priorityHref} className="admin-primary-action">
            เปิดงาน
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="admin-kpi-grid" aria-label="ตัวชี้วัดหลัก">
        {kpis.map((item, index) => (
          <article className="admin-kpi-card" key={item.label}>
            <div className="admin-card-index">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <span>{item.detail}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="admin-main-grid">
        <section className="admin-chart-section">
          <div className="admin-section-title">
            <div>
              <span className="admin-kicker">Revenue signal</span>
              <h2>รายได้ 7 วันล่าสุด</h2>
            </div>
            <Link href="/admin/payments" className="admin-text-link">ดูรายการชำระเงิน</Link>
          </div>

          <div className="admin-chart-card">
            <svg viewBox={`0 0 ${revenueChart.width} ${revenueChart.height}`} role="img" aria-label="กราฟรายได้ 7 วัน">
              <defs>
                <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#02abff" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#02abff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={revenueChart.areaPath} fill="url(#revenueArea)" />
              <path d={revenueChart.linePath} fill="none" stroke="#02abff" strokeWidth="4" strokeLinecap="round" />
              {revenueChart.coordinates.map((point) => (
                <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#02abff" strokeWidth="3" />
              ))}
            </svg>
            <div className="admin-chart-labels">
              {sevenDayRevenue.map((item) => (
                <span key={item.date}>{formatShortDate(item.date)}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="admin-side-stack">
          <section className="admin-library-card">
            <div className="admin-section-title compact">
              <div>
                <span className="admin-kicker">Library</span>
                <h2>คลังคอร์ส</h2>
              </div>
            </div>
            <div className="admin-library-grid">
              {libraryStats.map((item) => (
                <Link href={item.href} key={item.label} className="admin-library-item">
                  <span>{item.label}</span>
                  <strong>{formatCompactNumber(Number(item.value))}</strong>
                </Link>
              ))}
            </div>
            <div className="admin-density-row">
              <div>
                <span>บทเรียน / คอร์ส</span>
                <strong>{lessonDensity}</strong>
              </div>
              <div>
                <span>ลงทะเบียน / คอร์ส</span>
                <strong>{enrollmentDensity}</strong>
              </div>
            </div>
          </section>

          <section className="admin-health-card">
            <div className="admin-section-title compact">
              <div>
                <span className="admin-kicker">Payment health</span>
                <h2>สถานะธุรกรรม</h2>
              </div>
            </div>
            <div className="admin-health-meter" style={{ '--health-value': `${successRate}%` } as React.CSSProperties}>
              <span>{successRate}%</span>
            </div>
            <div className="admin-health-list">
              <span><b className="success" />สำเร็จ {paymentHealth.completed}</span>
              <span><b className="warning" />รอตรวจ {paymentHealth.pending}</span>
              <span><b className="danger" />ไม่สำเร็จ {paymentHealth.failed}</span>
            </div>
          </section>
        </aside>
      </div>

      <div className="admin-bottom-grid">
        <section className="admin-activity-card">
          <div className="admin-section-title">
            <div>
              <span className="admin-kicker">Students</span>
              <h2>การลงทะเบียนล่าสุด</h2>
            </div>
            <Link href="/admin/enrollments" className="admin-text-link">ดูทั้งหมด</Link>
          </div>

          <div className="admin-activity-list">
            {recentEnrollments.length === 0 ? (
              <div className="admin-empty-state">ยังไม่มีการลงทะเบียนล่าสุด</div>
            ) : (
              recentEnrollments.map((enrollment) => (
                <div className="admin-activity-row" key={enrollment.id}>
                  <div className="admin-avatar">{getInitials(enrollment.userName || enrollment.userEmail)}</div>
                  <div className="admin-activity-copy">
                    <strong>{enrollment.userName || enrollment.userEmail || 'ไม่ระบุชื่อ'}</strong>
                    <span>{enrollment.courseTitle || 'ไม่ระบุคอร์ส'}</span>
                  </div>
                  <time>{formatDate(enrollment.enrolledAt)}</time>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-activity-card">
          <div className="admin-section-title">
            <div>
              <span className="admin-kicker">Transactions</span>
              <h2>การชำระเงินล่าสุด</h2>
            </div>
            <Link href="/admin/payments" className="admin-text-link">ดูทั้งหมด</Link>
          </div>

          <div className="admin-activity-list">
            {recentPayments.length === 0 ? (
              <div className="admin-empty-state">ยังไม่มีการชำระเงินล่าสุด</div>
            ) : (
              recentPayments.map((payment) => (
                <div className="admin-activity-row" key={payment.id}>
                  <div className="admin-avatar">{getInitials(payment.userName || payment.userEmail)}</div>
                  <div className="admin-activity-copy">
                    <strong>{payment.userName || payment.userEmail || 'ไม่ระบุชื่อ'}</strong>
                    <span>{formatCurrency(payment.amount)}{payment.method ? ` · ${payment.method}` : ''}</span>
                  </div>
                  <div className="admin-payment-meta">
                    <span className={`admin-payment-badge ${payment.status}`}>{getStatusLabel(payment.status)}</span>
                    <time>{formatDate(payment.createdAt)}</time>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="admin-action-strip">
        <div>
          <span className="admin-kicker">Quick access</span>
          <h2>ทางลัดงานประจำ</h2>
        </div>
        <div className="admin-action-grid">
          {quickActions.map((action) => (
            <Link href={action.href} className="admin-action-card" key={action.href}>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-mobile-chart">
        <div className="admin-section-title">
          <div>
            <span className="admin-kicker">Enrollment signal</span>
            <h2>ผู้เรียนใหม่ 7 วัน</h2>
          </div>
          <strong>{sevenDayEnrollmentTotal}</strong>
        </div>
        <div className="admin-chart-card slim">
          <svg viewBox={`0 0 ${enrollmentChart.width} ${enrollmentChart.height}`} role="img" aria-label="กราฟผู้เรียนใหม่ 7 วัน">
            <path d={enrollmentChart.areaPath} fill="rgba(17, 166, 106, 0.12)" />
            <path d={enrollmentChart.linePath} fill="none" stroke="#11a66a" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <style>{`
        .admin-redesign-page {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          --surface: #ffffff;
          display: grid;
          gap: 18px;
          color: var(--ink);
        }

        .admin-redesign-hero,
        .admin-kpi-card,
        .admin-chart-section,
        .admin-library-card,
        .admin-health-card,
        .admin-activity-card,
        .admin-action-strip,
        .admin-mobile-chart {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-redesign-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
          gap: 18px;
          align-items: stretch;
          border-radius: 18px;
          padding: 22px;
          background:
            linear-gradient(135deg, rgba(238, 250, 255, 0.9), rgba(255, 255, 255, 0.98) 46%),
            #ffffff;
        }

        .admin-hero-copy {
          display: grid;
          gap: 10px;
          align-content: center;
          min-height: 210px;
        }

        .admin-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-hero-copy h1,
        .admin-section-title h2,
        .admin-priority-panel h2,
        .admin-action-strip h2 {
          margin: 0;
          color: var(--ink);
          line-height: 1.22;
        }

        .admin-hero-copy h1 {
          max-width: 720px;
          font-size: clamp(2rem, 4vw, 3.6rem);
          letter-spacing: 0;
        }

        .admin-hero-copy p,
        .admin-priority-panel p {
          max-width: 680px;
          margin: 0;
          color: var(--muted);
          font-size: 0.96rem;
          line-height: 1.8;
        }

        .admin-priority-panel {
          display: grid;
          align-content: space-between;
          gap: 20px;
          padding: 20px;
          border-radius: 14px;
          background: #0b1220;
          color: #ffffff;
        }

        .admin-priority-panel h2 {
          color: #ffffff;
          font-size: 1.35rem;
          margin: 6px 0;
        }

        .admin-priority-panel p,
        .admin-priority-label {
          color: #b8c7dc;
        }

        .admin-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #11a66a;
          box-shadow: 0 0 0 5px rgba(17, 166, 106, 0.16);
        }

        .admin-status-dot.warning {
          background: #f5a524;
          box-shadow: 0 0 0 5px rgba(245, 165, 36, 0.18);
        }

        .admin-primary-action,
        .admin-text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          text-decoration: none;
          font-weight: 800;
        }

        .admin-primary-action {
          min-height: 44px;
          padding: 0 16px;
          border-radius: 8px;
          background: var(--brand);
          color: #ffffff;
        }

        .admin-text-link {
          color: var(--brand-dark);
          font-size: 0.84rem;
        }

        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-kpi-card {
          display: grid;
          gap: 18px;
          min-height: 150px;
          padding: 18px;
          border-radius: 14px;
        }

        .admin-card-index {
          color: #a6b5c5;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .admin-kpi-card p,
        .admin-kpi-card span {
          margin: 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-kpi-card strong {
          display: block;
          margin: 4px 0 8px;
          color: var(--ink);
          font-size: clamp(1.35rem, 2vw, 1.8rem);
          line-height: 1.18;
        }

        .admin-main-grid,
        .admin-bottom-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.85fr);
          gap: 18px;
          align-items: start;
        }

        .admin-chart-section,
        .admin-library-card,
        .admin-health-card,
        .admin-activity-card,
        .admin-action-strip,
        .admin-mobile-chart {
          border-radius: 16px;
          padding: 20px;
        }

        .admin-section-title {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .admin-section-title.compact {
          margin-bottom: 14px;
        }

        .admin-section-title h2,
        .admin-action-strip h2 {
          margin-top: 4px;
          font-size: 1.08rem;
        }

        .admin-chart-card {
          overflow: hidden;
          padding: 16px;
          border: 1px solid #e8f1f8;
          border-radius: 12px;
          background:
            linear-gradient(#f7fbff 1px, transparent 1px),
            linear-gradient(90deg, #f7fbff 1px, transparent 1px),
            #ffffff;
          background-size: 100% 48px, 48px 100%, auto;
        }

        .admin-chart-card svg {
          display: block;
          width: 100%;
          height: auto;
        }

        .admin-chart-card.slim {
          padding: 10px;
        }

        .admin-chart-labels {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 8px;
          color: var(--muted);
          font-size: 0.72rem;
          text-align: center;
        }

        .admin-side-stack {
          display: grid;
          gap: 18px;
        }

        .admin-library-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .admin-library-item {
          min-height: 86px;
          padding: 14px;
          border: 1px solid #e8f1f8;
          border-radius: 10px;
          background: #f7fbff;
          color: var(--ink);
          text-decoration: none;
        }

        .admin-library-item span,
        .admin-density-row span {
          display: block;
          color: var(--muted);
          font-size: 0.78rem;
        }

        .admin-library-item strong {
          display: block;
          margin-top: 8px;
          font-size: 1.55rem;
          line-height: 1;
        }

        .admin-density-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .admin-density-row > div {
          padding: 12px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e8f1f8;
        }

        .admin-density-row strong {
          display: block;
          margin-top: 6px;
          font-size: 1.25rem;
        }

        .admin-health-meter {
          display: grid;
          place-items: center;
          width: 148px;
          height: 148px;
          margin: 4px auto 16px;
          border-radius: 999px;
          background:
            radial-gradient(circle closest-side, white 68%, transparent 69%),
            conic-gradient(var(--brand) var(--health-value), #e8f1f8 0);
        }

        .admin-health-meter span {
          color: var(--ink);
          font-size: 1.65rem;
          font-weight: 800;
        }

        .admin-health-list {
          display: grid;
          gap: 8px;
          color: var(--muted);
          font-size: 0.82rem;
        }

        .admin-health-list span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-health-list b {
          width: 9px;
          height: 9px;
          border-radius: 999px;
        }

        .admin-health-list .success { background: #11a66a; }
        .admin-health-list .warning { background: #f5a524; }
        .admin-health-list .danger { background: #e5484d; }

        .admin-activity-list {
          display: grid;
        }

        .admin-activity-row {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          min-height: 68px;
          padding: 12px 0;
          border-top: 1px solid #e8f1f8;
        }

        .admin-avatar {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: var(--brand-soft);
          color: var(--brand-dark);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .admin-activity-copy {
          min-width: 0;
        }

        .admin-activity-copy strong,
        .admin-activity-copy span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-activity-copy strong {
          color: var(--ink);
          font-size: 0.88rem;
        }

        .admin-activity-copy span,
        .admin-activity-row time {
          color: var(--muted);
          font-size: 0.76rem;
        }

        .admin-payment-meta {
          display: grid;
          gap: 5px;
          justify-items: end;
        }

        .admin-payment-badge {
          display: inline-flex;
          min-height: 24px;
          align-items: center;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .admin-payment-badge.completed {
          background: #eefbf3;
          color: #0f7a4b;
        }

        .admin-payment-badge.pending {
          background: #fff7ed;
          color: #b45309;
        }

        .admin-payment-badge.failed {
          background: #fff1f2;
          color: #be123c;
        }

        .admin-empty-state {
          padding: 28px 0;
          color: var(--muted);
          text-align: center;
          border-top: 1px solid #e8f1f8;
        }

        .admin-action-strip {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .admin-action-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .admin-action-card {
          min-height: 100px;
          padding: 14px;
          border: 1px solid #e8f1f8;
          border-radius: 10px;
          color: var(--ink);
          text-decoration: none;
          background: #f7fbff;
          transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
        }

        .admin-action-card:hover,
        .admin-library-item:hover {
          transform: translateY(-2px);
          border-color: rgba(2, 171, 255, 0.42);
          background: #ffffff;
        }

        .admin-action-card strong,
        .admin-action-card span {
          display: block;
        }

        .admin-action-card strong {
          margin-bottom: 7px;
          font-size: 0.9rem;
        }

        .admin-action-card span {
          color: var(--muted);
          font-size: 0.76rem;
          line-height: 1.55;
        }

        .admin-mobile-chart {
          display: none;
        }

        @media (max-width: 1180px) {
          .admin-kpi-grid,
          .admin-action-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-redesign-hero,
          .admin-main-grid,
          .admin-bottom-grid,
          .admin-action-strip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .admin-redesign-page {
            gap: 14px;
          }

          .admin-redesign-hero,
          .admin-chart-section,
          .admin-library-card,
          .admin-health-card,
          .admin-activity-card,
          .admin-action-strip,
          .admin-mobile-chart {
            padding: 16px;
            border-radius: 14px;
          }

          .admin-kpi-grid,
          .admin-library-grid,
          .admin-density-row,
          .admin-action-grid {
            grid-template-columns: 1fr;
          }

          .admin-hero-copy {
            min-height: unset;
          }

          .admin-activity-row {
            grid-template-columns: 40px minmax(0, 1fr);
          }

          .admin-activity-row time,
          .admin-payment-meta {
            grid-column: 2;
            justify-items: start;
          }

          .admin-section-title {
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-mobile-chart {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
