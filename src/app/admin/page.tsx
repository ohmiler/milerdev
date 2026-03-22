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
      accent: '#8b5cf6',
      cta: 'ดูการลงทะเบียนทั้งหมด',
    },
  ];

  const operationalStats = [
    { label: 'คอร์สทั้งหมด', value: stats.courses, tone: '#2563eb' },
    { label: 'บทเรียน', value: stats.lessons, tone: '#8b5cf6' },
    { label: 'ผู้ใช้', value: stats.users, tone: '#f59e0b' },
    { label: 'การลงทะเบียน', value: stats.enrollments, tone: '#16a34a' },
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

  const focusItems = [
    {
      label: 'ยอดเดือนนี้',
      value: formatCurrency(revenueStats.monthlyRevenue),
      detail: 'อัปเดตล่าสุดจากรายการชำระเงินสำเร็จ',
    },
    {
      label: 'งานเร่งด่วน',
      value: `${revenueStats.pendingPayments} รายการ`,
      detail: revenueStats.pendingPayments > 0 ? 'ควรตรวจสอบทันที' : 'ไม่มีรายการค้างตอนนี้',
    },
    {
      label: 'นักเรียนล่าสุด',
      value: recentEnrollments[0]?.userName || recentEnrollments[0]?.userEmail || 'ยังไม่มีข้อมูล',
      detail: recentEnrollments[0]?.courseTitle || 'รอข้อมูลการลงทะเบียนล่าสุด',
    },
  ];

  const quickActionGroups = [
    {
      title: 'Create',
      description: 'เริ่มงานสร้างคอนเทนต์หรือทรัพยากรใหม่อย่างรวดเร็ว',
      actions: [
        { href: '/admin/courses/new', label: 'สร้างคอร์สใหม่', emphasis: true },
        { href: '/admin/blog', label: 'จัดการบทความ' },
      ],
    },
    {
      title: 'Manage',
      description: 'เข้าถึงหน้าที่ใช้จัดการธุรกรรม ผู้ใช้ และเนื้อหาหลัก',
      actions: [
        { href: '/admin/courses', label: 'จัดการคอร์ส' },
        { href: '/admin/users', label: 'จัดการผู้ใช้' },
        { href: '/admin/enrollments', label: 'ดูการลงทะเบียน' },
      ],
    },
    {
      title: 'Monitor',
      description: 'ดูสถานะธุรกิจ การชำระเงิน และข้อมูลเชิงวิเคราะห์',
      actions: [
        { href: '/admin/payments', label: 'ตรวจสอบการชำระเงิน' },
        { href: '/admin/analytics', label: 'เปิด Product Analytics' },
        { href: '/admin/reconciliation', label: 'ตรวจ Reconcile' },
      ],
    },
  ];

  const maxRevenueValue = Math.max(...sevenDayRevenue.map((item) => item.total), 1);
  const maxEnrollmentValue = Math.max(...sevenDayEnrollments.map((item) => item.count), 1);
  const totalPayments = paymentHealth.completed + paymentHealth.pending + paymentHealth.failed;
  const paymentSuccessRate = totalPayments > 0 ? (paymentHealth.completed / totalPayments) * 100 : 0;
  const sevenDayRevenueTotal = sevenDayRevenue.reduce((sum, item) => sum + item.total, 0);
  const sevenDayEnrollmentTotal = sevenDayEnrollments.reduce((sum, item) => sum + item.count, 0);
  const averageLessonsPerCourse = stats.courses > 0 ? (stats.lessons / stats.courses).toFixed(1) : '0.0';
  const averageEnrollmentsPerCourse = stats.courses > 0 ? (stats.enrollments / stats.courses).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 34%, #fffaf3 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '28px',
        padding: '32px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(320px, 0.95fr)',
          gap: '28px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '22px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Admin Control Center
              </div>
              <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.02, maxWidth: '760px' }}>
                ศูนย์ควบคุมสำหรับตัดสินใจเรื่องธุรกิจ การชำระเงิน และงาน admin ที่ต้องทำตอนนี้
              </h1>
              <p style={{ color: '#334155', fontSize: '0.98rem', lineHeight: 1.85, maxWidth: '720px' }}>
                ดูภาพรวมของรายได้ ความพร้อมของคอร์ส การลงทะเบียนล่าสุด และรายการที่ต้องรีบจัดการจาก composition เดียวที่อ่านง่ายกว่าเดิมและเริ่มงานต่อได้ทันที
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '18px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.25fr) repeat(2, minmax(160px, 0.8fr))',
                gap: '14px',
                alignItems: 'stretch',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: 'white',
                  borderRadius: '22px',
                  padding: '22px',
                  display: 'grid',
                  gap: '12px',
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Today Focus</div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.02 }}>{formatCurrency(revenueStats.monthlyRevenue)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: '0.86rem', lineHeight: 1.7 }}>
                    ยอดที่ชำระสำเร็จในเดือนนี้ พร้อม priority action ที่พาคุณไปยังงานสำคัญที่สุดของวันนี้
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={topPriorityAction.href} style={{ padding: '11px 14px', borderRadius: '999px', background: 'white', color: '#0f172a', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}>
                      {topPriorityAction.label} →
                    </Link>
                    <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem' }}>{topPriorityAction.note}</span>
                  </div>
                </div>

                {focusItems.slice(1).map((item) => (
                  <div key={item.label} style={{
                    padding: '18px 18px 16px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.72)',
                    border: '1px solid rgba(148,163,184,0.22)',
                    display: 'grid',
                    alignContent: 'space-between',
                    gap: '10px',
                  }}>
                    <div style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                    <div style={{ color: '#0f172a', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                    <div style={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6 }}>{item.detail}</div>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '12px',
              }}>
                {operationalStats.map((item) => (
                  <div key={item.label} style={{ padding: '14px 0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.tone, lineHeight: 1.05 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '24px', padding: '22px', display: 'grid', gap: '14px', backdropFilter: 'blur(8px)' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Priority Queue</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เริ่มจากสิ่งที่กระทบการดำเนินงานมากที่สุดก่อน แล้วค่อยไล่ดูภาพรวมส่วนอื่นของระบบ</div>
            </div>
            {healthItems.map((item, index) => (
              <div key={item.title} style={{ borderRadius: '18px', border: '1px solid #e2e8f0', background: index === 0 ? '#fffaf0' : 'white', padding: '16px', boxShadow: '0 12px 28px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      {index === 0 ? 'Top Priority' : index === 1 ? 'Monitor' : 'Recent Signal'}
                    </div>
                    <div style={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>{item.title}</div>
                    <div style={{ color: item.accent, fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.accent, marginTop: '8px', flexShrink: 0 }} />
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7, marginTop: '10px' }}>{item.description}</div>
                <div style={{ marginTop: '12px' }}>
                  <Link href={item.href} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>
                    {item.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
        gap: '16px',
      }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
          <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Content Health</div>
          <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '18px' }}>ดูความหนาแน่นของคอนเทนต์ในระบบแบบเร็ว ๆ เพื่อประเมินว่าคอร์สมีน้ำหนักและความพร้อมมากน้อยแค่ไหน</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>Lessons / Course</div>
              <div style={{ color: '#2563eb', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>{averageLessonsPerCourse}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '6px' }}>เฉลี่ยของบทเรียนต่อคอร์สทั้งหมด</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>Enrollments / Course</div>
              <div style={{ color: '#d97706', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>{averageEnrollmentsPerCourse}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '6px' }}>เฉลี่ยจำนวนผู้เรียนต่อคอร์ส</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>Total Lesson Inventory</div>
              <div style={{ color: '#7c3aed', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>{stats.lessons}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '6px' }}>จำนวนบทเรียนทั้งหมดในระบบ</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
          <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Short-Term Signals</div>
          <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '18px' }}>สรุป momentum ระยะสั้นแบบอ่านเร็ว ก่อนลงไปดูกราฟรายวันด้านล่าง</div>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
              <span style={{ color: '#475569', fontSize: '0.82rem' }}>รายได้ 7 วันล่าสุด</span>
              <span style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(sevenDayRevenueTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
              <span style={{ color: '#475569', fontSize: '0.82rem' }}>การลงทะเบียน 7 วันล่าสุด</span>
              <span style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>{sevenDayEnrollmentTotal} รายการ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
              <span style={{ color: '#475569', fontSize: '0.82rem' }}>Payment success rate</span>
              <span style={{ color: paymentSuccessRate >= 70 ? '#16a34a' : paymentSuccessRate >= 40 ? '#d97706' : '#dc2626', fontSize: '1rem', fontWeight: 700 }}>{paymentSuccessRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Trend Widgets</h2>
          <div style={{ color: '#64748b', fontSize: '0.84rem' }}>สรุป movement ระยะสั้นเพื่อช่วยมอง momentum ของรายได้ การลงทะเบียน และสุขภาพการชำระเงิน</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
            <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>รายได้ 7 วัน</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: '14px' }}>ยอดชำระสำเร็จรายวันในช่วง 7 วันที่ผ่านมา</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {sevenDayRevenue.map((item) => (
                <div key={item.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>{formatShortDate(item.date)}</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((item.total / maxRevenueValue) * 100, item.total > 0 ? 8 : 0)}%`, background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
            <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Enrollment Trend</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: '14px' }}>จำนวนการลงทะเบียนใหม่ต่อวันในช่วง 7 วันที่ผ่านมา</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {sevenDayEnrollments.map((item) => (
                <div key={item.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>{formatShortDate(item.date)}</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.count} รายการ</span>
                  </div>
                  <div style={{ height: '8px', background: '#ede9fe', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((item.count / maxEnrollmentValue) * 100, item.count > 0 ? 8 : 0)}%`, background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)', borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
            <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Payment Health</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: '14px' }}>ภาพรวมสถานะการชำระเงินทั้งหมด เพื่อดูสัดส่วนรายการสำเร็จและรายการที่ต้องติดตาม</div>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px' }}>Success Rate</div>
                <div style={{ color: paymentSuccessRate >= 70 ? '#16a34a' : paymentSuccessRate >= 40 ? '#d97706' : '#dc2626', fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1 }}>
                  {paymentSuccessRate.toFixed(1)}%
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '6px' }}>คิดจาก completed เทียบกับ payment ทั้งหมดในระบบ</div>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { label: 'Completed', value: paymentHealth.completed, color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Pending', value: paymentHealth.pending, color: '#c2410c', bg: '#ffedd5' },
                  { label: 'Failed', value: paymentHealth.failed, color: '#b91c1c', bg: '#fee2e2' },
                ].map((item) => {
                  const width = totalPayments > 0 ? (item.value / totalPayments) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
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
        </div>
      </section>

      <section style={{ display: 'grid', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Quick Actions</h2>
          <div style={{ color: '#64748b', fontSize: '0.84rem' }}>รวมทางลัดที่ใช้บ่อย แยกตามประเภทงานเพื่อให้เข้าหน้าเป้าหมายได้เร็วขึ้น</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {quickActionGroups.map((group) => (
            <div key={group.title} style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{group.title}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: '14px' }}>{group.description}</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {group.actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: action.emphasis ? 'white' : '#0f172a',
                      background: action.emphasis ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f8fafc',
                      border: action.emphasis ? 'none' : '1px solid #e2e8f0',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                    }}
                  >
                    <span>{action.label}</span>
                    <span style={{ opacity: action.emphasis ? 0.92 : 0.5 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
      }}>
        {/* Recent Enrollments */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 16px 38px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
        }}>
        <div style={{
            padding: '18px 20px',
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
            <Link href="/admin/enrollments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div>
            {recentEnrollments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                ยังไม่มีการลงทะเบียน
              </div>
            ) : (
              recentEnrollments.map((enrollment) => (
                <div key={enrollment.id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(enrollment.userName || enrollment.userEmail || 'A')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {enrollment.userName || enrollment.userEmail || 'ไม่ระบุ'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                        {enrollment.courseTitle}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatDate(enrollment.enrolledAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 16px 38px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 20px',
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
            <Link href="/admin/payments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div>
            {recentPayments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                ยังไม่มีการชำระเงิน
              </div>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: payment.status === 'failed' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : payment.status === 'pending' ? 'linear-gradient(135deg, #ffedd5, #fed7aa)' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: payment.status === 'failed' ? '#b91c1c' : payment.status === 'pending' ? '#c2410c' : '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(payment.userName || payment.userEmail || 'A')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {payment.userName || payment.userEmail || 'ไม่ระบุ'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {formatCurrency(payment.amount)}
                        {payment.method ? ` · ${payment.method}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
