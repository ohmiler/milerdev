import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell
      pageId={'login'}
      panelMeta={'Account access'}
      panelTitle={'เข้าสู่ระบบ'}
      panelDescription={'ใช้บัญชี MilerDev เพื่อกลับไปเรียนต่อ'}
    >
      <Suspense fallback={<p aria-live={'polite'}>กำลังเตรียมแบบฟอร์ม...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
