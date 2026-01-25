'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DraggableLessonList from '@/components/admin/DraggableLessonList';

interface Lesson {
  id: string;
  title: string;
  videoUrl: string | null;
  videoDuration: number | null;
  orderIndex: number | null;
  isFreePreview: boolean | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function ManageLessonsPage({ params }: Props) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    videoUrl: '',
    videoDuration: '0',
    isFreePreview: false,
  });

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
    params.then(({ id }) => {
      setCourseId(id);
      fetchLessons(id).finally(() => setLoading(false));
    });
  }, [params]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      videoUrl: '',
      videoDuration: '0',
      isFreePreview: false,
    });
    setEditingLesson(null);
    setShowForm(false);
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    // Convert seconds to minutes for display
    const durationInMinutes = lesson.videoDuration ? (lesson.videoDuration / 60).toFixed(1) : '0';
    setFormData({
      title: lesson.title,
      content: '',
      videoUrl: lesson.videoUrl || '',
      videoDuration: durationInMinutes,
      isFreePreview: lesson.isFreePreview || false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setSaving(true);

    try {
      const url = editingLesson
        ? `/api/admin/lessons/${editingLesson.id}`
        : `/api/admin/courses/${courseId}/lessons`;

      // Convert minutes to seconds before sending
      const durationInSeconds = Math.round(parseFloat(formData.videoDuration) * 60) || 0;

      const res = await fetch(url, {
        method: editingLesson ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          videoDuration: durationInSeconds,
        }),
      });

      if (res.ok) {
        await fetchLessons(courseId);
        resetForm();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบบทเรียนนี้?')) return;
    if (!courseId) return;

    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchLessons(courseId);
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถลบบทเรียนได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
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
            {editingLesson ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียนใหม่'}
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
                URL วิดีโอ
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://vimeo.com/123456"
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
                  ระยะเวลา (นาที)
                </label>
                <input
                  type="number"
                  value={formData.videoDuration}
                  onChange={(e) => setFormData({ ...formData, videoDuration: e.target.value })}
                  min="0"
                  step="0.5"
                  placeholder="เช่น 10.5 = 10 นาที 30 วินาที"
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
                {saving ? 'กำลังบันทึก...' : editingLesson ? 'บันทึก' : 'เพิ่มบทเรียน'}
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={(newIds) => {
            // Update local state to match new order
            const reordered = newIds.map(id => lessons.find(l => l.id === id)!).filter(Boolean);
            setLessons(reordered);
          }}
        />
      </div>
    </div>
  );
}
