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
  const stats = await getStats();
  const revenueStats = await getRevenueStats();
  const recentEnrollments = await getRecentEnrollments();
  const recentPayments = await getRecentPayments();

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

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'radial-gradient(circle at top left, rgba(37,99,235,0.16), rgba(255,255,255,0.96) 42%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <div>
              <div style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Admin Control Center
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>
                แดชบอร์ดที่ช่วยให้คุณเห็นทั้งภาพรวมธุรกิจและงานที่ต้องทำต่อทันที
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '760px' }}>
                ตรวจยอดรายได้ สถานะการชำระเงิน การลงทะเบียนล่าสุด และทางลัดไปยังหน้าที่ใช้บ่อยได้จากจุดเดียว โดยจัดลำดับความสำคัญให้ดูง่ายขึ้น
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}>
              <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', borderRadius: '18px', padding: '22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginBottom: '8px' }}>รายได้เดือนนี้</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{formatCurrency(revenueStats.monthlyRevenue)}</div>
                <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.68)', fontSize: '0.8rem' }}>ยอดที่ชำระสำเร็จตั้งแต่ต้นเดือนจนถึงปัจจุบัน</div>
              </div>

              <div style={{ background: revenueStats.pendingPayments > 0 ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: '18px', padding: '22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: '0.78rem', marginBottom: '8px' }}>รายการที่ต้องจับตา</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{revenueStats.pendingPayments} รายการ</div>
                <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.72)', fontSize: '0.8rem' }}>
                  {revenueStats.pendingPayments > 0 ? 'ยังมีรายการชำระเงินรอตรวจสอบ' : 'ไม่มีรายการรอดำเนินการในตอนนี้'}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Link href="/admin/payments?status=pending" style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                    เปิดหน้าตรวจสอบ →
                  </Link>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', color: '#0f172a', borderRadius: '18px', padding: '22px' }}>
                <div style={{ color: '#475569', fontSize: '0.78rem', marginBottom: '8px' }}>รายได้ทั้งหมด</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{formatCurrency(revenueStats.totalRevenue)}</div>
                <div style={{ marginTop: '10px', color: '#64748b', fontSize: '0.8rem' }}>ภาพรวมสะสมของยอดชำระเงินสำเร็จทั้งหมด</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '20px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Needs Attention</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>รายการด้านล่างช่วยให้คุณเริ่มงานที่สำคัญที่สุดก่อน โดยอ้างอิงจากข้อมูลที่มีบนระบบตอนนี้</div>
            </div>
            {healthItems.map((item) => (
              <div key={item.title} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', padding: '16px', boxShadow: '0 12px 28px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
      }}>
        {operationalStats.map((item) => (
          <div key={item.label} style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '8px' }}>{item.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: item.tone, lineHeight: 1.1 }}>{item.value}</div>
          </div>
        ))}
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
