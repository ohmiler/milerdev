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


    </div>
  );
}
