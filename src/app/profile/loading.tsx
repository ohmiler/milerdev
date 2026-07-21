import LearnerAccountShell from '@/components/account/LearnerAccountShell';
import styles from '@/components/account/LearnerAccount.module.css';

export default function ProfileLoading() {
  return (
    <LearnerAccountShell
      current="profile"
      eyebrow="Learner identity"
      title="โปรไฟล์ของฉัน"
      description="ข้อมูลระบุตัวตนสำหรับบัญชีผู้เรียนและชื่อที่ใช้ในประสบการณ์เรียนของคุณ"
    >
      <div aria-busy="true" aria-label="กำลังโหลดโปรไฟล์">
        <div className={styles.profileLead}>
          <div className={styles.avatarWrap}>
            <span className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
          </div>
          <div className={styles.profileIdentity}>
            <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <span className={`${styles.skeleton} ${styles.skeletonShort}`} />
          </div>
        </div>

        <div className={`${styles.summary} ${styles.profileStats}`}>
          {[1, 2, 3].map((item) => (
            <div key={item}>
              <span className={`${styles.skeleton} ${styles.skeletonShort}`} />
              <strong className={`${styles.skeleton} ${styles.skeletonValue}`} />
            </div>
          ))}
        </div>

        <section className={styles.formSection}>
          <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
          <span className={`${styles.skeleton} ${styles.skeletonInput}`} />
          <span className={`${styles.skeleton} ${styles.skeletonInput}`} />
        </section>
      </div>
    </LearnerAccountShell>
  );
}
