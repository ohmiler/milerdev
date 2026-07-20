import AuthShell from '@/components/auth/AuthShell';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      pageId={'forgot-password'}
      variant={'recovery'}
      panelMeta={'Account recovery'}
      panelTitle={'ลืมรหัสผ่าน?'}
      panelDescription={'กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่'}
      contextMeta={'Recover access'}
      contextTitle={<>กลับเข้าสู่บทเรียน<br />ด้วยขั้นตอนที่ชัดเจน</>}
      contextDescription={'ระบบจะตอบแบบเดียวกันไม่ว่าอีเมลจะมีในระบบหรือไม่ เพื่อช่วยปกป้องข้อมูลบัญชีของผู้เรียน'}
      evidence={[
        { label: 'Request', text: 'ส่งคำขอด้วยอีเมลบัญชี' },
        { label: 'Check inbox', text: 'ตรวจกล่องจดหมายและสแปม' },
        { label: 'Set password', text: 'ใช้ลิงก์เพื่อตั้งรหัสผ่านใหม่' },
      ]}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
