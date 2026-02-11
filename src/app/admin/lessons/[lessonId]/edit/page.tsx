'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface Props {
  params: Promise<{ lessonId: string }>;
}

export default function EditLessonPage({ params }: Props) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState<string | null>(null);
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
    params.then(({ lessonId: id }) => {
      setLessonId(id);
      fetchLesson(id);
    });
  }, [params]);

  const fetchLesson = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lessons/${id}`);
      if (!res.ok) {
        showToast('ไม่พบบทเรียน', 'error');
        return;
      }
      const data = await res.json();
      const l = data.lesson as Lesson;
      setLesson(l);

      // Convert seconds to MM:SS
      const totalSeconds = l.videoDuration || 0;
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      setFormData({
        title: l.title,
        content: l.content || '',
        videoUrl: l.videoUrl || '',
        videoDuration: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        isFreePreview: l.isFreePreview || false,
      });
    } catch {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId) return;

    setSaving(true);

    try {
      // Convert MM:SS to seconds
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
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        ไม่พบบทเรียน
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/admin/courses/${lesson.courseId}/lessons`}
          style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          ← กลับไปจัดการบทเรียน
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '8px' }}>
          แก้ไขบทเรียน
        </h1>
      </div>

      {/* Edit Form */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              ชื่อบทเรียน *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              เนื้อหาบทเรียน (รายละเอียด, โค้ด, ลิงก์)
            </label>
            <RichTextEditor
              content={formData.content}
              onChange={(html) => setFormData({ ...formData, content: html })}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
              URL วิดีโอ
            </label>
            <input
              type="text"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="Bunny Video GUID หรือ Embed URL"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                ระยะเวลา (นาที:วินาที)
              </label>
              <input
                type="text"
                value={formData.videoDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9:]*$/.test(val)) {
                    setFormData({ ...formData, videoDuration: val });
                  }
                }}
                placeholder="เช่น 10:30 = 10 นาที 30 วินาที"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isFreePreview}
                  onChange={(e) => setFormData({ ...formData, isFreePreview: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: '#374151' }}>ดูได้ฟรี (Preview)</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <Link
              href={`/admin/courses/${lesson.courseId}/lessons`}
              style={{
                padding: '12px 24px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ยกเลิก
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
