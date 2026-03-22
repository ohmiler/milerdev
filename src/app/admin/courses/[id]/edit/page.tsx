'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });
const CertificateColorPicker = dynamic(() => import('@/components/admin/CertificateColorPicker'), { ssr: false });

export default function EditCoursePage() {
  const router = useRouter();
  const { id: courseId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
    status: 'draft',
    thumbnailUrl: '',
    certificateColor: '#2563eb',
    certificateHeaderImage: '',
    previewVideoUrl: '',
    promoPrice: '',
    promoStartsAt: '',
    promoEndsAt: '',
  });

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setFormData({
            title: data.course.title || '',
            slug: data.course.slug || '',
            description: data.course.description || '',
            price: String(data.course.price || 0),
            status: data.course.status || 'draft',
            thumbnailUrl: data.course.thumbnailUrl || '',
            certificateColor: data.course.certificateColor || '#2563eb',
            certificateHeaderImage: data.course.certificateHeaderImage || '',
            previewVideoUrl: data.course.previewVideoUrl || '',
            promoPrice: data.course.promoPrice ? String(data.course.promoPrice) : '',
            promoStartsAt: data.course.promoStartsAt ? new Date(data.course.promoStartsAt).toISOString().slice(0, 16) : '',
            promoEndsAt: data.course.promoEndsAt ? new Date(data.course.promoEndsAt).toISOString().slice(0, 16) : '',
          });
        }
        if (data.tags) {
          setSelectedTagIds(data.tags.map((t: { id: string }) => t.id));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/courses');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!courseId) return;
    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('ลบคอร์สสำเร็จ', 'success');
        router.push('/admin/courses');
      } else {
        const data = await res.json();
        showToast(data.error || 'ไม่สามารถลบคอร์สได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
  };

  const isFreeCourse = Number(formData.price || 0) <= 0;
  const isPublished = formData.status === 'published';
  const hasPromo = Boolean(formData.promoPrice) && Number(formData.promoPrice || 0) > 0;
  const normalizedSlug = formData.slug?.trim() || 'your-course-slug';
  const promoDiscount = hasPromo && Number(formData.price || 0) > 0
    ? Math.round((1 - Number(formData.promoPrice || 0) / Number(formData.price || 0)) * 100)
    : 0;
  const readinessItems = [
    {
      label: 'ชื่อคอร์ส',
      ready: formData.title.trim().length > 0,
      hint: formData.title.trim().length > 0 ? 'พร้อม' : 'ยังไม่ได้ระบุ',
    },
    {
      label: 'รูปภาพปก',
      ready: Boolean(formData.thumbnailUrl),
      hint: formData.thumbnailUrl ? 'เพิ่มแล้ว' : 'ควรมีเพื่อให้หน้าคอร์สดูน่าเชื่อถือ',
    },
    {
      label: 'รายละเอียดคอร์ส',
      ready: formData.description.trim().length > 0,
      hint: formData.description.trim().length > 0 ? 'มีข้อมูลแล้ว' : 'ช่วยเพิ่ม conversion บนหน้าคอร์ส',
    },
    {
      label: 'วิดีโอแนะนำ',
      ready: Boolean(formData.previewVideoUrl),
      hint: formData.previewVideoUrl ? 'ตั้งค่าแล้ว' : 'ใส่เพิ่มได้เพื่อช่วยขายคอร์ส',
    },
  ];
  const readinessCount = readinessItems.filter((item) => item.ready).length;
  const completionPercent = Math.round((readinessCount / readinessItems.length) * 100);
  const topPriorityAction = !formData.thumbnailUrl
    ? 'เริ่มจากเพิ่มภาพปก เพื่อให้หน้าคอร์สและการแชร์ลิงก์ดูพร้อมใช้งานมากขึ้น'
    : !formData.description.trim().length
      ? 'เติมคำอธิบายคอร์สเพื่อให้บริบทของคอนเทนต์และจุดขายชัดขึ้น'
      : !formData.previewVideoUrl
        ? 'เพิ่มวิดีโอแนะนำคอร์สเพื่อช่วยให้หน้าขายมีแรงดึงดูดมากขึ้น'
        : hasPromo && (!formData.promoStartsAt || !formData.promoEndsAt)
          ? 'ตรวจช่วงเวลาโปรโมชันให้ครบ เพื่อคุม pricing workflow ได้แม่นขึ้น'
          : 'ข้อมูลสำคัญดูครบดีแล้ว คุณสามารถบันทึกและไปตรวจบทเรียนหรือหน้าเว็บจริงต่อได้';
  const setupSignals = [
    {
      label: 'สถานะปัจจุบัน',
      value: isPublished ? 'เผยแพร่' : 'แบบร่าง',
      detail: isPublished ? 'หน้าเว็บมองเห็นคอร์สนี้ได้แล้ว' : 'คอร์สยังอยู่ในขั้นเตรียมข้อมูล',
      tone: isPublished ? '#16a34a' : '#d97706',
    },
    {
      label: 'ราคา',
      value: isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`,
      detail: hasPromo ? `มีโปรโมชันลด ${promoDiscount}%` : 'ยังไม่มีราคาโปรโมชั่น',
      tone: isFreeCourse ? '#16a34a' : '#2563eb',
    },
    {
      label: 'URL Preview',
      value: `/courses/${normalizedSlug}`,
      detail: 'ควรเปลี่ยนอย่างระมัดระวังถ้ามีการแชร์ลิงก์ไปแล้ว',
      tone: '#0f172a',
    },
    {
      label: 'โปรโมชั่น',
      value: hasPromo ? `ลด ${promoDiscount}%` : 'ยังไม่มี',
      detail: hasPromo
        ? formData.promoStartsAt || formData.promoEndsAt
          ? 'มีการกำหนดราคาโปรโมชันไว้แล้ว'
          : 'ตั้งราคาโปรโมชันแล้ว แต่ยังไม่ได้กำหนดช่วงเวลา'
        : 'คุณสามารถตั้งราคาโปรโมชันและช่วงเวลาได้จากส่วนการขาย',
      tone: hasPromo ? '#d97706' : '#64748b',
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
        <div style={{ display: 'grid', gap: '18px', maxWidth: '940px' }}>
          <div>
            <Link href="/admin/courses" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← กลับไปรายการคอร์ส
            </Link>
            <div style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '14px', marginBottom: '10px' }}>
              Edit Course
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.08, maxWidth: '820px' }}>
              ปรับรายละเอียดคอร์สให้ flow ชัดขึ้น ตั้งแต่ข้อมูลหลัก การขาย ไปจนถึงความพร้อมของหน้าเว็บ
            </h1>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '780px' }}>
              หน้านี้ถูกจัดใหม่ให้คุณแก้ไขข้อมูลสำคัญได้เป็นลำดับเดียว และใช้ sidebar ด้านข้างเป็นจุดสรุปสถานะ ความพร้อม และ action หลักของคอร์ส
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#course-edit-form" style={{ padding: '11px 16px', borderRadius: '999px', background: '#0f172a', color: 'white', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>
              แก้ไขรายละเอียดคอร์ส
            </a>
            <Link href={`/admin/courses/${courseId}/lessons`} style={{ padding: '11px 16px', borderRadius: '999px', background: 'white', color: '#0f172a', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700, border: '1px solid #e2e8f0' }}>
              จัดการบทเรียน
            </Link>
            <span style={{ padding: '8px 12px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 700 }}>
              พร้อมแล้ว {readinessCount}/{readinessItems.length} จุด
            </span>
          </div>

          <div style={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.75, maxWidth: '860px' }}>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>โฟกัสตอนนี้:</span> {topPriorityAction}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form id="course-edit-form" onSubmit={handleSubmit} style={{
        display: 'grid',
        gap: '20px',
      }}>
        <div className="edit-course-shell" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.22fr) minmax(300px, 0.78fr)',
          gap: '24px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ตัวตนและบริบทของคอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>อัปเดตชื่อคอร์ส URL คำอธิบาย และแท็ก เพื่อให้ข้อมูลหลักของคอร์สสอดคล้องกับการขาย การค้นหา และการดูแลต่อในระบบ</div>
              </div>

              <div className="edit-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    ชื่อคอร์ส *
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
                      borderRadius: '10px',
                      fontSize: '1rem',
                    }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    ชื่อที่ชัดจะช่วยทั้งการจัดการใน admin และการสื่อสารบนหน้าขาย
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    Slug (URL)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>/courses/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    หากคอร์สนี้ถูกแชร์ลิงก์ไปแล้ว ควรเปลี่ยน slug อย่างระมัดระวังเพื่อหลีกเลี่ยงการกระทบ URL เดิม
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                  คำอธิบาย
                </label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                  แท็ก
                </label>
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>การขาย สถานะ และโปรโมชัน</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>จัดการราคาหลัก สถานะการเผยแพร่ และราคาโปรโมชันจากส่วนเดียว เพื่อให้ commercial setup ของคอร์สชัดขึ้น</div>
              </div>

              <div className="edit-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                    }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    ใช้ `0` หากต้องการให้คอร์สเป็นแบบฟรี
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    สถานะ
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      background: 'white',
                    }}
                  >
                    <option value="draft">แบบร่าง</option>
                    <option value="published">เผยแพร่</option>
                  </select>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    ถ้ายังไม่พร้อมเปิดขายหรือเปิดเรียนจริง แนะนำให้คงเป็นแบบร่างก่อน
                  </div>
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span style={{ fontWeight: 600, color: '#92400e', fontSize: '1rem' }}>โปรโมชั่น</span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151', fontSize: '0.875rem' }}>
                    ราคาโปรโมชั่น (บาท)
                  </label>
                  <input
                    type="number"
                    value={formData.promoPrice}
                    onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                    min="0"
                    placeholder="ว่างไว้ถ้าไม่มีโปรโมชั่น"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9375rem',
                      background: 'white',
                    }}
                  />
                  {formData.promoPrice && parseFloat(formData.price) > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#d97706' }}>
                      ลด {Math.round((1 - parseFloat(formData.promoPrice || '0') / parseFloat(formData.price)) * 100)}% (จาก ฿{parseFloat(formData.price).toLocaleString()} เหลือ ฿{parseFloat(formData.promoPrice).toLocaleString()})
                    </div>
                  )}
                </div>

                <div className="edit-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151', fontSize: '0.875rem' }}>
                      เริ่มต้น
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.promoStartsAt}
                      onChange={(e) => setFormData({ ...formData, promoStartsAt: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        background: 'white',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151', fontSize: '0.875rem' }}>
                      สิ้นสุด
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.promoEndsAt}
                      onChange={(e) => setFormData({ ...formData, promoEndsAt: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        background: 'white',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#92400e' }}>
                  * ถ้าไม่กำหนดวันเริ่มต้น/สิ้นสุด โปรโมชั่นจะใช้ได้ตลอด
                </div>
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ภาพลักษณ์ของคอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>อัปเดตรูปภาพปก สี certificate และองค์ประกอบของใบรับรองให้สอดคล้องกับประสบการณ์ที่อยากให้ผู้เรียนเห็น</div>
              </div>

              <div className="edit-course-media-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(260px, 0.92fr)', gap: '20px', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    รูปภาพปก
                  </label>
                  <ImageUpload
                    value={formData.thumbnailUrl}
                    onChange={(url) => setFormData(prev => ({ ...prev, thumbnailUrl: url }))}
                    folder="courses"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    สีใบรับรอง (Certificate)
                  </label>
                  <CertificateColorPicker
                    value={formData.certificateColor}
                    onChange={(color) => setFormData(prev => ({ ...prev, certificateColor: color }))}
                  />
                </div>
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>สื่อและองค์ประกอบเพิ่มเติม</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เพิ่ม preview video และรูป header สำหรับใบรับรองเพื่อให้รายละเอียดของคอร์สและ certificate ครบขึ้น</div>
              </div>

              <div className="edit-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    วิดีโอแนะนำคอร์ส (Preview Video)
                  </label>
                  <input
                    type="text"
                    value={formData.previewVideoUrl}
                    onChange={(e) => setFormData({ ...formData, previewVideoUrl: e.target.value })}
                    placeholder="วาง URL วิดีโอจาก Bunny.net, YouTube, หรือ Vimeo"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                    }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#64748b' }}>
                    วิดีโอสั้นๆ แนะนำคอร์ส จะแสดงปุ่ม play บน thumbnail หน้า course detail
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    รูปภาพ Header ใบรับรอง (ทดแทนสีพื้นหลัง)
                  </label>
                  <ImageUpload
                    value={formData.certificateHeaderImage}
                    onChange={(url) => setFormData(prev => ({ ...prev, certificateHeaderImage: url }))}
                    folder="certificates"
                  />
                  <p style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#64748b' }}>
                    แนะนำขนาด 1800 × 500 px — ถ้าอัปโหลดรูปนี้จะใช้แทนพื้นหลังสี gradient ในใบรับรอง
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside style={{ display: 'grid', gap: '16px' }}>
            <div className="edit-course-sticky" style={{ position: 'sticky', top: '96px', display: 'grid', gap: '16px' }}>
              <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '20px', display: 'grid', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: 'white',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'grid',
                  gap: '10px',
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Course Snapshot</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.05 }}>{completionPercent}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', lineHeight: 1.7 }}>
                    พร้อมแล้ว {readinessCount}/{readinessItems.length} จุดสำหรับการใช้งานเชิงขายและประสบการณ์ผู้เรียน
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', lineHeight: 1.7 }}>{topPriorityAction}</div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {setupSignals.map((item, index) => (
                    <div key={item.label} style={{ padding: index === 0 ? '4px 0 10px' : '12px 0 10px', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.73rem', marginBottom: '6px' }}>{item.label}</div>
                      <div style={{ color: item.tone, fontSize: item.label === 'URL Preview' ? '0.94rem' : '1.08rem', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>{item.value}</div>
                      <div style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '6px', lineHeight: 1.6 }}>{item.detail}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link href={`/admin/courses/${courseId}/lessons`} style={{ padding: '9px 12px', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 }}>
                    จัดการบทเรียน
                  </Link>
                  <Link href={`/courses/${normalizedSlug}`} target="_blank" style={{ padding: '9px 12px', borderRadius: '999px', background: '#f8fafc', color: '#475569', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                    ดูหน้าเว็บ
                  </Link>
                </div>
              </section>

              <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '20px', display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ color: '#0f172a', fontSize: '0.98rem', fontWeight: 700, marginBottom: '6px' }}>Readiness Checklist</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>เช็กอย่างรวดเร็วว่าคอร์สนี้มีองค์ประกอบสำคัญครบพอสำหรับใช้งานเชิงธุรกิจและเชิงประสบการณ์ผู้เรียนหรือยัง</div>
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
                  <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>คำแนะนำถัดไป</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>ถ้าคอร์สพร้อมแล้ว แนะนำให้ตรวจบทเรียน หน้าเว็บจริง และ preview video เพื่อให้ flow ของผู้ใช้สมบูรณ์ก่อนโปรโมต</div>
                </div>
              </section>

              <div style={{ display: 'grid', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '13px 18px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
                <Link
                  href="/admin/courses"
                  style={{
                    padding: '12px 18px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '0.94rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  ยกเลิก
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '12px 18px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    fontSize: '0.94rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ลบคอร์ส
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>

      <style>{`
        @media (max-width: 1120px) {
          .edit-course-shell {
            grid-template-columns: 1fr !important;
          }

          .edit-course-sticky {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 720px) {
          .edit-course-field-grid,
          .edit-course-media-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="ลบคอร์ส"
        message="คุณแน่ใจหรือไม่ที่จะลบคอร์สนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบคอร์ส"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
