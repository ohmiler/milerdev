import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StatusSurface from '@/components/status/StatusSurface';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <StatusSurface
        code="404"
        routeLabel="Route / Missing"
        eyebrow="ไม่พบเส้นทางนี้"
        title="ไม่พบหน้าที่คุณต้องการ"
        description="หน้าที่คุณเปิดอาจถูกย้าย ลบ หรือใช้ URL ที่ไม่ถูกต้อง ลองกลับไปยังจุดเริ่มต้นหรือเลือกดูเส้นทางการเรียนทั้งหมด"
        note="หากเปิดหน้านี้จากลิงก์ภายใน MilerDev คุณสามารถแจ้งเราได้จากหน้าติดต่อ"
      >
        <Link href="/">กลับหน้าหลัก <span aria-hidden="true">→</span></Link>
        <Link href="/courses">ดูคอร์สทั้งหมด</Link>
      </StatusSurface>
      <Footer />
    </>
  );
}
