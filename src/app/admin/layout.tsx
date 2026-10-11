import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/auth/admin-page';
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
  // This check covers the layout's own shell only. A layout does not gate its pages, so every
  // admin server page calls requireAdminPage() itself before reading data.
  const user = await requireAdminPage();
  const userName = user.name || user.email || 'Admin';

  return (
    <div className="admin-theme min-h-screen overflow-x-clip bg-background">
      <div className="relative flex min-h-screen items-stretch">
        <AdminSidebar userName={userName} />

        <div className="min-w-0 flex-1">
          <AdminHeader userName={userName} />

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
