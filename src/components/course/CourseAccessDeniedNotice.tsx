import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CourseAccessDeniedNotice() {
  return (
    <Alert className="mx-auto my-4 max-w-7xl">
      <AlertTitle>ยังเข้าบทเรียนนี้ไม่ได้</AlertTitle>
      <AlertDescription>
        <p>บัญชีนี้ยังไม่มีสิทธิ์เรียนคอร์สนี้ หรือสิทธิ์เรียนถูกระงับอยู่ ดูราคาและวิธีเข้าเรียนได้จากหน้านี้</p>
        <p>
          หากเพิ่งชำระเงินหรือคิดว่าเกิดความผิดพลาด ให้{' '}
          <Link className="underline underline-offset-4" href="/dashboard/payments">ตรวจสอบประวัติการชำระเงิน</Link>
          {' '}หรือ{' '}
          <Link className="underline underline-offset-4" href="/contact">ติดต่อทีมงาน</Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}
