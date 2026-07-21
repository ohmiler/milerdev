import styles from './loading.module.css';

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={styles.skeleton + ' ' + className} aria-hidden="true" />;
}

export default function LearnLoading() {
  return (
    <main className={styles.workspace} aria-busy="true" aria-label="กำลังเตรียมพื้นที่การเรียน">
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <span className={styles.mark}>MD</span>
          <span className={styles.brandCopy}>
            <strong>MilerDev Learning</strong>
            <small>กำลังเปิดบทเรียน</small>
          </span>
        </div>
        <div className={styles.context}>
          <span>LEARNING WORKSPACE</span>
          <Skeleton className={styles.contextLine} />
        </div>
        <Skeleton className={styles.navAction} />
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="กำลังโหลดลำดับการเรียน">
          <div className={styles.sidebarHead}>
            <span>COURSE INDEX</span>
            <strong>ลำดับการเรียน</strong>
          </div>
          <div className={styles.lessonList}>
            {[1, 2, 3, 4].map((number) => (
              <div className={styles.lesson} key={number}>
                <span className={styles.lessonNumber}>{String(number).padStart(2, '0')}</span>
                <span className={styles.lessonCopy}>
                  <Skeleton className={styles.lessonTitle} />
                  <Skeleton className={styles.lessonMeta} />
                </span>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.stage} aria-label="กำลังโหลดบทเรียน">
          <header className={styles.stageHead}>
            <div>
              <span>บทเรียนปัจจุบัน</span>
              <Skeleton className={styles.heading} />
            </div>
            <span className={styles.counter}>-- / --</span>
          </header>

          <div className={styles.video}>
            <span className={styles.play} aria-hidden="true">▶</span>
            <span className={styles.loadingLabel}>กำลังเตรียมวิดีโอและเนื้อหา</span>
          </div>

          <div className={styles.summary}>
            <div>
              <span>LESSON STATUS</span>
              <Skeleton className={styles.summaryTitle} />
              <Skeleton className={styles.summaryLine} />
            </div>
            <Skeleton className={styles.nextAction} />
          </div>
        </section>
      </div>
      <span className="sr-only" role="status">กำลังโหลดบทเรียน กรุณารอสักครู่</span>
    </main>
  );
}
