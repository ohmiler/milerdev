import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { eq, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, enrollments } from '@/lib/db/schema';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = {
  title: 'โปรไฟล์',
  description: 'จัดการข้อมูลส่วนตัวและดูสถิติการเรียนของคุณ',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function getUserProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [enrollmentStats] = await db
    .select({ count: count() })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  return { ...user, totalEnrollments: enrollmentStats?.count || 0 };
}

function getRoleLabel(role: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'instructor') return 'ผู้สอน';
  return 'นักเรียน';
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await getUserProfile(session.user.id);
  if (!user) redirect('/login');

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })
    : '-';

  return (
    <LearnerAccountShell
      current="profile"
      title="โปรไฟล์ของฉัน"
      description="ข้อมูลระบุตัวตนสำหรับบัญชีผู้เรียนและชื่อที่ใช้ในประสบการณ์เรียนของคุณ"
    >
      <Card aria-labelledby="profile-identity-title">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar size="lg">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || 'รูปโปรไฟล์ผู้ใช้'} />}
            <AvatarFallback aria-hidden>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Badge variant="outline">ข้อมูลโปรไฟล์</Badge>
            <CardTitle id="profile-identity-title">{user.name || 'ไม่ระบุชื่อ'}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3" aria-label="ข้อมูลสรุปบัญชี">
            <div><dt className="text-sm text-muted-foreground">คอร์สที่ลงทะเบียน</dt><dd className="font-semibold">{user.totalEnrollments}</dd></div>
            <div><dt className="text-sm text-muted-foreground">ประเภทบัญชี</dt><dd className="font-semibold">{getRoleLabel(user.role)}</dd></div>
            <div><dt className="text-sm text-muted-foreground">สมาชิกตั้งแต่</dt><dd className="font-semibold">{memberSince}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card aria-labelledby="edit-profile-title">
        <CardHeader>
          <Badge variant="outline">ข้อมูลที่แก้ไขได้</Badge>
          <CardTitle id="edit-profile-title">แก้ไขข้อมูล</CardTitle>
          <CardDescription>อัปเดตชื่อที่ใช้แสดงในบัญชีผู้เรียน</CardDescription>
        </CardHeader>
        <CardContent><ProfileForm user={user} /></CardContent>
      </Card>
    </LearnerAccountShell>
  );
}
