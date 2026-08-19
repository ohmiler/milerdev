import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthShell
      pageId={'register'}
      variant={'register'}
      panelTitle={'สมัครสมาชิก'}
      panelDescription={'กรอกข้อมูลสำหรับบัญชีผู้เรียน หรือสมัครด้วย Google'}
    >
      <RegisterForm />
    </AuthShell>
  );
}
