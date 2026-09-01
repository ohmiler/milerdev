import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
        <CardTitle>ความแข็งแกร่งของรหัสผ่าน</CardTitle>
        <CardDescription>{password ? policy.label : 'ยังไม่ได้ระบุ'}</CardDescription>
      </CardHeader>
      <CardContent className={'flex flex-col gap-4'}>
        <Progress value={policy.percentage} aria-label={`ความแข็งแกร่ง ${policy.percentage}%`} />
        <ul className={'grid gap-2 sm:grid-cols-2'}>
          <Requirement passed={policy.checks.length}>อย่างน้อย 8 ตัวอักษร</Requirement>
          <Requirement passed={policy.checks.uppercase}>มีตัวพิมพ์ใหญ่</Requirement>
          <Requirement passed={policy.checks.lowercase}>มีตัวพิมพ์เล็ก</Requirement>
          <Requirement passed={policy.checks.number}>มีตัวเลข</Requirement>
          <Requirement passed={policy.checks.special}>อักขระพิเศษ (แนะนำ)</Requirement>
        </ul>
      </CardContent>
    </Card>
  );
}
