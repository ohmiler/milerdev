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
      contextMeta={'Return to learning'}
      contextTitle={<>กลับมาเรียนต่อ<br />จากจุดที่คุณหยุดไว้</>}
      contextDescription={'เข้าสู่ระบบเพื่อเปิดคอร์ส ดูความคืบหน้า และกลับไปยังบทเรียนถัดไปโดยไม่ต้องเริ่มค้นหาใหม่'}
      evidence={[
        { label: 'Course access', text: 'เปิดคอร์สที่ลงทะเบียนไว้' },
        { label: 'Resume lesson', text: 'กลับไปยังบทเรียนล่าสุด' },
        { label: 'Learning record', text: 'ติดตาม progress และใบประกาศ' },
      ]}
    >
      <Suspense fallback={<p aria-live={'polite'}>กำลังเตรียมแบบฟอร์ม...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
