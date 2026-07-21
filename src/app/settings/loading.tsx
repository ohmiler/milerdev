import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import styles from '@/components/account/LearnerAccount.module.css';

export default function SettingsLoading() {
  return (
    <LearnerAccountShell
      current="settings"
      eyebrow="Account controls"
      title="ตั้งค่าบัญชี"
      description="จัดการข้อมูลที่แสดงในบัญชีและควบคุมความปลอดภัยของการเข้าสู่ระบบ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดการตั้งค่าบัญชี">
        {[1, 2].map((section) => (
          <section className={styles.settingsSection} key={section}>
            <span className={`${styles.skeleton} ${styles.skeletonShort}`} />
            <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <span className={`${styles.skeleton} ${styles.skeletonRow}`} />
          </section>
        ))}
      </div>
    </LearnerAccountShell>
  );
}
