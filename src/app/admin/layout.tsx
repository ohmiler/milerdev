import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
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
    <div className="admin-theme min-h-screen overflow-x-clip bg-background">
      <div className="relative flex min-h-screen items-stretch">
        <AdminSidebar userName={session.user.name || session.user.email || 'Admin'} />

        <div className="min-w-0 flex-1">
          <AdminHeader userName={session.user.name || session.user.email || 'Admin'} />

          <main className="admin-content w-full p-4 sm:p-6 lg:p-7 xl:p-8">
            <div
              className="admin-route-surface"
              data-admin-route-surface
              data-admin-visual-system="operations-v2"
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
