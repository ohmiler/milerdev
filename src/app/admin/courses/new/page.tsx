'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });
const ImageUpload = dynamic(() => import('@/components/admin/ImageUpload'), { ssr: false });
const TagSelector = dynamic(() => import('@/components/admin/TagSelector'), { ssr: false });
const CertificateColorPicker = dynamic(() => import('@/components/admin/CertificateColorPicker'), { ssr: false });

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
    status: 'draft',
    thumbnailUrl: '',
    certificateColor: '#2563eb',
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTagIds, certificateColor: formData.certificateColor }),
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
      setLoading(false);
    }
  };

  const normalizedSlug = formData.slug || generateSlug(formData.title);
  const isFreeCourse = Number(formData.price || 0) <= 0;
  const isPublished = formData.status === 'published';
  const topPriorityAction = formData.title.trim().length === 0
    ? 'เริ่มจากตั้งชื่อคอร์สและให้ระบบช่วย generate URL ให้ก่อน'
    : !formData.thumbnailUrl
      ? 'เพิ่มภาพปกเพื่อให้หน้าคอร์สดูพร้อมใช้งานและน่าเชื่อถือขึ้น'
      : !formData.description.trim().length
        ? 'เติมคำอธิบายคอร์สเพื่อให้หน้าขายมีบริบทและ conversion ดีขึ้น'
        : 'ข้อมูลตั้งต้นพร้อมแล้ว สร้างคอร์สและไปเพิ่มบทเรียนต่อได้ทันที';
  const setupSignals = [
    {
      label: 'สถานะเริ่มต้น',
      value: isPublished ? 'เผยแพร่' : 'แบบร่าง',
      detail: isPublished ? 'คอร์สจะมองเห็นได้ทันทีหลังสร้าง' : 'เหมาะสำหรับเตรียมข้อมูลก่อนค่อยเปิดขาย',
      tone: isPublished ? '#16a34a' : '#d97706',
    },
    {
      label: 'รูปแบบราคา',
      value: isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`,
      detail: isFreeCourse ? 'ใช้ราคา 0 เพื่อสร้างคอร์สฟรี' : 'สามารถตั้งโปรโมชั่นภายหลังในหน้าจัดการคอร์ส',
      tone: isFreeCourse ? '#16a34a' : '#2563eb',
    },
    {
      label: 'URL Preview',
      value: `/courses/${normalizedSlug || 'your-course-slug'}`,
      detail: slugManuallyEdited ? 'คุณกำลังกำหนด slug เอง' : 'ระบบจะ generate จากชื่อคอร์สให้อัตโนมัติ',
      tone: '#0f172a',
    },
  ];
  const readinessItems = [
    {
      label: 'ชื่อคอร์ส',
      ready: formData.title.trim().length > 0,
      hint: formData.title.trim().length > 0 ? 'พร้อม' : 'ยังไม่ได้ระบุ',
    },
    {
      label: 'Slug URL',
      ready: normalizedSlug.trim().length > 0,
      hint: normalizedSlug.trim().length > 0 ? `/courses/${normalizedSlug}` : 'จะสร้างอัตโนมัติจากชื่อคอร์ส',
    },
    {
      label: 'รูปภาพปก',
      ready: Boolean(formData.thumbnailUrl),
      hint: formData.thumbnailUrl ? 'เพิ่มแล้ว' : 'แนะนำให้ใส่ก่อนเผยแพร่',
    },
    {
      label: 'รายละเอียดคอร์ส',
      ready: formData.description.trim().length > 0,
      hint: formData.description.trim().length > 0 ? 'มีข้อมูลแล้ว' : 'ช่วยให้หน้าขายครบขึ้น',
    },
  ];
  const readinessCount = readinessItems.filter((item) => item.ready).length;
  const completionPercent = Math.round((readinessCount / readinessItems.length) * 100);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 36%, #fffaf4 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '28px',
        padding: '32px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'grid', gap: '18px', maxWidth: '920px' }}>
          <div>
            <Link href="/admin/courses" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← กลับไปรายการคอร์ส
            </Link>
            <div style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '14px', marginBottom: '12px' }}>
              Create New Course
            </div>
            <h1 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.04, maxWidth: '800px' }}>
              สร้างคอร์สใหม่ให้ flow ชัดตั้งแต่ชื่อคอร์ส ไปจนถึงความพร้อมสำหรับส่งต่อไปจัดบทเรียน
            </h1>
            <p style={{ color: '#334155', fontSize: '0.98rem', lineHeight: 1.85, maxWidth: '780px' }}>
              หน้านี้ถูกจัดใหม่ให้คุณโฟกัสกับการตั้งตัวตนของคอร์ส ราคา สถานะ ภาพปก และโทนของ certificate แบบเป็นลำดับเดียว ไม่ต้องสลับอ่านหลายกล่องใน viewport แรก
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#course-setup-form" style={{ padding: '11px 16px', borderRadius: '999px', background: '#0f172a', color: 'white', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>
              เริ่มกรอกข้อมูล
            </a>
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
      <form id="course-setup-form" onSubmit={handleSubmit} style={{
        display: 'grid',
        gap: '20px',
      }}>
        <div className="new-course-shell" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.78fr)',
          gap: '24px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ตัวตนและบริบทของคอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เริ่มจากข้อมูลที่นิยามคอร์สให้ชัดก่อน ได้แก่ ชื่อ URL คำอธิบาย และแท็ก เพื่อให้การจัดการต่อในหน้าถัดไปเป็นระบบมากขึ้น</div>
              </div>

              <div className="new-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    ชื่อคอร์ส *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        title: newTitle,
                        ...(!slugManuallyEdited ? { slug: generateSlug(newTitle) } : {}),
                      }));
                    }}
                    required
                    placeholder="เช่น JavaScript for Beginners"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                    }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    ตั้งชื่อให้ชัดพอที่จะใช้ทั้งในหน้าขาย การจัดการภายใน และการค้นหาในระบบ
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
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setFormData({ ...formData, slug: e.target.value });
                      }}
                      placeholder="auto-generated-from-title"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '1rem',
                      }}
                    />
                    {slugManuallyEdited && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlugManuallyEdited(false);
                          setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
                        }}
                        style={{
                          padding: '8px 12px',
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#475569',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    URL นี้ใช้สำหรับหน้าคอร์สจริงบนเว็บ ควรสั้น อ่านง่าย และเปลี่ยนให้น้อยที่สุดเมื่อเริ่มมีการแชร์ลิงก์แล้ว
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
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>รูปแบบการขายและการมองเห็น</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>กำหนดว่าคอร์สนี้จะเริ่มเป็นแบบร่างหรือเผยแพร่ทันที และอยู่ในรูปแบบฟรีหรือเสียเงิน</div>
              </div>

              <div className="new-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    placeholder="0 = ฟรี"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                    }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>
                    ใส่ `0` หากต้องการทำเป็นคอร์สฟรี และสามารถตั้งโปรโมชั่นเพิ่มเติมในภายหลังได้
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
                    ถ้ายังไม่พร้อมเปิดขาย แนะนำให้สร้างเป็นแบบร่างก่อน แล้วค่อยเพิ่มบทเรียนและตรวจหน้าคอร์สให้ครบ
                  </div>
                </div>
              </div>

              <div className="new-course-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginTop: '18px' }}>
                {setupSignals.slice(0, 2).map((item) => (
                  <div key={item.label} style={{ padding: '14px 16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.74rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ color: item.tone, fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.15 }}>{item.value}</div>
                    <div style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '8px', lineHeight: 1.6 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ภาพลักษณ์และความพร้อมของหน้าเว็บ</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>เพิ่มภาพปกและเลือกสี certificate เพื่อให้หน้าคอร์สดูพร้อมใช้งานตั้งแต่การเปิดดูครั้งแรก</div>
              </div>

              <div className="new-course-visual-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(260px, 0.92fr)', gap: '20px', alignItems: 'start' }}>
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
          </div>

          <aside style={{ display: 'grid', gap: '16px' }}>
            <div className="new-course-sticky" style={{ position: 'sticky', top: '96px', display: 'grid', gap: '16px' }}>
              <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '20px', display: 'grid', gap: '14px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: 'white',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'grid',
                  gap: '10px',
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Setup Snapshot</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.05 }}>{completionPercent}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', lineHeight: 1.7 }}>
                    พร้อมแล้ว {readinessCount}/{readinessItems.length} จุดสำหรับการสร้างคอร์สใหม่
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
              </section>

              <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '20px', display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ color: '#0f172a', fontSize: '0.98rem', fontWeight: 700, marginBottom: '6px' }}>Readiness Checklist</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>ใช้เช็กอย่างรวดเร็วว่าข้อมูลตั้งต้นครบพอสำหรับสร้างคอร์สและไปทำงานต่อในหน้าถัดไปหรือยัง</div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {readinessItems.map((item) => (
                    <div key={item.label} style={{ borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.ready ? '#16a34a' : '#f59e0b', marginTop: '6px', flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ color: item.ready ? '#166534' : '#92400e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{item.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                  <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>หลังจากสร้างแล้ว</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>แนะนำให้เข้าไปเพิ่มบทเรียน ตั้ง preview video และตรวจหน้าคอร์สจริงก่อนเปิดขายเต็มรูปแบบ</div>
                </div>
              </section>

              <div style={{ display: 'grid', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '13px 18px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างคอร์ส'}
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
              </div>
            </div>
          </aside>
        </div>
      </form>
      <style>{`
        @media (max-width: 1120px) {
          .new-course-shell {
            grid-template-columns: 1fr !important;
          }

          .new-course-sticky {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 720px) {
          .new-course-field-grid,
          .new-course-visual-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
