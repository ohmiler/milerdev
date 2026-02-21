'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DraggableLessonList from '@/components/admin/DraggableLessonList';
import dynamic from 'next/dynamic';
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

export default function ManageLessonsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    videoUrl: '',
    videoDuration: '0:00',
    isFreePreview: false,
  });
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  const fetchLessons = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/courses/${id}/lessons`);
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setSaving(true);

    try {
      // Convert MM:SS to seconds before sending
      let durationInSeconds = 0;
      if (formData.videoDuration.includes(':')) {
        const [m, s] = formData.videoDuration.split(':');
        durationInSeconds = (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
      } else {
        durationInSeconds = Math.round(parseFloat(formData.videoDuration) * 60) || 0;
      }

      const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          videoDuration: durationInSeconds,
        }),
      });

      if (res.ok) {
        await fetchLessons(courseId);
        resetForm();
        showToast('เพิ่มบทเรียนสำเร็จ', 'success');
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
        showToast(data.error || 'ไม่สามารถลบบทเรียนได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/courses" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← กลับไปรายการคอร์ส
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
            จัดการบทเรียน ({lessons.length} บท)
          </h1>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              padding: '12px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + เพิ่มบทเรียน
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
            เพิ่มบทเรียนใหม่
          </h2>

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
                    // Allow digits and colon only
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
                {saving ? 'กำลังบันทึก...' : 'เพิ่มบทเรียน'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '12px 24px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons List with Drag & Drop */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}>
        <DraggableLessonList
          lessons={lessons}
          courseId={courseId || ''}
          onDelete={(id) => setDeletingLessonId(id)}
          onReorder={(newIds) => {
            // Update local state to match new order
            const reordered = newIds.map(id => lessons.find(l => l.id === id)!).filter(Boolean);
            setLessons(reordered);
          }}
        />
      </div>

      <ConfirmDialog
        isOpen={!!deletingLessonId}
        title="ลบบทเรียน"
        message="คุณแน่ใจหรือไม่ที่จะลบบทเรียนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบบทเรียน"
        onConfirm={confirmDeleteLesson}
        onCancel={() => setDeletingLessonId(null)}
      />
    </div>
  );
}
