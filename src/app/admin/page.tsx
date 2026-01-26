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
      case 'pending': return { background: '#fef3c7', color: '#d97706' };
      case 'completed': return { background: '#dcfce7', color: '#16a34a' };
      case 'failed': return { background: '#fef2f2', color: '#dc2626' };
      default: return { background: '#f1f5f9', color: '#64748b' };
    }
  };

  return (
    <div>
      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: '24px',
      }}>
        แดชบอร์ด Admin
      </h1>

      {/* Revenue Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white',
        }}>
          <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '8px' }}>
            รายได้ทั้งหมด
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {formatCurrency(revenueStats.totalRevenue)}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white',
        }}>
          <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '8px' }}>
            รายได้เดือนนี้
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {formatCurrency(revenueStats.monthlyRevenue)}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white',
        }}>
          <div style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '8px' }}>
            รอดำเนินการ
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {revenueStats.pendingPayments} รายการ
          </div>
          {revenueStats.pendingPayments > 0 && (
            <Link href="/admin/payments?status=pending" style={{ 
              color: 'white', 
              opacity: 0.9, 
              fontSize: '0.75rem',
              textDecoration: 'underline',
            }}>
              ดูทั้งหมด →
            </Link>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>
            คอร์สทั้งหมด
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>
            {stats.courses}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>
            บทเรียน
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
            {stats.lessons}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>
            ผู้ใช้
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {stats.users}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>
            การลงทะเบียน
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
            {stats.enrollments}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Recent Enrollments */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
              การลงทะเบียนล่าสุด
            </h2>
            <Link href="/admin/enrollments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none' }}>
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
                  padding: '12px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                      {enrollment.userName || enrollment.userEmail || 'ไม่ระบุ'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {enrollment.courseTitle}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
              การชำระเงินล่าสุด
            </h2>
            <Link href="/admin/payments" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none' }}>
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
                  padding: '12px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                      {payment.userName || payment.userEmail || 'ไม่ระบุ'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '50px',
                      fontSize: '0.625rem',
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
      </div>

      {/* Quick Actions */}
      <h2 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#1e293b',
        marginBottom: '16px',
      }}>
        การดำเนินการด่วน
      </h2>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          href="/admin/courses/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          + สร้างคอร์สใหม่
        </Link>
        <Link
          href="/admin/courses"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'white',
            color: '#1e293b',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
          }}
        >
          จัดการคอร์ส
        </Link>
        <Link
          href="/admin/payments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'white',
            color: '#1e293b',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
          }}
        >
          ตรวจสอบการชำระเงิน
        </Link>
        <Link
          href="/admin/users"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'white',
            color: '#1e293b',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
          }}
        >
          จัดการผู้ใช้
        </Link>
      </div>
    </div>
  );
}
