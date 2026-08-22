'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AdminButton,
  AdminPageHero,
  AdminPill,
  AdminRailCard,
  AdminSectionHeading,
  AdminSurfaceCard,
} from '@/components/admin/ui/AdminPrimitives';

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
    certificateColor: 'var(--primary)',
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tagIds: selectedTagIds,
          certificateColor: formData.certificateColor,
        }),
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
  const statusLabel = isPublished ? 'เผยแพร่' : 'แบบร่าง';
  const priceLabel = isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`;
  const coursePreviewUrl = `/courses/${normalizedSlug || 'your-course-slug'}`;
  const topPriorityAction =
    formData.title.trim().length === 0
      ? 'เริ่มจากตั้งชื่อคอร์สเพื่อให้ระบบช่วยสร้าง URL และโครงข้อมูลตั้งต้นให้ก่อน'
      : !formData.thumbnailUrl
        ? 'เพิ่มภาพปกเพื่อให้หน้าคอร์สดูพร้อมใช้งานและนำไปจัดวางต่อได้ทันที'
        : !formData.description.trim().length
          ? 'เติมคำอธิบายคอร์สเพื่อให้หน้าขายมีบริบทครบขึ้นก่อนกดสร้าง'
          : 'ข้อมูลตั้งต้นพร้อมแล้ว สามารถสร้างคอร์สและไปเพิ่มบทเรียนต่อได้ทันที';

  const setupHighlights = [
    {
      label: 'สถานะเริ่มต้น',
      value: statusLabel,
      tone: isPublished ? 'green' : 'amber',
      detail: isPublished ? 'คอร์สจะพร้อมแสดงทันทีหลังสร้าง' : 'เหมาะกับการเตรียมข้อมูลและตรวจสอบก่อนเปิดขาย',
    },
    {
      label: 'รูปแบบราคา',
      value: priceLabel,
      tone: isFreeCourse ? 'green' : 'blue',
      detail: isFreeCourse ? 'ใช้ราคา 0 เพื่อเริ่มเป็นคอร์สฟรี' : 'สามารถตั้งโปรโมชันภายหลังในหน้าจัดการคอร์สได้',
    },
  ];

  return (
    <div className="new-course-page-shell">
      <AdminPageHero
        eyebrow="Create New Course"
        title="สร้างคอร์สใหม่"
        description={
          <>
            สร้างคอร์สใหม่และกำหนดข้อมูลตั้งต้นที่สำคัญเพื่อให้หน้าขายและหน้าจัดการคอร์สมีบริบทครบขึ้นตั้งแต่เริ่มต้น
            ไม่ต้องกังวลว่าต้องกรอกข้อมูลทุกอย่างให้สมบูรณ์ในครั้งแรก เพราะสามารถกลับมาแก้ไขและเพิ่มข้อมูลได้ตลอดเวลาหลังจากสร้างคอร์สแล้ว
          </>
        }
        actions={
          <>
            <AdminButton href="#course-setup-form" tone="dark">เริ่มกรอกข้อมูล</AdminButton>
            <AdminPill tone={isPublished ? 'success' : 'warning'}>{statusLabel}</AdminPill>
            <AdminPill tone={isFreeCourse ? 'success' : 'info'}>{priceLabel}</AdminPill>
          </>
        }
        meta={<><strong>โฟกัสตอนนี้:</strong> {topPriorityAction}</>}
      >
        <div className="new-course-back-link-wrap">
          <Link href="/admin/courses" className="new-course-back-link">
            ← กลับไปรายการคอร์ส
          </Link>
        </div>
      </AdminPageHero>

      {error && <div className="new-course-error">{error}</div>}

      <form id="course-setup-form" onSubmit={handleSubmit} className="new-course-form-grid">
        <div className="new-course-main-column">
          <AdminSurfaceCard className="new-course-section-card">
            <AdminSectionHeading
              title="ตัวตนและบริบทของคอร์ส"
              description="เริ่มจากข้อมูลพื้นฐานที่ใช้ทั้งในหน้าขาย การค้นหา และการจัดการต่อในระบบ"
            />

            <div className="new-course-field-grid">
              <div>
                <label className="new-course-label">ชื่อคอร์ส *</label>
                <input
                  className="new-course-input"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      title: newTitle,
                      ...(!slugManuallyEdited ? { slug: generateSlug(newTitle) } : {}),
                    }));
                  }}
                  required
                  placeholder="เช่น JavaScript for Beginners"
                />
                <div className="new-course-help-text">
                  ตั้งชื่อให้ชัดพอที่จะใช้ได้ทั้งในหน้าขาย การจัดการภายใน และการค้นหาในระบบ
                </div>
              </div>

              <div>
                <label className="new-course-label">Slug (URL)</label>
                <div className="new-course-slug-row">
                  <span className="new-course-slug-prefix">/courses/</span>
                  <input
                    className="new-course-input"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setFormData((prev) => ({ ...prev, slug: e.target.value }));
                    }}
                    placeholder="auto-generated-from-title"
                  />
                  {slugManuallyEdited && (
                    <button
                      type="button"
                      className="new-course-reset-button"
                      onClick={() => {
                        setSlugManuallyEdited(false);
                        setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
                      }}
                    >
                      รีเซ็ต
                    </button>
                  )}
                </div>
                <div className="new-course-help-text">
                  URL นี้ใช้สำหรับหน้าคอร์สจริงบนเว็บ ควรสั้น อ่านง่าย และเปลี่ยนให้น้อยที่สุดเมื่อเริ่มมีการแชร์แล้ว
                </div>
              </div>
            </div>

            <div className="new-course-field-stack">
              <label className="new-course-label">คำอธิบาย</label>
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
              />
            </div>

            <div className="new-course-field-stack">
              <label className="new-course-label">แท็ก</label>
              <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
            </div>
          </AdminSurfaceCard>

          <AdminSurfaceCard className="new-course-section-card">
            <AdminSectionHeading
              title="รูปแบบการขายและการมองเห็น"
              description="กำหนดว่าคอร์สนี้จะเริ่มเป็นแบบร่างหรือเผยแพร่ทันที และอยู่ในรูปแบบฟรีหรือเสียเงิน"
            />

            <div className="new-course-field-grid">
              <div>
                <label className="new-course-label">ราคา (บาท)</label>
                <input
                  className="new-course-input"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0 = ฟรี"
                />
                <div className="new-course-help-text">
                  ใส่ `0` หากต้องการทำเป็นคอร์สฟรี และสามารถตั้งโปรโมชันเพิ่มภายหลังได้
                </div>
              </div>

              <div>
                <label className="new-course-label">สถานะ</label>
                <select
                  className="new-course-input"
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="draft">แบบร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
                <div className="new-course-help-text">
                  ถ้ายังไม่พร้อมเปิดขาย แนะนำให้เริ่มเป็นแบบร่างก่อนแล้วค่อยกลับมาเผยแพร่ภายหลัง
                </div>
              </div>
            </div>

            <div className="new-course-field-grid">
              {setupHighlights.map((item) => (
                <div key={item.label} className="new-course-mini-card">
                  <div className="new-course-mini-label">{item.label}</div>
                  <div className={`new-course-mini-value tone-${item.tone}`}>{item.value}</div>
                  <div className="new-course-mini-detail">{item.detail}</div>
                </div>
              ))}
            </div>
          </AdminSurfaceCard>

          <section className="new-course-section-card">
            <div className="new-course-section-head">
              <h2>ภาพลักษณ์และความพร้อมของหน้าเว็บ</h2>
              <p>เพิ่มภาพปกและเลือกสี certificate เพื่อให้หน้าคอร์สดูพร้อมใช้งานตั้งแต่การเปิดดูครั้งแรก</p>
            </div>

            <div className="new-course-visual-grid">
              <div>
                <label className="new-course-label">รูปภาพปก</label>
                <ImageUpload
                  value={formData.thumbnailUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, thumbnailUrl: url }))}
                  folder="courses"
                />
              </div>

              <div>
                <label className="new-course-label">สีใบรับรอง (Certificate)</label>
                <CertificateColorPicker
                  value={formData.certificateColor}
                  onChange={(color) => setFormData((prev) => ({ ...prev, certificateColor: color }))}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="new-course-aside">
          <div className="new-course-sticky">
            <AdminRailCard className="new-course-side-card">
              <AdminSectionHeading
                title="พร้อมสร้างคอร์ส"
                description="สรุปเฉพาะค่าที่ส่งผลกับ flow ตอนนี้ เพื่อให้เช็กและบันทึกได้จากจุดเดียว"
              />

              <div className="new-course-side-highlight">
                <div className="new-course-side-highlight-kicker">Next Move</div>
                <div className="new-course-side-highlight-text">{topPriorityAction}</div>
              </div>

              <div className="new-course-side-meta">
                <div className="new-course-side-meta-row">
                  <span>สถานะเริ่มต้น</span>
                  <strong className={isPublished ? 'tone-green' : 'tone-amber'}>{statusLabel}</strong>
                </div>
                <div className="new-course-side-meta-row">
                  <span>รูปแบบราคา</span>
                  <strong className={isFreeCourse ? 'tone-green' : 'tone-blue'}>{priceLabel}</strong>
                </div>
                <div className="new-course-side-meta-row is-column">
                  <span>URL Preview</span>
                  <strong>{coursePreviewUrl}</strong>
                  <small>
                    {slugManuallyEdited
                      ? 'กำหนด slug เองอยู่ สามารถปรับได้ก่อนบันทึก'
                      : 'ระบบจะ generate จากชื่อคอร์สให้อัตโนมัติ'}
                  </small>
                </div>
              </div>

              <div className="new-course-submit-wrap">
                <button className="new-course-primary-submit" type="submit" disabled={loading}>
                  {loading ? 'กำลังสร้าง...' : 'สร้างคอร์ส'}
                </button>
                <Link className="new-course-secondary-link" href="/admin/courses">
                  ยกเลิก
                </Link>
              </div>
            </AdminRailCard>
          </div>
        </aside>
      </form>


    </div>
  );
}
