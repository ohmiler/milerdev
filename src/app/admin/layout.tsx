import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import ToastContainer from '@/components/ui/Toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import './admin-theme.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
      className="admin-theme admin-layout-shell"
    >
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch', position: 'relative' }}>
        <AdminSidebar userName={session.user.name || session.user.email || 'Admin'} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <AdminHeader userName={session.user.name || session.user.email || 'Admin'} />

          <main className="admin-main-content">
            {children}
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
