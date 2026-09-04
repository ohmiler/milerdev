import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StatusSurface from '@/components/status/StatusSurface';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <StatusSurface
        code={'404'}
        routeLabel={'Route / Missing'}
        title={'ไม่พบหน้าที่คุณต้องการ'}
        description={'ลิงก์อาจถูกเปลี่ยน หรือ URL อาจพิมพ์ไม่ครบ คุณสามารถเลือกดูคอร์สทั้งหมดหรือกลับไปเริ่มจากหน้าแรก'}
        note={'หากเปิดหน้านี้จากลิงก์ภายใน MilerDev โปรดแจ้งทีมเพื่อให้เราตรวจสอบลิงก์นั้น'}
      >
        <Button asChild>
          <Link href={'/courses'}>ดูคอร์สทั้งหมด</Link>
        </Button>
        <Button asChild variant={'outline'}>
          <Link href={'/'}>กลับหน้าแรก</Link>
        </Button>
        <Button asChild variant={'link'}>
          <Link href={'/contact'}>ติดต่อทีม</Link>
        </Button>
      </StatusSurface>
      <Footer />
    </>
  );
}
