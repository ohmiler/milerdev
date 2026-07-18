import styles from './LearningWorkspacePreview.module.css';

const LESSON_STEPS = [
  {
    index: '01',
    title: 'เข้าใจแนวคิดก่อนเขียนโค้ด',
    meta: 'เห็นภาพรวมของสิ่งที่จะสร้าง',
    state: 'complete',
  },
  {
    index: '02',
    title: 'ลงมือทำไปพร้อมกับบทเรียน',
    meta: 'วิดีโอ · โค้ด · ผลลัพธ์',
    state: 'active',
  },
  {
    index: '03',
    title: 'กลับมาทำต่อจากจุดล่าสุด',
    meta: 'ระบบบันทึกความคืบหน้า',
    state: 'next',
  },
] as const;

export default function LearningWorkspacePreview() {
  return (
    <article className={styles.workspace} aria-label="ตัวอย่างพื้นที่เรียนออนไลน์ของ MilerDev">
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">MD</span>
          <span>
            <strong>MilerDev Learning</strong>
            <small>ตัวอย่างหน้าบทเรียน</small>
          </span>
        </div>
        <div className={styles.courseContext}>
          <span>LEARNING WORKSPACE</span>
          <strong>เรียนต่อจากจุดล่าสุด</strong>
        </div>
        <span className={styles.previewLabel}>PREVIEW</span>
      </header>

      <div className={styles.body}>
        <aside className={styles.lessonRail} aria-label="ตัวอย่างลำดับการเรียน">
          <div className={styles.railHeading}>
            <span>COURSE INDEX</span>
            <strong>ลำดับการเรียน</strong>
          </div>
          <ol className={styles.lessonList}>
            {LESSON_STEPS.map((lesson) => (
              <li key={lesson.index} data-state={lesson.state}>
                <span className={styles.lessonIndex}>{lesson.index}</span>
                <span className={styles.lessonCopy}>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.meta}</small>
                </span>
                <span className={styles.lessonState} aria-hidden="true">
                  {lesson.state === 'complete' ? '✓' : lesson.state === 'active' ? '▶' : '—'}
                </span>
              </li>
            ))}
          </ol>
        </aside>

        <div className={styles.stage}>
          <div className={styles.stageHeading}>
            <div>
              <span>บทเรียนปัจจุบัน</span>
              <h3>เข้าใจแนวคิด แล้วเขียนโค้ดให้เห็นผล</h3>
            </div>
            <span className={styles.lessonPosition}>02 / 03</span>
          </div>

          <div className={styles.videoStage} aria-label="ตัวอย่างพื้นที่วิดีโอบทเรียน">
            <div className={styles.videoGrid} aria-hidden="true" />
            <span className={styles.videoMeta}>VIDEO LESSON · CODE ALONG</span>
            <span className={styles.playMark} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="currentColor" />
              </svg>
            </span>
            <div className={styles.videoCaption}>
              <strong>เรียนไปพร้อมกับการลงมือทำ</strong>
              <span>หยุด ทบทวน และกลับมาเรียนต่อได้ตามจังหวะของคุณ</span>
            </div>
          </div>

          <div className={styles.checkpoint}>
            <div className={styles.progressBlock}>
              <div className={styles.progressCopy}>
                <span>ตัวอย่างความคืบหน้า</span>
                <strong>เรียนจบแล้ว 60%</strong>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="ตัวอย่างความคืบหน้าของผู้เรียน 60 เปอร์เซ็นต์"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={60}
              >
                <span />
              </div>
              <small>ระบบบันทึกจุดล่าสุดไว้ให้กลับมาเรียนต่อ</small>
            </div>

            <div className={styles.nextAction}>
              <span>NEXT ACTION</span>
              <strong>เรียนบทถัดไป</strong>
              <span className={styles.nextArrow} aria-hidden="true">→</span>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.statusbar}>
        <span><i aria-hidden="true" /> Progress saved</span>
        <span>Video · Curriculum · Certificate</span>
      </footer>
    </article>
  );
}
