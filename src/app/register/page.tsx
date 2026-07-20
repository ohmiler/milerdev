import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthShell
      pageId={'register'}
      variant={'register'}
      panelMeta={'Create account'}
      panelTitle={'สมัครสมาชิก'}
      panelDescription={'กรอกข้อมูลสำหรับบัญชีผู้เรียน หรือสมัครด้วย Google'}
      contextMeta={'Start learning'}
      contextTitle={<>สร้างบัญชี<br />เพื่อเก็บทุกก้าวที่เรียน</>}
      contextDescription={'บัญชี MilerDev ช่วยจำคอร์ส บทเรียนล่าสุด progress และใบประกาศ เพื่อให้คุณกลับมาเรียนต่อได้โดยไม่เสียจังหวะ'}
      evidence={[
        { label: 'Course access', text: 'เปิดคอร์สที่สมัครไว้จาก dashboard เดียว' },
        { label: 'Learning progress', text: 'บันทึกบทเรียนที่เรียนจบและจุดที่ควรเรียนต่อ' },
        { label: 'Certificates', text: 'เก็บและดาวน์โหลดใบประกาศเมื่อจบหลักสูตร' },
      ]}
    >
      <RegisterForm />
    </AuthShell>
  );
}
