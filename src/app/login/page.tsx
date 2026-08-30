import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  return (
    <AuthShell
      pageId={'login'}
      panelTitle={'เข้าสู่ระบบ'}
      panelDescription={'ใช้บัญชี MilerDev เพื่อกลับไปเรียนต่อ'}
    >
      <Suspense fallback={<div className="flex flex-col gap-4" aria-busy="true"><span className="sr-only" role="status" aria-live="polite">กำลังเตรียมแบบฟอร์ม</span><Skeleton aria-hidden="true" className="h-5 w-24" /><Skeleton aria-hidden="true" className="h-11 w-full" /><Skeleton aria-hidden="true" className="h-11 w-full" /></div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
