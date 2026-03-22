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
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>
        <AdminSidebar userName={session.user.name || session.user.email || 'Admin'} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <AdminHeader userName={session.user.name || session.user.email || 'Admin'} />

          <main className="admin-main-content" style={{ padding: '24px 28px 32px' }}>
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
      <style>{`
        @media (max-width: 1024px) {
          .admin-main-content {
            padding: 18px 16px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
