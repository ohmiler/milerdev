import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResetPasswordPage() {
  return (
    <AuthShell
      pageId={'reset-password'}
      variant={'recovery'}
      panelMeta={'Secure recovery'}
      panelTitle={'ตั้งรหัสผ่านใหม่'}
      panelDescription={'กำหนดรหัสผ่านใหม่สำหรับกลับเข้าใช้บัญชี MilerDev'}
      contextMeta={'Restore access'}
      contextTitle={<>ตั้งค่าการเข้าถึงใหม่<br />แล้วกลับไปเรียนต่อ</>}
      contextDescription={'ลิงก์สำหรับตั้งรหัสผ่านมีอายุจำกัด และจะใช้งานไม่ได้หลังตั้งรหัสผ่านใหม่สำเร็จ'}
      evidence={[
        { label: 'Validate link', text: 'ตรวจลิงก์กู้คืนบัญชี' },
        { label: 'New password', text: 'กำหนดรหัสผ่านตามเงื่อนไข' },
        { label: 'Return safely', text: 'กลับไปเข้าสู่ระบบอีกครั้ง' },
      ]}
    >
      <Suspense fallback={<div className="space-y-4" aria-label="กำลังตรวจสอบลิงก์"><Skeleton className="h-5 w-36" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
