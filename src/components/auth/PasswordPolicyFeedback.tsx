import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getPasswordPolicy } from '@/lib/password-policy';
import { Check, X } from 'lucide-react';

function Requirement({
  passed,
  children,
}: {
  passed: boolean;
  children: string;
}) {
  return (
    <li>
      <Badge variant={passed ? 'secondary' : 'outline'}>
        {passed ? <Check aria-hidden={'true'} /> : <X aria-hidden={'true'} />}
        <span>{children}</span>
        <span>— {passed ? 'ผ่าน' : 'ยังไม่ผ่าน'}</span>
      </Badge>
    </li>
  );
}

export default function PasswordPolicyFeedback({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  const policy = getPasswordPolicy(password);

  return (
    <Card id={id} aria-live={'polite'}>
      <CardHeader>
        <CardTitle>ข้อกำหนดรหัสผ่านใหม่</CardTitle>
        <CardDescription>ใช้วลียาวที่เดายาก เว้นวรรคและภาษาไทยได้ ระบบจะตรวจรหัสผ่านที่พบในข้อมูลรั่วไหลเมื่อส่งคำขอ</CardDescription>
      </CardHeader>
      <CardContent className={'flex flex-col gap-4'}>
        <ul className={'grid gap-2 sm:grid-cols-2'}>
          <Requirement passed={policy.checks.length}>ยาว 15–128 ตัวอักษร</Requirement>
          <Requirement passed={policy.checks.characters}>ไม่มีอักขระควบคุมหรืออักขระที่ไม่สมบูรณ์</Requirement>
        </ul>
      </CardContent>
    </Card>
  );
}
