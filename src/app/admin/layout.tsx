import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import ToastContainer from '@/components/ui/Toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';

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
    <div
      className="admin-layout-shell"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 22%), linear-gradient(180deg, #eef4fb 0%, #f8fafc 36%, #eef3f9 100%)',
      }}
    >
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch', position: 'relative' }}>
        <AdminSidebar userName={session.user.name || session.user.email || 'Admin'} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <AdminHeader userName={session.user.name || session.user.email || 'Admin'} />

          <main className="admin-main-content" style={{ padding: '28px 32px 40px', position: 'relative' }}>
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
      <style>{`
        .admin-layout-shell {
          position: relative;
          overflow-x: clip;
        }

        .admin-layout-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 8%, rgba(37, 99, 235, 0.04), transparent 24%),
            radial-gradient(circle at 92% 24%, rgba(14, 165, 233, 0.04), transparent 18%);
          pointer-events: none;
        }

        .admin-main-content {
          width: 100%;
          max-width: none;
        }

        @media (max-width: 1024px) {
          .admin-main-content {
            padding: 18px 16px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
