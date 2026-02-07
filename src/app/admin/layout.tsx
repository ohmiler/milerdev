import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import ToastContainer from '@/components/ui/Toast';
import AdminHeader from '@/components/admin/AdminHeader';

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
      <AdminHeader userName={session.user.name || session.user.email || 'Admin'} />

      {/* Main Content */}
      <main style={{ padding: '24px' }}>
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
