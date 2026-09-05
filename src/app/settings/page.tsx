import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { eq, sql } from 'drizzle-orm';
import { requireMember } from '@/lib/member-access';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import PasswordSettingsForm from '@/components/settings/PasswordSettingsForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'ตั้งค่า',
  description: 'จัดการการตั้งค่าบัญชีและความปลอดภัยของคุณ',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const member = await requireMember('/settings');

  const [user] = await db
    .select({ hasPassword: sql<number>`${users.passwordHash} is not null` })
    .from(users)
    .where(eq(users.id, member.id))
    .limit(1);

  if (!user) notFound();

  return (
    <LearnerAccountShell
      current="settings"
      title="ตั้งค่าบัญชี"
      description="จัดการข้อมูลที่แสดงในบัญชีและควบคุมความปลอดภัยของการเข้าสู่ระบบ"
    >
      <Card aria-labelledby="account-settings-title">
        <CardHeader>
          <Badge variant="outline">บัญชี</Badge>
          <CardTitle id="account-settings-title">ข้อมูลบัญชี</CardTitle>
          <CardDescription>จัดการชื่อที่แสดงและตรวจสอบข้อมูลประจำบัญชี</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="h-auto w-full justify-between py-4">
            <Link href="/profile">
              <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                <strong>แก้ไขโปรไฟล์</strong>
                <span className="whitespace-normal">เปลี่ยนชื่อที่ใช้ในบัญชีผู้เรียนและตรวจสอบอีเมล</span>
              </span>
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card aria-labelledby="security-settings-title">
        <CardHeader>
          <Badge variant="outline">ความปลอดภัย</Badge>
          <CardTitle id="security-settings-title">การเข้าสู่ระบบ</CardTitle>
          <CardDescription>เปลี่ยนรหัสผ่านสำหรับบัญชีที่เข้าสู่ระบบด้วยอีเมล</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordSettingsForm hasPassword={Boolean(user.hasPassword)} />
        </CardContent>
      </Card>
    </LearnerAccountShell>
  );
}
