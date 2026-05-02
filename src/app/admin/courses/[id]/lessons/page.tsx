'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DraggableLessonList from '@/components/admin/DraggableLessonList';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
}

function toDurationSeconds(value: string) {
  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    return (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
  }

  return Math.round(parseFloat(value) * 60) || 0;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('th-TH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ManageLessonsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    videoUrl: '',
    videoDuration: '0:00',
    isFreePreview: false,
  });

  const fetchLessons = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/courses/${id}/lessons`);
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      showToast('โหลดบทเรียนไม่สำเร็จ', 'error');
    }
  };

  useEffect(() => {
    fetchLessons(courseId).finally(() => setLoading(false));
  }, [courseId]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      videoUrl: '',
      videoDuration: '0:00',
      isFreePreview: false,
    });
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!courseId) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          videoDuration: toDurationSeconds(formData.videoDuration),
        }),
      });

      if (res.ok) {
        await fetchLessons(courseId);
        resetForm();
        showToast('เพิ่มบทเรียนสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เพิ่มบทเรียนไม่สำเร็จ', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deletingLessonId || !courseId) return;
    const lessonId = deletingLessonId;
    setDeletingLessonId(null);

    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchLessons(courseId);
        showToast('ลบบทเรียนสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'ลบบทเรียนไม่สำเร็จ', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  const totalLessons = lessons.length;
  const lessonsWithVideo = lessons.filter((lesson) => Boolean(lesson.videoUrl)).length;
  const lessonsWithContent = lessons.filter((lesson) => lesson.content && lesson.content.trim().length > 0).length;
  const freePreviewCount = lessons.filter((lesson) => Boolean(lesson.isFreePreview)).length;
  const needsContentCount = totalLessons - lessonsWithContent;
  const needsVideoCount = totalLessons - lessonsWithVideo;
  const readinessPercent = totalLessons > 0
    ? Math.round(((lessonsWithVideo + lessonsWithContent) / (totalLessons * 2)) * 100)
    : 0;
  const nextAction = needsVideoCount > 0
    ? { label: 'เติมวิดีโอที่ยังขาด', detail: `${needsVideoCount} บทยังไม่มีวิดีโอ`, href: '#lesson-workbench', tone: 'warning' }
    : needsContentCount > 0
      ? { label: 'เติมเนื้อหาบทเรียน', detail: `${needsContentCount} บทยังไม่มีเนื้อหา`, href: '#lesson-workbench', tone: 'warning' }
      : { label: 'เพิ่มบทเรียนใหม่', detail: 'โครงสร้างบทเรียนพร้อมใช้งานแล้ว', href: '#new-lesson', tone: 'success' };
  const createReadinessItems = [
    { label: 'ชื่อบทเรียน', ready: formData.title.trim().length > 0 },
    { label: 'เนื้อหา', ready: formData.content.trim().length > 0 },
    { label: 'วิดีโอ', ready: formData.videoUrl.trim().length > 0 },
    { label: 'Preview', ready: formData.isFreePreview },
  ];

  if (loading) {
    return (
      <div className="admin-lesson-loading">
        กำลังโหลดบทเรียน...
      </div>
    );
  }

  return (
    <div className="admin-lesson-page">
      <section className="admin-lesson-hero">
        <div className="admin-lesson-copy">
          <Link href="/admin/courses" className="admin-lesson-back">← กลับไปคอร์สทั้งหมด</Link>
          <span className="admin-lesson-kicker">Lesson operations</span>
          <h1>จัดการบทเรียน</h1>
          <p>
            จัดลำดับบทเรียน เติมวิดีโอ ตรวจเนื้อหา และตั้งค่า preview จากหน้าเดียว
            เพื่อให้คอร์สพร้อมเรียนจริงก่อนเผยแพร่หรือโปรโมต
          </p>
        </div>

        <aside className={`admin-lesson-priority ${nextAction.tone}`}>
          <div>
            <span className="admin-lesson-kicker">Next action</span>
            <h2>{nextAction.label}</h2>
            <p>{nextAction.detail}</p>
          </div>
          <a href={nextAction.href}>เปิดงาน <span aria-hidden="true">→</span></a>
        </aside>
      </section>

      <section className="admin-lesson-metrics" aria-label="สรุปสถานะบทเรียน">
        {[
          { label: 'บทเรียนทั้งหมด', value: totalLessons, detail: 'โครงสร้างในคอร์สนี้' },
          { label: 'มีวิดีโอแล้ว', value: lessonsWithVideo, detail: 'พร้อมสำหรับ player' },
          { label: 'มีเนื้อหาแล้ว', value: lessonsWithContent, detail: 'มีรายละเอียดประกอบ' },
          { label: 'Preview ฟรี', value: freePreviewCount, detail: 'เปิดให้ลองเรียน' },
        ].map((item, index) => (
          <article className="admin-lesson-metric" key={item.label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{formatCompactNumber(item.value)}</strong>
            <div>
              <b>{item.label}</b>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-lesson-readiness">
        <div className="admin-lesson-readiness-main">
          <div className="admin-lesson-meter" style={{ '--lesson-ready': `${readinessPercent}%` } as CSSProperties}>
            <strong>{readinessPercent}%</strong>
          </div>
          <div>
            <span className="admin-lesson-kicker">Course readiness</span>
            <h2>ความพร้อมของบทเรียน</h2>
            <p>คำนวณจากบทเรียนที่มีทั้งวิดีโอและเนื้อหา ซึ่งเป็นสองจุดหลักของประสบการณ์เรียน</p>
          </div>
        </div>

        <button type="button" onClick={() => { resetForm(); setShowForm(true); }}>
          เพิ่มบทเรียนใหม่
        </button>
      </section>

      {showForm ? (
        <section className="admin-lesson-form-card" id="new-lesson">
          <div className="admin-lesson-form-header">
            <div>
              <span className="admin-lesson-kicker">New lesson</span>
              <h2>เพิ่มบทเรียนใหม่</h2>
              <p>เริ่มจากชื่อบทเรียน แล้วค่อยเติมเนื้อหา วิดีโอ และสิทธิ์ preview ให้ครบใน flow เดียว</p>
            </div>
            <button type="button" onClick={resetForm}>ปิดฟอร์ม</button>
          </div>

          <div className="admin-lesson-form-grid">
            <form onSubmit={handleSubmit}>
              <label>
                <span>ชื่อบทเรียน *</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  required
                  placeholder="เช่น สร้างหน้าแรกด้วย Next.js"
                />
              </label>

              <label>
                <span>เนื้อหาบทเรียน</span>
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </label>

              <label>
                <span>URL วิดีโอ</span>
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(event) => setFormData({ ...formData, videoUrl: event.target.value })}
                  placeholder="Bunny Video GUID หรือ Embed URL"
                />
              </label>

              <div className="admin-lesson-inline-fields">
                <label>
                  <span>ระยะเวลา</span>
                  <input
                    type="text"
                    value={formData.videoDuration}
                    onChange={(event) => {
                      if (/^[0-9:]*$/.test(event.target.value)) {
                        setFormData({ ...formData, videoDuration: event.target.value });
                      }
                    }}
                    placeholder="10:30"
                  />
                </label>
                <label className="admin-lesson-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.isFreePreview}
                    onChange={(event) => setFormData({ ...formData, isFreePreview: event.target.checked })}
                  />
                  <span>ดูได้ฟรี (Preview)</span>
                </label>
              </div>

              <div className="admin-lesson-form-actions">
                <button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'เพิ่มบทเรียน'}</button>
                <button type="button" onClick={resetForm}>ยกเลิก</button>
              </div>
            </form>

            <aside className="admin-lesson-checklist">
              <h3>Checklist</h3>
              {createReadinessItems.map((item) => (
                <div key={item.label}>
                  <span className={item.ready ? 'ready' : ''} />
                  <p>
                    <strong>{item.label}</strong>
                    <small>{item.ready ? 'พร้อมแล้ว' : 'ยังไม่ครบ'}</small>
                  </p>
                </div>
              ))}
              <div className="admin-lesson-note">
                ถ้าเป็น sample lesson แนะนำให้เปิด preview และใส่วิดีโอให้พร้อม เพื่อช่วยให้ผู้เรียนตัดสินใจก่อนสมัครคอร์ส
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      <section className="admin-lesson-workbench" id="lesson-workbench">
        <header>
          <div>
            <span className="admin-lesson-kicker">Lesson workbench</span>
            <h2>โครงสร้างบทเรียน</h2>
            <p>ลากเพื่อจัดลำดับ ใช้ตัวกรองเพื่อหาบทที่ยังไม่พร้อม และแก้วิดีโอแบบ inline ได้ทันที</p>
          </div>
          <button type="button" onClick={() => { resetForm(); setShowForm(true); }}>
            เพิ่มบทเรียน
          </button>
        </header>
        <DraggableLessonList
          lessons={lessons}
          courseId={courseId || ''}
          onDelete={(id) => setDeletingLessonId(id)}
          onReorder={(newIds) => {
            const reordered = newIds.map((id) => lessons.find((lesson) => lesson.id === id)!).filter(Boolean);
            setLessons(reordered);
          }}
          onLessonUpdate={(lessonId, data) => {
            setLessons((currentLessons) => currentLessons.map((lesson) => (
              lesson.id === lessonId ? { ...lesson, ...data } : lesson
            )));
          }}
        />
      </section>

      <ConfirmDialog
        isOpen={!!deletingLessonId}
        title="ลบบทเรียน"
        message="คุณแน่ใจหรือไม่ที่จะลบบทเรียนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบบทเรียน"
        onConfirm={confirmDeleteLesson}
        onCancel={() => setDeletingLessonId(null)}
      />

      <style>{`
        .admin-lesson-page {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          display: grid;
          gap: 18px;
          color: var(--ink);
        }

        .admin-lesson-loading {
          padding: 60px;
          color: #64758b;
          text-align: center;
        }

        .admin-lesson-hero,
        .admin-lesson-metric,
        .admin-lesson-readiness,
        .admin-lesson-form-card,
        .admin-lesson-workbench {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-lesson-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: 18px;
          padding: 22px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(238, 250, 255, 0.92), rgba(255, 255, 255, 0.98) 48%), #fff;
        }

        .admin-lesson-copy {
          display: grid;
          gap: 10px;
          align-content: center;
          min-height: 190px;
        }

        .admin-lesson-back {
          width: fit-content;
          color: var(--muted);
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 700;
        }

        .admin-lesson-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-lesson-hero h1,
        .admin-lesson-priority h2,
        .admin-lesson-readiness h2,
        .admin-lesson-form-card h2,
        .admin-lesson-workbench h2 {
          margin: 0;
          color: var(--ink);
          line-height: 1.22;
        }

        .admin-lesson-hero h1 {
          font-size: clamp(2rem, 4vw, 3.45rem);
        }

        .admin-lesson-hero p,
        .admin-lesson-priority p,
        .admin-lesson-readiness p,
        .admin-lesson-form-card p,
        .admin-lesson-workbench p {
          margin: 0;
          color: var(--muted);
          font-size: 0.96rem;
          line-height: 1.8;
        }

        .admin-lesson-priority {
          display: grid;
          align-content: space-between;
          gap: 20px;
          padding: 20px;
          border-radius: 8px;
          background: #0b1220;
          color: #fff;
        }

        .admin-lesson-priority.warning {
          background: linear-gradient(135deg, #102033, #5a3b08);
        }

        .admin-lesson-priority.success {
          background: linear-gradient(135deg, #0b1220, #0f5132);
        }

        .admin-lesson-priority h2 {
          margin-top: 8px;
          color: #fff;
          font-size: 1.35rem;
        }

        .admin-lesson-priority p {
          color: #b8c7dc;
        }

        .admin-lesson-priority a,
        .admin-lesson-readiness button,
        .admin-lesson-workbench header button,
        .admin-lesson-form-actions button:first-child {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 44px;
          padding: 0 16px;
          border: 0;
          border-radius: 8px;
          background: var(--brand);
          color: #fff;
          cursor: pointer;
          text-decoration: none;
          font-weight: 800;
        }

        .admin-lesson-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-lesson-metric {
          display: grid;
          gap: 12px;
          min-height: 138px;
          padding: 18px;
          border-radius: 8px;
        }

        .admin-lesson-metric > span {
          color: #a6b5c5;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .admin-lesson-metric > strong {
          color: var(--ink);
          font-size: clamp(1.5rem, 2vw, 2rem);
          line-height: 1;
        }

        .admin-lesson-metric p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-lesson-readiness {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          padding: 20px;
          border-radius: 8px;
        }

        .admin-lesson-readiness-main {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
        }

        .admin-lesson-meter {
          display: grid;
          place-items: center;
          width: 118px;
          height: 118px;
          border-radius: 999px;
          background: radial-gradient(circle closest-side, white 68%, transparent 69%), conic-gradient(var(--brand) var(--lesson-ready), #e8f1f8 0);
        }

        .admin-lesson-meter strong {
          font-size: 1.35rem;
        }

        .admin-lesson-form-card,
        .admin-lesson-workbench {
          overflow: hidden;
          border-radius: 8px;
        }

        .admin-lesson-form-header,
        .admin-lesson-workbench > header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, #fff, #f7fbff);
        }

        .admin-lesson-form-header button,
        .admin-lesson-form-actions button:last-child {
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #fff;
          color: var(--ink);
          cursor: pointer;
          font-weight: 800;
        }

        .admin-lesson-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.55fr);
          gap: 18px;
          padding: 20px;
        }

        .admin-lesson-form-grid form {
          display: grid;
          gap: 16px;
        }

        .admin-lesson-form-grid label {
          display: grid;
          gap: 8px;
          color: var(--ink);
          font-weight: 700;
        }

        .admin-lesson-form-grid input[type="text"] {
          width: 100%;
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
          color: var(--ink);
          font-size: 0.95rem;
        }

        .admin-lesson-form-grid input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.2);
        }

        .admin-lesson-inline-fields {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.7fr);
          gap: 14px;
          align-items: end;
        }

        .admin-lesson-checkbox {
          display: flex !important;
          min-height: 44px;
          align-items: center;
          gap: 10px !important;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
          cursor: pointer;
        }

        .admin-lesson-checkbox input {
          width: 18px;
          height: 18px;
        }

        .admin-lesson-form-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-lesson-form-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .admin-lesson-checklist {
          display: grid;
          gap: 10px;
          align-content: start;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
        }

        .admin-lesson-checklist h3 {
          margin: 0 0 4px;
          color: var(--ink);
        }

        .admin-lesson-checklist > div:not(.admin-lesson-note) {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 10px;
          border-radius: 8px;
          background: #fff;
        }

        .admin-lesson-checklist span {
          width: 9px;
          height: 9px;
          margin-top: 6px;
          border-radius: 999px;
          background: #f5a524;
          flex-shrink: 0;
        }

        .admin-lesson-checklist span.ready {
          background: #11a66a;
        }

        .admin-lesson-checklist p {
          display: grid;
          gap: 2px;
          margin: 0;
        }

        .admin-lesson-checklist small,
        .admin-lesson-note {
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .admin-lesson-note {
          padding: 12px;
          border-radius: 8px;
          background: var(--brand-soft);
          color: #075b8d;
        }

        @media (max-width: 1180px) {
          .admin-lesson-hero,
          .admin-lesson-form-grid {
            grid-template-columns: 1fr;
          }

          .admin-lesson-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .admin-lesson-hero,
          .admin-lesson-readiness {
            padding: 16px;
            border-radius: 8px;
          }

          .admin-lesson-copy {
            min-height: unset;
          }

          .admin-lesson-metrics,
          .admin-lesson-readiness-main,
          .admin-lesson-inline-fields {
            grid-template-columns: 1fr;
          }

          .admin-lesson-readiness,
          .admin-lesson-form-header,
          .admin-lesson-workbench > header {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
