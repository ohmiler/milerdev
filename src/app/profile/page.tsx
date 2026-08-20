import { redirect } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { eq, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, enrollments } from '@/lib/db/schema';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { learnerAccountStyles as styles } from '@/components/account/learner-account-styles';
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
      <section aria-labelledby="profile-identity-title">
        <div className={styles.profileLead}>
          <div className={styles.avatarWrap}>
            {user.avatarUrl ? (
              <Image className={styles.avatar} src={user.avatarUrl} alt="" width={96} height={96} />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className={styles.profileIdentity}>
            <p className={styles.sectionLabel}>ข้อมูลโปรไฟล์</p>
            <h2 id="profile-identity-title">{user.name || 'ไม่ระบุชื่อ'}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        <div className={`${styles.summary} ${styles.profileStats}`} aria-label="ข้อมูลสรุปบัญชี">
          <div><span>คอร์สที่ลงทะเบียน</span><strong data-accent="true">{user.totalEnrollments}</strong></div>
          <div><span>ประเภทบัญชี</span><strong>{getRoleLabel(user.role)}</strong></div>
          <div><span>สมาชิกตั้งแต่</span><strong>{memberSince}</strong></div>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="edit-profile-title">
        <p className={styles.sectionLabel}>ข้อมูลที่แก้ไขได้</p>
        <h2 id="edit-profile-title">แก้ไขข้อมูล</h2>
        <ProfileForm user={user} />
      </section>
    </LearnerAccountShell>
  );
}
