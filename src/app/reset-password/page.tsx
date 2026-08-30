import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResetPasswordPage() {
  return (
    <AuthShell
      pageId={'reset-password'}
      variant={'recovery'}
      panelTitle={'ตั้งรหัสผ่านใหม่'}
      panelDescription={'กำหนดรหัสผ่านใหม่สำหรับกลับเข้าใช้บัญชี MilerDev'}
      contextTitle={<>ตั้งค่าการเข้าถึงใหม่<br />แล้วกลับไปเรียนต่อ</>}
      contextDescription={'ลิงก์สำหรับตั้งรหัสผ่านมีอายุจำกัด และจะใช้งานไม่ได้หลังตั้งรหัสผ่านใหม่สำเร็จ'}
      evidence={[
        { label: 'ตรวจสอบลิงก์', text: 'ตรวจลิงก์กู้คืนบัญชี' },
        { label: 'รหัสผ่านใหม่', text: 'กำหนดรหัสผ่านตามเงื่อนไข' },
        { label: 'กลับเข้าสู่ระบบ', text: 'กลับไปเข้าสู่ระบบอีกครั้ง' },
      ]}
    >
      <Suspense fallback={<div className="flex flex-col gap-4" aria-busy="true"><span className="sr-only" role="status" aria-live="polite">กำลังตรวจสอบลิงก์</span><Skeleton aria-hidden="true" className="h-5 w-36" /><Skeleton aria-hidden="true" className="h-11 w-full" /><Skeleton aria-hidden="true" className="h-11 w-full" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
