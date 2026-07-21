import Link from 'next/link';
import styles from './learn-entry.module.css';

interface EmptyCourseWorkspaceProps {
  courseTitle: string;
  courseSlug: string;
  paymentSuccess: boolean;
}

export default function EmptyCourseWorkspace({
  courseTitle,
  courseSlug,
  paymentSuccess,
}: EmptyCourseWorkspaceProps) {
  return (
    <main className={styles.page}>
      {paymentSuccess && (
        <div className={styles.paymentNotice} role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>สิทธิ์เข้าเรียนพร้อมแล้ว</strong>
            <p>ระบบบันทึกคอร์ส {courseTitle} ไว้ในบัญชีของคุณเรียบร้อย</p>
          </div>
        </div>
      )}
      <header className={styles.header}>
        <Link className={styles.brand} href="/dashboard"><span aria-hidden="true">MD</span><strong>MilerDev Learning</strong></Link>
        <div className={styles.courseContext}><span>COURSE WORKSPACE</span><strong>{courseTitle}</strong></div>
        <Link className={styles.exitLink} href={'/courses/' + courseSlug}>ดูหน้าคอร์ส <span aria-hidden="true">→</span></Link>
      </header>
      <div className={styles.layout}>
        <aside className={styles.index} aria-label="สถานะเนื้อหาคอร์ส">
          <p>COURSE INDEX</p>
          <h2>ลำดับการเรียน</h2>
          <div className={styles.indexState}><span>00</span><div><strong>ยังไม่มีบทเรียน</strong><p>รอทีมเผยแพร่เนื้อหา</p></div></div>
        </aside>
        <section className={styles.stage} aria-labelledby="empty-course-title">
          <div className={styles.stageHeading}>
            <div><p>LEARNING WORKSPACE / WAITING</p><h1 id="empty-course-title">คอร์สนี้ยังไม่มีบทเรียนที่เปิดให้เรียน</h1></div>
            <span>00 / 00</span>
          </div>
          <div className={styles.emptyPanel}>
            <div className={styles.emptyVisual} aria-hidden="true"><span>▶</span></div>
            <div className={styles.emptyCopy}>
              <p>CONTENT STATUS</p>
              <h2>ทีมกำลังเตรียมเนื้อหาบทเรียน</h2>
              <p>สิทธิ์เข้าเรียนของคุณยังอยู่ครบ เมื่อมีบทเรียนเผยแพร่ คุณสามารถกลับมาเริ่มเรียนจากแดชบอร์ดได้ทันที</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/dashboard">กลับไปแดชบอร์ด <span aria-hidden="true">→</span></Link>
            <Link href={'/courses/' + courseSlug}>ดูรายละเอียดคอร์ส</Link>
            <Link href="/contact">ติดต่อทีม MilerDev</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
