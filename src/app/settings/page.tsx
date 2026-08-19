import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import { learnerAccountStyles as styles } from '@/components/account/learner-account-styles';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'ตั้งค่า',
  description: 'จัดการการตั้งค่าบัญชีและความปลอดภัยของคุณ',
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <LearnerAccountShell
      current="settings"
      title="ตั้งค่าบัญชี"
      description="จัดการข้อมูลที่แสดงในบัญชีและควบคุมความปลอดภัยของการเข้าสู่ระบบ"
    >
      <section className={styles.settingsSection} aria-labelledby="account-settings-title">
        <p className={styles.sectionLabel}>บัญชี</p>
        <h2 id="account-settings-title">ข้อมูลบัญชี</h2>
        <Link className={styles.settingRow} href="/profile">
          <span className={styles.settingCopy}>
            <strong>แก้ไขโปรไฟล์</strong>
            <span>เปลี่ยนชื่อที่ใช้ในบัญชีผู้เรียนและตรวจสอบอีเมล</span>
          </span>
          <span className={styles.settingMarker} aria-hidden="true">03 ↗</span>
        </Link>
      </section>

      <section className={styles.settingsSection} aria-labelledby="security-settings-title">
        <p className={styles.sectionLabel}>ความปลอดภัย</p>
        <h2 id="security-settings-title">การเข้าสู่ระบบ</h2>
        <ChangePasswordForm hasPassword={Boolean(user?.passwordHash)} />
      </section>
    </LearnerAccountShell>
  );
}
