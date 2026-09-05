import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PaymentCancellationNotice() {
  return (
    <Alert className="mx-auto my-4 max-w-7xl">
      <AlertTitle>กลับจากหน้าชำระเงิน</AlertTitle>
      <AlertDescription>
        <p>คุณกลับมายังสินค้าที่เลือกหลังยกเลิกหน้าชำระเงิน สามารถทบทวนรายการและเลือกวิธีชำระเงินใหม่ได้</p>
        <p>การกลับมาหน้านี้ยังไม่ยืนยันผลการชำระเงิน หากมีการหักเงินแล้ว อย่าชำระซ้ำ <Link className="underline underline-offset-4" href="/dashboard/payments">ตรวจสอบประวัติการชำระเงิน</Link></p>
      </AlertDescription>
    </Alert>
  );
}
