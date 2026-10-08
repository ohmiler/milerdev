import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, count, eq, sql } from 'drizzle-orm';
import { requireMember } from '@/lib/auth/member-access';
import { db } from '@/lib/db';
import { accounts, users, enrollments } from '@/lib/db/schema';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import PasswordSettingsForm from '@/components/settings/PasswordSettingsForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = {
  title: 'บัญชีของฉัน',
  description: 'จัดการชื่อในบัญชีและการเข้าสู่ระบบของคุณ',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function getAccount(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      hasPassword: sql<number>`${users.passwordHash} is not null`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const [[enrollmentStats], [google]] = await Promise.all([
    db.select({ count: count() }).from(enrollments).where(eq(enrollments.userId, userId)),
    db.select({ count: count() }).from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google'))),
  ]);

  return {
    ...user,
    hasPassword: Boolean(user.hasPassword),
    signsInWithGoogle: (google?.count ?? 0) > 0,
    totalEnrollments: enrollmentStats?.count || 0,
  };
}

function getRoleLabel(role: string) {
  if (role === 'admin') return 'ผู้ดูแลระบบ';
  if (role === 'instructor') return 'ผู้สอน';
  return 'ผู้เรียน';
}

export default async function ProfilePage() {
  const member = await requireMember('/profile');
  const account = await getAccount(member.id);
  if (!account) notFound();

  const memberSince = account.createdAt
    ? new Date(account.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })
    : '-';

  return (
    <LearnerAccountShell
      current="profile"
      title="บัญชีของฉัน"
      description="ชื่อที่ใช้ในบัญชีและบนใบรับรอง และวิธีเข้าสู่ระบบของคุณ"
    >
      {/* One page for who you are and how you sign in; the old settings page redirects here. */}
      <div className="flex flex-col gap-6">
        <Card aria-labelledby="profile-identity-title">
          <CardHeader>
            {/* CardHeader is a grid, so the photo and the name share a row of their own. */}
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt={account.name || 'รูปโปรไฟล์ผู้ใช้'} />}
                <AvatarFallback aria-hidden>{account.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle id="profile-identity-title">{account.name || 'ไม่ระบุชื่อ'}</CardTitle>
                <CardDescription className="break-all">{account.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3" aria-label="ข้อมูลสรุปบัญชี">
              <div><dt className="text-sm text-muted-foreground">คอร์สที่ลงทะเบียน</dt><dd className="font-semibold">{account.totalEnrollments}</dd></div>
              <div><dt className="text-sm text-muted-foreground">ประเภทบัญชี</dt><dd className="font-semibold">{getRoleLabel(account.role)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">สมาชิกตั้งแต่</dt><dd className="font-semibold">{memberSince}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card aria-labelledby="edit-profile-title">
          <CardHeader>
            <CardTitle id="edit-profile-title">ชื่อในบัญชี</CardTitle>
            <CardDescription>ชื่อนี้แสดงในบัญชีผู้เรียนและบนใบรับรองที่ออกใหม่</CardDescription>
          </CardHeader>
          <CardContent><ProfileForm user={{ name: account.name, email: account.email }} /></CardContent>
        </Card>

        <Card aria-labelledby="security-settings-title">
          <CardHeader>
            <CardTitle id="security-settings-title">การเข้าสู่ระบบ</CardTitle>
            <CardDescription>รหัสผ่านสำหรับเข้าสู่ระบบด้วยอีเมล</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordSettingsForm hasPassword={account.hasPassword} signsInWithGoogle={account.signsInWithGoogle} />
          </CardContent>
        </Card>
      </div>
    </LearnerAccountShell>
  );
}
