import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import styles from './loading.module.css';

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`${styles.skeleton} ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <main
        className={styles.main}
        aria-busy="true"
        aria-label="กำลังโหลดแดชบอร์ดการเรียน"
      >
        <p className={styles.visuallyHidden}>กำลังโหลดแดชบอร์ดการเรียน กรุณารอสักครู่</p>
        <div className="container" aria-hidden="true">
          <header className={styles.header} data-dashboard-loading="header">
            <div className={styles.headerCopy}>
              <Skeleton className={styles.eyebrow} />
              <Skeleton className={styles.title} />
              <Skeleton className={styles.description} />
            </div>
            <div className={styles.navigation} data-dashboard-loading="account-navigation">
              <Skeleton className={styles.navItem} />
              <Skeleton className={styles.navItem} />
              <Skeleton className={`${styles.navItem} ${styles.navItemShort}`} />
            </div>
          </header>

          <section className={styles.stats}>
            {[1, 2, 3, 4].map((item) => (
              <div className={styles.stat} data-dashboard-loading-stat="true" key={item}>
                <Skeleton className={styles.statLabel} />
                <Skeleton className={styles.statValue} />
              </div>
            ))}
          </section>

          <section className={styles.continueSection} data-dashboard-loading="continuation">
            <div className={styles.sectionHead}>
              <div className={styles.sectionHeading}>
                <Skeleton className={styles.sectionLabel} />
                <Skeleton className={styles.sectionTitle} />
              </div>
              <Skeleton className={styles.sectionMeta} />
            </div>
            <div className={styles.continueFeature}>
              <div className={styles.media} />
              <div className={styles.featureContent}>
                <Skeleton className={styles.status} />
                <Skeleton className={styles.featureTitle} />
                <Skeleton className={styles.progress} />
                <Skeleton className={styles.featureAction} />
              </div>
            </div>
          </section>

          <section data-dashboard-loading="course-index">
            <div className={styles.sectionHead}>
              <div className={styles.sectionHeading}>
                <Skeleton className={styles.sectionLabel} />
                <Skeleton className={styles.sectionTitle} />
              </div>
              <Skeleton className={styles.sectionMeta} />
            </div>
            <div className={styles.courseList}>
              {[1, 2, 3].map((item) => (
                <div className={styles.courseRow} key={item}>
                  <Skeleton className={styles.index} />
                  <Skeleton className={styles.courseTitle} />
                  <Skeleton className={styles.courseProgress} />
                  <Skeleton className={styles.courseStatus} />
                  <Skeleton className={styles.courseAction} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
