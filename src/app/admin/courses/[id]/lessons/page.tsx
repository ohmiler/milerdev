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

  const totalLessons = lessons.length;
  const lessonsWithVideo = lessons.filter((lesson) => Boolean(lesson.videoUrl)).length;
  const lessonsWithoutVideo = totalLessons - lessonsWithVideo;
  const freePreviewCount = lessons.filter((lesson) => Boolean(lesson.isFreePreview)).length;
  const lessonsWithContent = lessons.filter((lesson) => lesson.content && lesson.content.trim().length > 0).length;
  const readinessPercent = totalLessons > 0 ? Math.round((lessonsWithVideo / totalLessons) * 100) : 0;
  const createReadinessItems = [
    {
      label: 'ชื่อบทเรียน',
      ready: formData.title.trim().length > 0,
      hint: formData.title.trim().length > 0 ? 'พร้อม' : 'ยังไม่ได้ระบุ',
    },
    {
      label: 'เนื้อหาบทเรียน',
      ready: formData.content.trim().length > 0,
      hint: formData.content.trim().length > 0 ? 'มีข้อมูลแล้ว' : 'ช่วยให้บทเรียนใช้งานได้ครบขึ้น',
    },
    {
      label: 'วิดีโอ',
      ready: formData.videoUrl.trim().length > 0,
      hint: formData.videoUrl.trim().length > 0 ? 'กำหนดแล้ว' : 'ใส่ภายหลังได้ แต่แนะนำให้เตรียมไว้',
    },
    {
      label: 'Preview ฟรี',
      ready: formData.isFreePreview,
      hint: formData.isFreePreview ? 'เปิดให้ดูฟรีแล้ว' : 'ยังไม่ได้เปิด preview',
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'radial-gradient(circle at top left, rgba(37,99,235,0.14), rgba(255,255,255,0.98) 44%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.9fr)',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <div>
              <Link href="/admin/courses" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
                ← กลับไปรายการคอร์ส
              </Link>
              <div style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '14px', marginBottom: '10px' }}>
                Lesson Management
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>
                จัดการบทเรียนให้เห็นทั้งโครงสร้าง ความพร้อมของวิดีโอ และบทที่ควรเติมก่อน
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '760px' }}>
                ใช้หน้านี้เพื่อจัดลำดับบทเรียน เพิ่มวิดีโอ ตั้งค่า preview ฟรี และตรวจว่าบทเรียนไหนยังไม่พร้อมสำหรับประสบการณ์การเรียนที่สมบูรณ์
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}>
              {[
                { label: 'บทเรียนทั้งหมด', value: totalLessons, tone: '#2563eb', description: 'จำนวนบทเรียนที่มีในคอร์สนี้ทั้งหมด' },
                { label: 'มีวิดีโอแล้ว', value: lessonsWithVideo, tone: '#16a34a', description: 'พร้อมเรียนในส่วนของวิดีโอ' },
                { label: 'ยังไม่มีวิดีโอ', value: lessonsWithoutVideo, tone: '#dc2626', description: 'ควรเติมเพื่อให้คอร์สสมบูรณ์ขึ้น' },
                { label: 'Preview ฟรี', value: freePreviewCount, tone: '#7c3aed', description: 'บทเรียนที่ผู้ใช้ยังไม่ซื้อสามารถดูได้' },
                { label: 'มีเนื้อหาแล้ว', value: lessonsWithContent, tone: '#d97706', description: 'บทเรียนที่มีข้อความประกอบหรือรายละเอียดแล้ว' },
              ].map((item) => (
                <div key={item.label} style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '20px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Course Readiness</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>สรุปคร่าว ๆ ว่าคอร์สนี้ไปได้ไกลแค่ไหนในมุมของการเตรียมบทเรียนและวิดีโอ</div>
            </div>
            <div style={{ borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px' }}>Video Coverage</div>
              <div style={{ color: readinessPercent >= 100 ? '#16a34a' : readinessPercent >= 60 ? '#d97706' : '#dc2626', fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1 }}>
                {readinessPercent}%
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '6px' }}>คิดจากจำนวนบทที่มีวิดีโอ เทียบกับบทเรียนทั้งหมด</div>
              <div style={{ marginTop: '12px', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${readinessPercent}%`, height: '100%', background: readinessPercent >= 100 ? '#16a34a' : '#2563eb', borderRadius: '999px' }} />
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              <span>+ เพิ่มบทเรียนใหม่</span>
              <span style={{ opacity: 0.9 }}>→</span>
            </button>
            <div style={{ borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>เคล็ดลัด</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>ลากเพื่อจัดลำดับบทเรียน และใช้ inline action สำหรับเติมวิดีโอได้เร็วขึ้นโดยไม่ต้องออกจากหน้า</div>
            </div>
          </div>
        </div>
      </section>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 0.85fr)', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
                เพิ่มบทเรียนใหม่
              </h2>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '20px' }}>
                ตั้งชื่อบทเรียน เนื้อหา วิดีโอ และสิทธิ์ preview ให้พร้อมตั้งแต่ต้น เพื่อให้ workflow ของการสร้างเนื้อหาลื่นไหลขึ้น
              </div>

              <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
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
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                เนื้อหาบทเรียน (รายละเอียด, โค้ด, ลิงก์)
              </label>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
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
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                รองรับ Bunny Video GUID หรือ Embed URL เพื่อให้ระบบใช้กับ player ของคอร์สได้ต่อเนื่อง
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
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
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                  ตัวอย่าง `10:30` หมายถึง 10 นาที 30 วินาที
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', width: '100%' }}>
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

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px' }}>New Lesson Checklist</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {createReadinessItems.map((item) => (
                    <div key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '999px', background: item.ready ? '#16a34a' : '#f59e0b', marginTop: '6px', flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>{item.label}</div>
                        <div style={{ color: item.ready ? '#166534' : '#92400e', fontSize: '0.76rem', lineHeight: 1.6 }}>{item.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px' }}>
                <div style={{ color: '#1d4ed8', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>Best Practice</div>
                <div style={{ color: '#1e40af', fontSize: '0.78rem', lineHeight: 1.7 }}>
                  ถ้าบทนี้เป็นตัวอย่างสำหรับคนที่ยังไม่ซื้อคอร์ส ให้เปิด `Preview` และใส่วิดีโอให้พร้อม เพื่อช่วย conversion ของหน้าคอร์ส
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lessons List with Drag & Drop */}
      <div style={{
        background: 'white',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
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
