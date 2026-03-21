'use client';

import { useState, useEffect } from 'react';
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

  const hasVideo = formData.videoUrl.trim().length > 0;
  const hasContent = formData.content.trim().length > 0;
  const durationLabel = formData.videoDuration || '0:00';
  const readinessItems = [
    {
      label: 'ชื่อบทเรียน',
      ready: formData.title.trim().length > 0,
      hint: formData.title.trim().length > 0 ? 'พร้อม' : 'ยังไม่ได้ระบุ',
    },
    {
      label: 'เนื้อหาบทเรียน',
      ready: hasContent,
      hint: hasContent ? 'มีข้อมูลแล้ว' : 'ควรมีเพื่อให้บทเรียนสมบูรณ์',
    },
    {
      label: 'วิดีโอ',
      ready: hasVideo,
      hint: hasVideo ? 'ตั้งค่าแล้ว' : 'ยังไม่มี URL วิดีโอ',
    },
    {
      label: 'Preview ฟรี',
      ready: formData.isFreePreview,
      hint: formData.isFreePreview ? 'เปิดให้ดูฟรีแล้ว' : 'ยังไม่ได้เปิด preview',
    },
  ];

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
              <Link
                href={`/admin/courses/${lesson.courseId}/lessons`}
                style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}
              >
                ← กลับไปจัดการบทเรียน
              </Link>
              <div style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '14px', marginBottom: '10px' }}>
                Edit Lesson
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>
                แก้ไขบทเรียนให้พร้อมใช้งาน ทั้งด้านเนื้อหา วิดีโอ และ preview experience
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '760px' }}>
                ใช้หน้านี้เพื่อปรับปรุงรายละเอียดของบทเรียนให้ครบถ้วนก่อนกลับไปจัดลำดับหรือเช็กภาพรวมของคอร์ส
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>วิดีโอ</div>
                <div style={{ color: hasVideo ? '#16a34a' : '#d97706', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{hasVideo ? 'พร้อม' : 'ยังไม่มี'}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{hasVideo ? 'บทเรียนนี้มี video source แล้ว' : 'ควรใส่เพื่อให้บทเรียนเรียนได้สมบูรณ์'}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>ระยะเวลา</div>
                <div style={{ color: '#2563eb', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{durationLabel}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>ใช้แสดงบนหน้าคอร์สและช่วยให้ผู้เรียนคาดการณ์เวลาได้</div>
              </div>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>Preview</div>
                <div style={{ color: formData.isFreePreview ? '#7c3aed' : '#64748b', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{formData.isFreePreview ? 'ฟรี' : 'Private'}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{formData.isFreePreview ? 'ผู้ใช้ที่ยังไม่ซื้อคอร์สสามารถดูบทนี้ได้' : 'เข้าถึงได้เฉพาะผู้ที่มีสิทธิ์ในคอร์ส'}</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '20px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Lesson Readiness</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เช็กความพร้อมของบทเรียนนี้แบบเร็ว ๆ ก่อนบันทึก</div>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {readinessItems.map((item) => (
                <div key={item.label} style={{ borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.ready ? '#16a34a' : '#f59e0b', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ color: item.ready ? '#166534' : '#92400e', fontSize: '0.8rem', fontWeight: 600 }}>{item.hint}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>คำแนะนำ</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>ถ้าบทนี้ใช้เป็น sample lesson แนะนำให้เปิด preview ฟรีและใส่วิดีโอให้พร้อม เพื่อช่วย conversion ของหน้าคอร์ส</div>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        <section style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
        }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ข้อมูลหลักของบทเรียน</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ตั้งชื่อและเนื้อหาบทเรียนให้ชัดเจน เพื่อให้ทั้งผู้เรียนและทีมงานเข้าใจจุดประสงค์ของบทนี้</div>
          </div>

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
        </section>

        <section style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
        }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>วิดีโอและการเข้าถึง</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>กำหนดแหล่งวิดีโอ ระยะเวลา และสิทธิ์ preview ของบทเรียนนี้</div>
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
              รองรับ Bunny Video GUID หรือ Embed URL เพื่อให้ระบบเชื่อมกับ player ของคอร์สได้ต่อเนื่อง
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
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
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
              borderRadius: '10px',
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
  );
}
