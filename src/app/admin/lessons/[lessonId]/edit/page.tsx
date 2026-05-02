'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  orderIndex: number | null;
  isFreePreview: boolean | null;
  courseId: string;
}

export default function EditLessonPage() {
  const router = useRouter();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    videoUrl: '',
    videoDuration: '0:00',
    isFreePreview: false,
  });

  useEffect(() => {
    fetchLesson(lessonId);
  }, [lessonId]);

  const fetchLesson = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lessons/${id}`);
      if (!res.ok) {
        showToast('ไม่พบบทเรียน', 'error');
        return;
      }

      const data = await res.json();
      const loadedLesson = data.lesson as Lesson;
      setLesson(loadedLesson);

      const totalSeconds = loadedLesson.videoDuration || 0;
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      setFormData({
        title: loadedLesson.title,
        content: loadedLesson.content || '',
        videoUrl: loadedLesson.videoUrl || '',
        videoDuration: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        isFreePreview: loadedLesson.isFreePreview || false,
      });
    } catch {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasTitle = formData.title.trim().length > 0;
  const hasVideo = formData.videoUrl.trim().length > 0;
  const hasContent = formData.content.trim().replace(/<[^>]*>/g, '').length > 0;
  const durationLabel = formData.videoDuration.trim() || '0:00';
  const orderLabel = lesson?.orderIndex != null ? String(lesson.orderIndex + 1).padStart(2, '0') : '--';
  const previewLabel = formData.isFreePreview ? 'เปิด Preview' : 'เฉพาะผู้เรียน';
  const lessonTitle = hasTitle ? formData.title : 'ยังไม่มีชื่อบทเรียน';

  const checklist = useMemo(() => [
    {
      label: 'ชื่อบทเรียน',
      ready: hasTitle,
      hint: hasTitle ? 'พร้อมแสดงในสารบัญ' : 'ควรใส่ชื่อให้ชัดเจน',
    },
    {
      label: 'เนื้อหา',
      ready: hasContent,
      hint: hasContent ? 'มีรายละเอียดประกอบบทเรียน' : 'เพิ่มคำอธิบาย โค้ด หรือไฟล์ประกอบ',
    },
    {
      label: 'วิดีโอ',
      ready: hasVideo,
      hint: hasVideo ? 'เชื่อม video source แล้ว' : 'ยังไม่มี URL วิดีโอ',
    },
    {
      label: 'ระยะเวลา',
      ready: durationLabel !== '0:00' && durationLabel !== '0',
      hint: durationLabel !== '0:00' && durationLabel !== '0' ? 'เวลาถูกตั้งค่าแล้ว' : 'ใส่เวลาเพื่อช่วยผู้เรียนวางแผน',
    },
  ], [durationLabel, hasContent, hasTitle, hasVideo]);

  const readyCount = checklist.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / checklist.length) * 100);
  const nextAction = !hasTitle
    ? 'ตั้งชื่อบทเรียนก่อน เพื่อให้ทีมจัดลำดับและผู้เรียนสแกนสารบัญได้ง่าย'
    : !hasVideo
      ? 'เพิ่ม URL วิดีโอ เพื่อให้บทเรียนพร้อมเรียนจริงบนหน้า course player'
      : !hasContent
        ? 'เติมเนื้อหาประกอบ เช่น summary, code snippet หรือ resource ให้บทเรียนสมบูรณ์'
        : 'ข้อมูลหลักพร้อมแล้ว ตรวจสิทธิ์ Preview แล้วบันทึกได้เลย';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) return;

    setSaving(true);

    try {
      let durationInSeconds = 0;
      if (formData.videoDuration.includes(':')) {
        const [m, s] = formData.videoDuration.split(':');
        durationInSeconds = (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
      } else {
        durationInSeconds = Math.round(parseFloat(formData.videoDuration) * 60) || 0;
      }

      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          videoDuration: durationInSeconds,
        }),
      });

      if (res.ok) {
        showToast('บันทึกสำเร็จ', 'success');
        if (lesson?.courseId) {
          router.push(`/admin/courses/${lesson.courseId}/lessons`);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-edit-lesson-loading">กำลังโหลดบทเรียน...</div>;
  }

  if (!lesson) {
    return <div className="admin-edit-lesson-loading">ไม่พบบทเรียน</div>;
  }

  return (
    <div className="admin-edit-lesson-page">
      <section className="admin-edit-lesson-hero">
        <div className="admin-edit-lesson-copy">
          <Link href={`/admin/courses/${lesson.courseId}/lessons`} className="admin-edit-lesson-back">
            ← กลับไปจัดการบทเรียน
          </Link>
          <span className="admin-edit-lesson-kicker">Lesson editor</span>
          <h1>แก้ไขบทเรียน</h1>
          <p>
            ปรับชื่อ เนื้อหา วิดีโอ ระยะเวลา และสิทธิ์ Preview ของบทเรียนจากหน้าเดียว
            พร้อมแผงตรวจความพร้อมก่อนส่งกลับไปจัดลำดับในคอร์ส
          </p>
        </div>

        <aside className={formData.isFreePreview ? 'admin-edit-lesson-priority preview' : 'admin-edit-lesson-priority'}>
          <span className="admin-edit-lesson-kicker">Next action</span>
          <h2>{nextAction}</h2>
          <div className="admin-edit-lesson-priority-actions">
            <button type="submit" form="lesson-edit-form" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกบทเรียน'}
            </button>
            <Link href={`/admin/courses/${lesson.courseId}/lessons`}>ดูสารบัญ</Link>
          </div>
        </aside>
      </section>

      <section className="admin-edit-lesson-metrics">
        {[
          { label: 'ลำดับ', value: orderLabel, detail: 'ตำแหน่งในสารบัญ' },
          { label: 'วิดีโอ', value: hasVideo ? 'พร้อม' : 'ยังไม่มี', detail: hasVideo ? 'มี video source แล้ว' : 'ควรเพิ่ม URL วิดีโอ' },
          { label: 'ระยะเวลา', value: durationLabel, detail: 'แสดงให้ผู้เรียนวางแผนเวลา' },
          { label: 'Preview', value: previewLabel, detail: formData.isFreePreview ? 'ดูได้ก่อนซื้อคอร์ส' : 'จำกัดเฉพาะผู้มีสิทธิ์' },
        ].map((item, index) => (
          <article className="admin-edit-lesson-metric" key={item.label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.value}</strong>
            <div>
              <b>{item.label}</b>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <form id="lesson-edit-form" onSubmit={handleSubmit} className="admin-edit-lesson-layout">
        <main className="admin-edit-lesson-main">
          <section className="admin-edit-lesson-card">
            <header>
              <span className="admin-edit-lesson-kicker">Content</span>
              <h2>เนื้อหาหลักของบทเรียน</h2>
              <p>ชื่อและรายละเอียดควรช่วยให้ผู้เรียนเข้าใจว่าบทนี้จะได้ทำอะไร และควรเตรียมอะไรบ้างก่อนกดเรียน</p>
            </header>

            <label className="admin-edit-lesson-field">
              <span>ชื่อบทเรียน *</span>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                required
                placeholder="เช่น State, Props และการจัดการ Component"
              />
              <small>ใช้ชื่อที่สแกนง่ายเมื่ออยู่ในสารบัญบทเรียน</small>
            </label>

            <div className="admin-edit-lesson-field admin-edit-lesson-field-group">
              <span>เนื้อหาบทเรียน</span>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
              />
              <small>ใส่ summary, code snippet, link resource หรือโจทย์ฝึกหัดที่ผู้เรียนควรเห็นใต้ player</small>
            </div>
          </section>

          <section className="admin-edit-lesson-card">
            <header>
              <span className="admin-edit-lesson-kicker">Video setup</span>
              <h2>วิดีโอและการเข้าถึง</h2>
              <p>ตั้งค่าแหล่งวิดีโอ ระยะเวลา และสถานะ Preview ให้สอดคล้องกับประสบการณ์เรียนจริง</p>
            </header>

            <label className="admin-edit-lesson-field">
              <span>URL วิดีโอ</span>
              <input
                type="text"
                value={formData.videoUrl}
                onChange={(event) => setFormData({ ...formData, videoUrl: event.target.value })}
                placeholder="Bunny Video GUID หรือ Embed URL"
              />
              <small>รองรับ Bunny Video GUID หรือ Embed URL ที่ระบบนำไปใช้กับ course player</small>
            </label>

            <div className="admin-edit-lesson-two-col">
              <label className="admin-edit-lesson-field">
                <span>ระยะเวลา</span>
                <input
                  type="text"
                  value={formData.videoDuration}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (/^[0-9:]*$/.test(value)) {
                      setFormData({ ...formData, videoDuration: value });
                    }
                  }}
                  placeholder="10:30"
                />
                <small>รูปแบบนาที:วินาที เช่น 10:30</small>
              </label>

              <label className={formData.isFreePreview ? 'admin-edit-preview-toggle active' : 'admin-edit-preview-toggle'}>
                <input
                  type="checkbox"
                  checked={formData.isFreePreview}
                  onChange={(event) => setFormData({ ...formData, isFreePreview: event.target.checked })}
                />
                <span>
                  <b>เปิดให้ดูฟรี</b>
                  <small>ใช้เป็น sample lesson เพื่อช่วยให้ผู้เรียนตัดสินใจก่อนซื้อคอร์ส</small>
                </span>
              </label>
            </div>
          </section>
        </main>

        <aside className="admin-edit-lesson-side">
          <section className="admin-edit-lesson-save-card">
            <span className="admin-edit-lesson-kicker">Save panel</span>
            <h2>{readinessPercent}% พร้อมใช้งาน</h2>
            <p>{lessonTitle}</p>

            <div className="admin-edit-lesson-progress" aria-label={`ความพร้อม ${readinessPercent}%`}>
              <span style={{ width: `${readinessPercent}%` }} />
            </div>

            <div className="admin-edit-lesson-checklist">
              {checklist.map((item) => (
                <div key={item.label} className={item.ready ? 'ready' : ''}>
                  <i />
                  <span>
                    <b>{item.label}</b>
                    <small>{item.hint}</small>
                  </span>
                </div>
              ))}
            </div>

            <button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
            <Link href={`/admin/courses/${lesson.courseId}/lessons`}>ยกเลิกและกลับไปสารบัญ</Link>
          </section>
        </aside>
      </form>

      <style jsx>{`
        .admin-edit-lesson-page {
          --lesson-primary: #02abff;
          --lesson-primary-strong: #0089d6;
          --lesson-ink: #102033;
          --lesson-muted: #64748b;
          --lesson-line: #dbeafe;
          display: grid;
          gap: 20px;
        }

        .admin-edit-lesson-loading {
          min-height: 360px;
          display: grid;
          place-items: center;
          color: #64748b;
          font-weight: 700;
        }

        .admin-edit-lesson-hero,
        .admin-edit-lesson-metric,
        .admin-edit-lesson-card,
        .admin-edit-lesson-save-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(2, 171, 255, 0.14);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.07);
        }

        .admin-edit-lesson-hero {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          padding: 28px;
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
          gap: 20px;
          background:
            linear-gradient(135deg, rgba(2, 171, 255, 0.12), rgba(255, 255, 255, 0.96) 42%),
            repeating-linear-gradient(90deg, rgba(2, 171, 255, 0.06) 0 1px, transparent 1px 44px),
            #ffffff;
        }

        .admin-edit-lesson-copy {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .admin-edit-lesson-back {
          width: fit-content;
          color: #476179;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .admin-edit-lesson-kicker {
          color: var(--lesson-primary-strong);
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-edit-lesson-hero h1 {
          margin: 0;
          color: var(--lesson-ink);
          font-size: clamp(2rem, 5vw, 4.4rem);
          line-height: 0.95;
          font-weight: 950;
        }

        .admin-edit-lesson-hero p {
          max-width: 720px;
          margin: 0;
          color: #50657b;
          font-size: 0.98rem;
          line-height: 1.8;
        }

        .admin-edit-lesson-priority {
          position: relative;
          z-index: 1;
          border-radius: 8px;
          padding: 20px;
          display: grid;
          gap: 18px;
          align-content: space-between;
          color: #ffffff;
          background: linear-gradient(145deg, #102033, #16445d);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .admin-edit-lesson-priority.preview {
          background: linear-gradient(145deg, #006eaa, #02abff);
        }

        .admin-edit-lesson-priority .admin-edit-lesson-kicker {
          color: rgba(255, 255, 255, 0.78);
        }

        .admin-edit-lesson-priority h2 {
          margin: 8px 0 0;
          font-size: 1.15rem;
          line-height: 1.55;
        }

        .admin-edit-lesson-priority-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-edit-lesson-priority-actions button,
        .admin-edit-lesson-priority-actions a {
          min-height: 42px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
          text-decoration: none;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-edit-lesson-priority-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .admin-edit-lesson-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-edit-lesson-metric {
          border-radius: 8px;
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .admin-edit-lesson-metric > span {
          color: var(--lesson-primary);
          font-weight: 950;
          font-size: 0.8rem;
        }

        .admin-edit-lesson-metric > strong {
          color: var(--lesson-ink);
          font-size: 1.35rem;
          line-height: 1.1;
        }

        .admin-edit-lesson-metric b {
          color: #35516b;
          font-size: 0.82rem;
        }

        .admin-edit-lesson-metric p {
          margin: 4px 0 0;
          color: var(--lesson-muted);
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .admin-edit-lesson-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 20px;
          align-items: start;
        }

        .admin-edit-lesson-main {
          display: grid;
          gap: 20px;
        }

        .admin-edit-lesson-card,
        .admin-edit-lesson-save-card {
          border-radius: 8px;
          padding: 22px;
        }

        .admin-edit-lesson-card header {
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
        }

        .admin-edit-lesson-card h2,
        .admin-edit-lesson-save-card h2 {
          margin: 0;
          color: var(--lesson-ink);
          font-size: 1.25rem;
          line-height: 1.25;
        }

        .admin-edit-lesson-card p,
        .admin-edit-lesson-save-card p {
          margin: 0;
          color: var(--lesson-muted);
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .admin-edit-lesson-field {
          display: grid;
          gap: 8px;
          margin-top: 16px;
        }

        .admin-edit-lesson-field > span,
        .admin-edit-preview-toggle b {
          color: #273f55;
          font-size: 0.9rem;
          font-weight: 850;
        }

        .admin-edit-lesson-field small,
        .admin-edit-preview-toggle small {
          color: #7b8da2;
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-edit-lesson-field input {
          width: 100%;
          min-height: 48px;
          border: 1px solid #d7e6f5;
          border-radius: 8px;
          background: #fbfdff;
          color: var(--lesson-ink);
          padding: 0 14px;
          font-size: 0.96rem;
          font-weight: 650;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .admin-edit-lesson-field input:focus {
          border-color: var(--lesson-primary);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(2, 171, 255, 0.13);
        }

        .admin-edit-lesson-field-group {
          padding-top: 4px;
        }

        .admin-edit-lesson-two-col {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(260px, 1fr);
          gap: 16px;
          align-items: stretch;
        }

        .admin-edit-preview-toggle {
          margin-top: 16px;
          border-radius: 8px;
          border: 1px solid #d7e6f5;
          background: linear-gradient(180deg, #ffffff, #f7fbff);
          min-height: 112px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          cursor: pointer;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .admin-edit-preview-toggle:hover {
          transform: translateY(-1px);
          border-color: rgba(2, 171, 255, 0.45);
          box-shadow: 0 16px 34px rgba(2, 171, 255, 0.12);
        }

        .admin-edit-preview-toggle.active {
          border-color: rgba(2, 171, 255, 0.65);
          background: linear-gradient(135deg, rgba(2, 171, 255, 0.12), #ffffff);
        }

        .admin-edit-preview-toggle input {
          width: 18px;
          height: 18px;
          margin-top: 3px;
          accent-color: var(--lesson-primary);
        }

        .admin-edit-preview-toggle span {
          display: grid;
          gap: 6px;
        }

        .admin-edit-lesson-side {
          position: sticky;
          top: 18px;
        }

        .admin-edit-lesson-save-card {
          display: grid;
          gap: 16px;
        }

        .admin-edit-lesson-progress {
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: #e8f5ff;
        }

        .admin-edit-lesson-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--lesson-primary), #6ad0ff);
        }

        .admin-edit-lesson-checklist {
          display: grid;
          gap: 10px;
        }

        .admin-edit-lesson-checklist > div {
          border: 1px solid #e2edf7;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #fbfdff;
        }

        .admin-edit-lesson-checklist i {
          width: 10px;
          height: 10px;
          margin-top: 6px;
          border-radius: 999px;
          background: #f59e0b;
          flex: 0 0 auto;
        }

        .admin-edit-lesson-checklist .ready i {
          background: #16a34a;
        }

        .admin-edit-lesson-checklist span {
          display: grid;
          gap: 2px;
        }

        .admin-edit-lesson-checklist b {
          color: var(--lesson-ink);
          font-size: 0.82rem;
        }

        .admin-edit-lesson-checklist small {
          color: var(--lesson-muted);
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .admin-edit-lesson-save-card button,
        .admin-edit-lesson-save-card a {
          min-height: 46px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 900;
        }

        .admin-edit-lesson-save-card button {
          border: none;
          color: #ffffff;
          background: linear-gradient(135deg, var(--lesson-primary), var(--lesson-primary-strong));
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(2, 171, 255, 0.22);
        }

        .admin-edit-lesson-save-card button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .admin-edit-lesson-save-card a {
          color: #486279;
          background: #f1f7fd;
        }

        @media (max-width: 1100px) {
          .admin-edit-lesson-hero,
          .admin-edit-lesson-layout {
            grid-template-columns: 1fr;
          }

          .admin-edit-lesson-side {
            position: static;
          }
        }

        @media (max-width: 820px) {
          .admin-edit-lesson-hero {
            padding: 20px;
          }

          .admin-edit-lesson-metrics,
          .admin-edit-lesson-two-col {
            grid-template-columns: 1fr;
          }

          .admin-edit-lesson-card,
          .admin-edit-lesson-save-card {
            padding: 18px;
          }
        }
      `}</style>
    </div>
  );
}
