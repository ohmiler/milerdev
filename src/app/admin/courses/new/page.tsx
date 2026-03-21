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
                Create New Course
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>
                สร้างคอร์สใหม่ให้ข้อมูลครบและพร้อมไปต่อในขั้นแก้ไขบทเรียน
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '760px' }}>
                หน้านี้โฟกัสที่การตั้งข้อมูลพื้นฐานของคอร์ส เช่น ชื่อ URL ราคา สถานะ ภาพปก แท็ก และธีมใบรับรอง เพื่อให้คอร์สถูกสร้างอย่างเป็นระบบตั้งแต่ต้น
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>สถานะเริ่มต้น</div>
                <div style={{ color: isPublished ? '#16a34a' : '#d97706', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{isPublished ? 'เผยแพร่' : 'แบบร่าง'}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{isPublished ? 'คอร์สจะมองเห็นได้ทันทีหลังสร้าง' : 'เหมาะสำหรับเตรียมข้อมูลก่อนค่อยเปิดขาย'}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>รูปแบบราคา</div>
                <div style={{ color: isFreeCourse ? '#16a34a' : '#2563eb', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{isFreeCourse ? 'ใช้ราคา 0 เพื่อสร้างคอร์สฟรี' : 'สามารถตั้งโปรโมชั่นภายหลังในหน้าจัดการคอร์ส'}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>URL Preview</div>
                <div style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  /courses/{normalizedSlug || 'your-course-slug'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{slugManuallyEdited ? 'คุณกำลังกำหนด slug เอง' : 'ระบบจะ generate จากชื่อคอร์สให้อัตโนมัติ'}</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '20px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Readiness Checklist</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ใช้เช็กอย่างรวดเร็วว่าข้อมูลตั้งต้นครบพอสำหรับสร้างคอร์สและไปทำงานต่อในหน้าถัดไปหรือยัง</div>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {readinessItems.map((item) => (
                <div key={item.label} style={{ borderRadius: '14px', background: 'white', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.ready ? '#16a34a' : '#f59e0b', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ color: item.ready ? '#166534' : '#92400e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{item.hint}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>หลังจากสร้างแล้ว</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>แนะนำให้เข้าไปเพิ่มบทเรียน ตั้ง preview video และตรวจหน้าคอร์สจริงก่อนเปิดขายเต็มรูปแบบ</div>
            </div>
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
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gap: '20px',
      }}>
        <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ข้อมูลพื้นฐานของคอร์ส</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ส่วนนี้กำหนดตัวตนหลักของคอร์ส ได้แก่ ชื่อ URL คำอธิบาย และแท็กสำหรับจัดหมวดหมู่</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
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
          </div>

          <div style={{ marginBottom: '20px' }}>
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
              คำอธิบาย
            </label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
            />
          </div>

          <div>
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
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ราคาและสถานะการเผยแพร่</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>กำหนดว่าคอร์สนี้เป็นคอร์สฟรีหรือคอร์สเสียเงิน และจะสร้างออกมาเป็น draft หรือเผยแพร่ทันที</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
        </section>

        <section style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)', padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>ภาพลักษณ์ของคอร์ส</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>กำหนดภาพปกและสีใบรับรองเพื่อให้คอร์สดูพร้อมใช้งานบนหน้าเว็บและใบประกาศ</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
              สีใบรับรอง (Certificate)
            </label>
            <CertificateColorPicker
              value={formData.certificateColor}
              onChange={(color) => setFormData(prev => ({ ...prev, certificateColor: color }))}
            />
          </div>

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
        </section>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างคอร์ส'}
          </button>
          <Link
            href="/admin/courses"
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
