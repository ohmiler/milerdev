import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, users, enrollments, lessons, payments } from '@/lib/db/schema';
import { count, desc, eq, sql, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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

export default async function AdminDashboard() {
  const [stats, revenueStats, recentEnrollments, recentPayments, sevenDayRevenue, sevenDayEnrollments, paymentHealth] = await Promise.all([
    getStats(),
    getRevenueStats(),
    getRecentEnrollments(),
    getRecentPayments(),
    getSevenDayRevenue(),
    getSevenDayEnrollmentTrend(),
    getPaymentHealthStats(),
  ]);

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74' };
      case 'completed': return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'failed': return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' };
      default: return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const healthItems = [
    {
      title: 'การชำระเงินรอดำเนินการ',
      value: `${revenueStats.pendingPayments} รายการ`,
      description: revenueStats.pendingPayments > 0 ? 'ควรตรวจสอบเพื่อไม่ให้ดีเลย์การเข้าเรียนของนักเรียน' : 'ไม่มีรายการค้างตรวจในตอนนี้',
      href: '/admin/payments?status=pending',
      accent: revenueStats.pendingPayments > 0 ? '#f59e0b' : '#22c55e',
      cta: revenueStats.pendingPayments > 0 ? 'ตรวจสอบทันที' : 'ดูรายการชำระเงิน',
    },
    {
      title: 'รายได้เดือนนี้',
      value: formatCurrency(revenueStats.monthlyRevenue),
      description: 'ตัวเลขล่าสุดของยอดชำระเงินสำเร็จในเดือนปัจจุบัน',
      href: '/admin/payments',
      accent: '#2563eb',
      cta: 'เปิดรายการชำระเงิน',
    },
    {
      title: 'นักเรียนใหม่ล่าสุด',
      value: recentEnrollments[0]?.userName || recentEnrollments[0]?.userEmail || 'ยังไม่มีข้อมูล',
      description: recentEnrollments[0]?.courseTitle ? `ลงทะเบียนใน ${recentEnrollments[0].courseTitle}` : 'ยังไม่มีการลงทะเบียนล่าสุดให้แสดง',
      href: '/admin/enrollments',
      accent: '#0f766e',
      cta: 'ดูการลงทะเบียนทั้งหมด',
    },
  ];

  const operationalStats = [
    { label: 'คอร์ส', value: stats.courses, tone: '#2563eb', detail: 'โครงสร้างเนื้อหาที่กำลังดูแล' },
    { label: 'บทเรียน', value: stats.lessons, tone: '#0f766e', detail: 'หน่วยการเรียนทั้งหมดในระบบ' },
    { label: 'ผู้ใช้', value: stats.users, tone: '#b45309', detail: 'บัญชีผู้ใช้ที่อยู่ในระบบ' },
    { label: 'ลงทะเบียน', value: stats.enrollments, tone: '#ea580c', detail: 'ความต้องการเรียนที่เกิดขึ้นแล้ว' },
  ];

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
    { href: '/admin/courses/new', label: 'สร้างคอร์สใหม่', note: 'เริ่มงานสร้างคอนเทนต์ใหม่' },
    { href: '/admin/courses', label: 'จัดการคอร์ส', note: 'ตรวจคอร์ส บทเรียน และความพร้อมของเนื้อหา' },
    { href: '/admin/payments', label: 'รายการชำระเงิน', note: 'ติดตามสถานะธุรกรรมและรายการค้าง' },
    { href: '/admin/analytics', label: 'Product Analytics', note: 'ดู funnel และสัญญาณพฤติกรรมล่าสุด' },
    { href: '/admin/reconciliation', label: 'ตรวจ Reconcile', note: 'จัดการรายการที่ยังต้องยืนยัน' },
  ];

  const maxRevenueValue = Math.max(...sevenDayRevenue.map((item) => item.total), 1);
  const maxEnrollmentValue = Math.max(...sevenDayEnrollments.map((item) => item.count), 1);
  const totalPayments = paymentHealth.completed + paymentHealth.pending + paymentHealth.failed;
  const paymentSuccessRate = totalPayments > 0 ? (paymentHealth.completed / totalPayments) * 100 : 0;
  const sevenDayRevenueTotal = sevenDayRevenue.reduce((sum, item) => sum + item.total, 0);
  const sevenDayEnrollmentTotal = sevenDayEnrollments.reduce((sum, item) => sum + item.count, 0);
  const averageLessonsPerCourse = stats.courses > 0 ? (stats.lessons / stats.courses).toFixed(1) : '0.0';
  const averageEnrollmentsPerCourse = stats.courses > 0 ? (stats.enrollments / stats.courses).toFixed(1) : '0.0';
  const paymentMixItems = [
    { label: 'สำเร็จ', value: paymentHealth.completed, color: '#16a34a', bg: '#dcfce7' },
    { label: 'รอดำเนินการ', value: paymentHealth.pending, color: '#c2410c', bg: '#ffedd5' },
    { label: 'ล้มเหลว', value: paymentHealth.failed, color: '#b91c1c', bg: '#fee2e2' },
  ];
  const snapshotItems = [
    {
      label: 'รายได้รวมสะสม',
      value: formatCurrency(revenueStats.totalRevenue),
      detail: 'ยอด completed ทั้งหมดในระบบ',
      tone: '#0f172a',
    },
    {
      label: 'Payment success rate',
      value: `${paymentSuccessRate.toFixed(1)}%`,
      detail: 'สัดส่วน completed เทียบกับ payment ทั้งหมด',
      tone: paymentSuccessRate >= 70 ? '#16a34a' : paymentSuccessRate >= 40 ? '#d97706' : '#dc2626',
    },
    {
      label: 'นักเรียนใหม่ล่าสุด',
      value: recentEnrollments[0]?.userName || recentEnrollments[0]?.userEmail || 'ยังไม่มีข้อมูล',
      detail: recentEnrollments[0]?.courseTitle ? `ลงทะเบียนใน ${recentEnrollments[0].courseTitle}` : 'ยังไม่มีการลงทะเบียนล่าสุดให้แสดง',
      tone: '#0f766e',
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
  const workspaceSignalPills = [
    {
      label: 'รายการค้าง',
      value: `${revenueStats.pendingPayments} รายการ`,
      color: revenueStats.pendingPayments > 0 ? '#c2410c' : '#166534',
      background: revenueStats.pendingPayments > 0 ? '#fff7ed' : '#dcfce7',
      border: revenueStats.pendingPayments > 0 ? '1px solid #fdba74' : '1px solid #86efac',
    },
    {
      label: 'บทเรียน / คอร์ส',
      value: averageLessonsPerCourse,
      color: '#1d4ed8',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
    },
    {
      label: 'นักเรียนล่าสุด',
      value: recentEnrollments[0]?.userName || recentEnrollments[0]?.userEmail || 'ยังไม่มีข้อมูล',
      color: '#0f766e',
      background: '#ecfeff',
      border: '1px solid #99f6e4',
    },
  ];
  const lastUpdatedLabel = new Date().toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="admin-dashboard-shell" style={{ display: 'grid', gap: '24px' }}>
      <section className="admin-dashboard-hero" style={{
        background: 'linear-gradient(180deg, #fbfdff 0%, #f4f8ff 38%, #ffffff 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '28px',
        padding: '26px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                ภาพรวมแอดมิน
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.04, maxWidth: '640px' }}>
                งานเร่งด่วน ตัวเลขสำคัญ และทางลัดหลัก
                <br />
                จากหน้าเดียว
              </h1>
              <p style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.72, maxWidth: '620px' }}>
                เริ่มจากสิ่งที่ต้องตัดสินใจก่อน แล้วค่อยไล่ดูสัญญาณและกิจกรรมล่าสุดโดยไม่ต้องสลับอ่านข้อมูลซ้ำหลายชั้น
              </p>

              <div className="admin-dashboard-pill-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
                {workspaceSignalPills.map((item) => (
                  <div key={item.label} style={{ padding: '9px 12px', borderRadius: '16px', background: item.background, border: item.border, minWidth: '136px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                    <div style={{ color: item.color, fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="admin-focus-panel" style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                borderRadius: '24px',
                padding: '22px',
                display: 'grid',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 'auto -70px -70px auto', width: '180px', height: '180px', borderRadius: '999px', background: 'radial-gradient(circle, rgba(59,130,246,0.18), rgba(59,130,246,0))' }} />
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>รายได้เดือนนี้</div>
                <div style={{ fontSize: '2.16rem', fontWeight: 800, lineHeight: 1.02 }}>{formatCurrency(revenueStats.monthlyRevenue)}</div>
                <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: '0.82rem', lineHeight: 1.7, maxWidth: '520px' }}>
                  ใช้ตัวเลขนี้คู่กับ priority queue เพื่อเริ่มจากงานที่กระทบการดำเนินงานจริงก่อน
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link className="admin-dashboard-action-link" href={topPriorityAction.href} style={{ padding: '10px 13px', borderRadius: '999px', background: 'white', color: '#0f172a', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                    {topPriorityAction.label} →
                  </Link>
                  <Link className="admin-dashboard-action-link" href="/admin/payments" style={{ padding: '10px 13px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'white', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.14)' }}>
                    เปิดรายการชำระเงิน
                  </Link>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.75rem', lineHeight: 1.65 }}>{topPriorityAction.note}</div>
                <div className="admin-focus-summary" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.75rem', marginBottom: '6px' }}>รายได้รวมสะสม</div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.15 }}>{formatCurrency(revenueStats.totalRevenue)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.75rem', marginBottom: '6px' }}>รายการค้าง</div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.15 }}>{revenueStats.pendingPayments} รายการ</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.75rem', marginBottom: '6px' }}>อัตราสำเร็จการชำระเงิน</div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.15 }}>{paymentSuccessRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '14px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(148,163,184,0.24)',
              }}>
                {operationalStats.map((item) => (
                  <div key={item.label} style={{ paddingTop: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.tone, lineHeight: 1.05 }}>{item.value}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '8px', lineHeight: 1.6 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-control-panel" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '24px', padding: '16px', display: 'grid', gap: '14px', backdropFilter: 'blur(8px)', position: 'sticky', top: '24px', alignSelf: 'start' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>ศูนย์ควบคุมงาน</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เริ่มจากงานที่กระทบระบบก่อน แล้วค่อยข้ามไปยังพื้นที่ทำงานถัดไปจาก rail นี้</div>
              <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '8px' }}>อัปเดตล่าสุด {lastUpdatedLabel}</div>
            </div>
            <div className="admin-priority-block" style={{ padding: '13px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: '8px' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  งานเร่งด่วนที่สุด
                </div>
                <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{topPriorityAction.label}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>{topPriorityAction.note}</div>
              </div>
              <Link className="admin-dashboard-action-link" href={topPriorityAction.href} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px', borderRadius: '14px', textDecoration: 'none', background: '#2563eb', color: 'white', fontSize: '0.84rem', fontWeight: 700 }}>
                <span>เปิดงานที่ต้องทำก่อน</span>
                <span>→</span>
              </Link>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {healthItems.slice(1).map((item, index) => (
                <div key={item.title} style={{ padding: index === 0 ? '0' : '12px 0 0', borderTop: index === 0 ? 'none' : '1px solid rgba(226,232,240,0.9)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        {index === 0 ? 'ติดตาม' : 'สัญญาณล่าสุด'}
                      </div>
                      <div style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '6px' }}>{item.title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>{item.description}</div>
                    </div>
                    <div style={{ color: item.accent, fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.2, textAlign: 'right', flexShrink: 0 }}>{item.value}</div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Link className="admin-inline-link" href={item.href} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
                      {item.cta} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(226,232,240,0.9)', display: 'grid', gap: '10px' }}>
              <div style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 700 }}>ทางลัดหลัก</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {workflowActions.slice(0, 3).map((action) => (
                  <Link
                    className="admin-rail-link"
                    key={action.href}
                    href={action.href}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      textDecoration: 'none',
                      color: '#0f172a',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.84rem', marginBottom: '2px' }}>{action.label}</span>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.76rem', lineHeight: 1.6 }}>{action.note}</span>
                    </span>
                    <span style={{ color: '#94a3b8', flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-signal-section" style={{
        background: 'white',
        borderRadius: '24px',
        padding: '26px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 6px 24px rgba(15,23,42,0.04)',
        display: 'grid',
        gap: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>สัญญาณและแนวโน้ม</h2>
            <div style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: 1.7 }}>พื้นที่หลักสำหรับดูการเคลื่อนไหวของรายได้ การลงทะเบียน และสถานะการชำระเงินใน 7 วันล่าสุด</div>
          </div>
          <div style={{ display: 'grid', gap: '6px', justifyItems: 'end' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>7 วันล่าสุด · อัปเดต {lastUpdatedLabel}</div>
            <Link className="admin-inline-link" href="/admin/analytics" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>
              เปิด Product Analytics →
            </Link>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '28px',
          alignItems: 'start',
        }}>
          <div className="admin-signal-main" style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="admin-metric-panel" style={{ padding: '18px 20px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '12px' }}>
                  <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700 }}>รายได้ 7 วัน</div>
                  <div style={{ color: '#2563eb', fontSize: '0.84rem', fontWeight: 700 }}>{formatCurrency(sevenDayRevenueTotal)}</div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {sevenDayRevenue.map((item) => (
                    <div key={item.date}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                        <span style={{ color: '#64748b' }}>{formatShortDate(item.date)}</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                      </div>
                      <div style={{ height: '8px', background: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max((item.total / maxRevenueValue) * 100, item.total > 0 ? 8 : 0)}%`, background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', borderRadius: '999px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-metric-panel" style={{ padding: '18px 20px', borderRadius: '18px', background: '#fffaf5', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '12px' }}>
                  <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700 }}>การลงทะเบียน 7 วัน</div>
                  <div style={{ color: '#ea580c', fontSize: '0.84rem', fontWeight: 700 }}>{sevenDayEnrollmentTotal} รายการ</div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {sevenDayEnrollments.map((item) => (
                    <div key={item.date}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                        <span style={{ color: '#64748b' }}>{formatShortDate(item.date)}</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.count} รายการ</span>
                      </div>
                      <div style={{ height: '8px', background: '#ffedd5', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max((item.count / maxEnrollmentValue) * 100, item.count > 0 ? 8 : 0)}%`, background: 'linear-gradient(90deg, #f59e0b, #ea580c)', borderRadius: '999px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-metric-panel" style={{ padding: '18px 20px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', marginBottom: '10px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700, marginBottom: '4px' }}>สัดส่วนการชำระเงิน</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>อ้างอิงจาก payment ทั้งหมดในระบบ</div>
                </div>
                <div style={{ color: '#0f172a', fontSize: '0.84rem', fontWeight: 700 }}>{totalPayments} รายการ</div>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {paymentMixItems.map((item) => {
                  const width = totalPayments > 0 ? (item.value / totalPayments) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.78rem' }}>
                        <span style={{ color: '#475569', fontWeight: 600 }}>{item.label}</span>
                        <span style={{ color: '#0f172a' }}>{item.value} รายการ</span>
                      </div>
                      <div style={{ height: '8px', background: item.bg, borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${width}%`, background: item.color, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="admin-signal-rail" style={{ display: 'grid', gap: '16px', paddingLeft: '20px', borderLeft: '1px solid #e2e8f0', alignSelf: 'start', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 700 }}>ภาพรวม ณ ตอนนี้</div>
              {snapshotItems.map((item, index) => (
                <div key={item.label} style={{ padding: index === 0 ? '0 0 8px' : '10px 0 8px', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '6px', lineHeight: 1.55 }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div className="admin-metric-panel" style={{ padding: '18px 20px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700, marginBottom: '12px' }}>สุขภาพคอนเทนต์</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {contentHealthItems.map((item, index) => (
                  <div key={item.label} style={{ paddingTop: index === 0 ? '0' : '10px', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ color: item.tone, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '5px', lineHeight: 1.55 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-activity-section" style={{
        background: 'white',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 16px 38px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>กิจกรรมล่าสุด</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ติดตามว่าผู้ใช้เพิ่งลงทะเบียนอะไร และมีรายการชำระเงินใหม่เข้ามาในสถานะใดบ้าง</div>
          </div>
          <div style={{ display: 'grid', gap: '6px', justifyItems: 'end' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>แสดงรายการล่าสุด 5 รายการ · อัปเดต {lastUpdatedLabel}</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link className="admin-inline-link" href="/admin/enrollments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>
                ดูการลงทะเบียนทั้งหมด →
              </Link>
              <Link className="admin-inline-link" href="/admin/payments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>
                ดูการชำระเงินทั้งหมด →
              </Link>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '0',
        }}>
          {/* Recent Enrollments */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  การลงทะเบียนล่าสุด
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>ดูว่ามีนักเรียนคนใดเพิ่งเข้าคอร์สอะไรบ้าง</div>
              </div>
              <Link className="admin-inline-link" href="/admin/enrollments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                ดูทั้งหมด →
              </Link>
            </div>
            <div>
              {recentEnrollments.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  ยังไม่มีการลงทะเบียน
                </div>
              ) : (
                recentEnrollments.map((enrollment) => (
                  <div className="admin-activity-row" key={enrollment.id} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '999px', background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(enrollment.userName || enrollment.userEmail || 'A')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.86rem', marginBottom: '3px' }}>
                          {enrollment.userName || enrollment.userEmail || 'ไม่ระบุ'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                          {enrollment.courseTitle}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '6px', justifyItems: 'end', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatDate(enrollment.enrolledAt)}
                      </div>
                      <Link className="admin-inline-link" href="/admin/enrollments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>
                        เปิดการลงทะเบียน →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div style={{ minWidth: 0, background: 'white' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  การชำระเงินล่าสุด
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>ติดตามรายการใหม่และดูสถานะการชำระเงินจากหน้าเดียว</div>
              </div>
              <Link className="admin-inline-link" href="/admin/payments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                ดูทั้งหมด →
              </Link>
            </div>
            <div>
              {recentPayments.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  ยังไม่มีการชำระเงิน
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div className="admin-activity-row" key={payment.id} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '999px', background: payment.status === 'failed' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : payment.status === 'pending' ? 'linear-gradient(135deg, #ffedd5, #fed7aa)' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: payment.status === 'failed' ? '#b91c1c' : payment.status === 'pending' ? '#c2410c' : '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(payment.userName || payment.userEmail || 'A')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.86rem', marginBottom: '3px' }}>
                          {payment.userName || payment.userEmail || 'ไม่ระบุ'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          {formatCurrency(payment.amount)}
                          {payment.method ? ` · ${payment.method}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '6px', justifyItems: 'end', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{
                          padding: '4px 9px',
                          borderRadius: '50px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          ...getStatusStyle(payment.status),
                        }}>
                          {payment.status === 'completed' ? 'สำเร็จ' : payment.status === 'pending' ? 'รอ' : 'ล้มเหลว'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {formatDate(payment.createdAt)}
                        </span>
                      </div>
                      <Link className="admin-inline-link" href={payment.status === 'pending' ? '/admin/payments?status=pending' : '/admin/payments'} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>
                        ดูรายการนี้ →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .admin-dashboard-hero,
        .admin-signal-section,
        .admin-activity-section,
        .admin-focus-panel,
        .admin-control-panel,
        .admin-metric-panel,
        .admin-priority-block {
          animation: adminFadeUp 560ms ease both;
        }

        .admin-dashboard-action-link,
        .admin-inline-link,
        .admin-activity-row,
        .admin-metric-panel,
        .admin-control-panel,
        .admin-rail-link,
        .admin-priority-block {
          transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease;
        }

        .admin-dashboard-action-link:hover,
        .admin-inline-link:hover {
          transform: translateY(-1px);
        }

        .admin-rail-link:hover {
          transform: translateY(-1px);
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .admin-control-panel:hover,
        .admin-metric-panel:hover {
          transform: translateY(-1px);
          border-color: #cbd5e1;
        }

        .admin-activity-row:hover {
          background: #f8fafc;
        }

        .admin-activity-section > div:last-child > div:last-child {
          border-left: 1px solid #e2e8f0;
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

        @media (max-width: 860px) {
          .admin-activity-section > div:last-child > div:last-child {
            border-left: none;
            border-top: 1px solid #e2e8f0;
          }

          .admin-signal-rail {
            border-left: none !important;
            border-top: 1px solid #e2e8f0;
            padding-left: 0 !important;
            padding-top: 18px;
            position: static !important;
          }

          .admin-control-panel {
            position: static !important;
          }
        }

        @media (max-width: 720px) {
          .admin-dashboard-shell {
            gap: 18px !important;
          }

          .admin-dashboard-hero,
          .admin-signal-section {
            padding: 22px !important;
          }

          .admin-focus-summary {
            grid-template-columns: 1fr !important;
          }

          .admin-dashboard-pill-row > div {
            min-width: calc(50% - 5px) !important;
          }
        }

        @media (max-width: 560px) {
          .admin-dashboard-pill-row > div {
            min-width: 100% !important;
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

  );
}
