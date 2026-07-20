import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import styles from './course-detail.module.css';

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`${styles.skeleton} ${className}`} aria-hidden="true" />;
}

export default function CourseDetailLoading() {
  return (
    <>
      <Navbar />
      <main className={styles.page} aria-busy="true" aria-label="กำลังโหลดรายละเอียดคอร์ส">
        <header className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={`${styles.heroContent} ${styles.loadingHero}`}>
              <Skeleton className={styles.loadingBreadcrumb} />
              <div className={styles.loadingTags}><Skeleton /><Skeleton /></div>
              <Skeleton className={styles.loadingTitle} />
              <Skeleton className={styles.loadingLede} />
              <div className={styles.loadingFacts}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
            </div>
            <aside className={styles.enrollment} aria-hidden="true">
              <div className={`${styles.enrollPanel} ${styles.loadingPanel}`}>
                <Skeleton className={styles.loadingMedia} />
                <div><Skeleton className={styles.loadingPrice} /><Skeleton className={styles.loadingButton} /><Skeleton className={styles.loadingCopy} /></div>
              </div>
            </aside>
          </div>
        </header>
        <section className={styles.body}>
          <div className={styles.bodyGrid}>
            <div className={`${styles.readingColumn} ${styles.loadingBody}`}>
              <Skeleton className={styles.loadingSectionTitle} />
              <Skeleton className={styles.loadingCopy} />
              <Skeleton className={`${styles.loadingCopy} ${styles.loadingCopyShort}`} />
              <Skeleton className={styles.loadingSectionTitle} />
              {[1, 2, 3, 4].map((item) => <Skeleton key={item} className={styles.loadingLesson} />)}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
