import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is admin
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Admin Header */}
      <header style={{
        background: '#1e293b',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link href="/admin" style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            🛠️ Admin Panel
          </Link>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/admin/courses" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
              transition: 'color 0.2s',
            }}>
              คอร์ส
            </Link>
            <Link href="/admin/users" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              ผู้ใช้
            </Link>
            <Link href="/admin/payments" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              การชำระเงิน
            </Link>
            <Link href="/admin/enrollments" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              การลงทะเบียน
            </Link>
            <Link href="/admin/reports" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              รายงาน
            </Link>
            <Link href="/admin/media" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              ไฟล์สื่อ
            </Link>
            <Link href="/admin/tags" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              แท็ก
            </Link>
            <Link href="/admin/settings" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              ตั้งค่า
            </Link>
            <Link href="/admin/audit-logs" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              Logs
            </Link>
            <Link href="/admin/announcements" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}>
              ประกาศ
            </Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {session.user.name || session.user.email}
          </span>
          <Link href="/" style={{
            color: '#94a3b8',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}>
            กลับหน้าเว็บ
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px' }}>
        {children}
      </main>
    </div>
  );
}
