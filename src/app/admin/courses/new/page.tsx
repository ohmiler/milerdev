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
    certificateColor: '#02abff',
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

      <style>{`
        .new-course-page-shell {
          display: grid;
          gap: 20px;
          padding-bottom: 20px;
        }

        .new-course-hero,
        .new-course-section-card,
        .new-course-side-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
          border: 1px solid rgba(203, 213, 225, 0.86);
          border-radius: 8px;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.84);
        }

        .new-course-hero {
          position: relative;
          overflow: hidden;
          padding: 30px 32px;
        }

        .new-course-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at top right, rgba(2, 171, 255, 0.08), transparent 34%),
            linear-gradient(135deg, rgba(238, 250, 255, 0.8), rgba(255, 255, 255, 0));
        }

        .new-course-back-link-wrap,
        .new-course-hero-kicker,
        .new-course-title,
        .new-course-description,
        .new-course-hero-actions,
        .new-course-hero-focus {
          position: relative;
          z-index: 1;
        }

        .new-course-back-link {
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .new-course-hero-kicker {
          margin-top: 14px;
          margin-bottom: 12px;
          color: #0f172a;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .new-course-title {
          max-width: 840px;
          margin: 0;
          color: #0f172a;
          font-size: 2.3rem;
          line-height: 1.04;
          font-weight: 800;
        }

        .new-course-description {
          max-width: 860px;
          margin: 14px 0 0;
          color: #334155;
          font-size: 0.98rem;
          line-height: 1.85;
        }

        .new-course-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 18px;
        }

        .new-course-cta-primary,
        .new-course-primary-submit,
        .new-course-secondary-link,
        .new-course-reset-button {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
        }

        .new-course-cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 16px;
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 700;
        }

        .new-course-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .new-course-pill.is-warning {
          background: #fff7ed;
          color: #b45309;
        }

        .new-course-pill.is-success {
          background: #eefbf3;
          color: #15803d;
        }

        .new-course-pill.is-info {
          background: #eefaff;
          color: #0089d6;
        }

        .new-course-hero-focus {
          margin-top: 18px;
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.75;
          max-width: 900px;
        }

        .new-course-hero-focus span {
          color: #0f172a;
          font-weight: 700;
        }

        .new-course-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
        }

        .new-course-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.78fr);
          gap: 24px;
          align-items: start;
        }

        .new-course-main-column {
          display: grid;
          gap: 20px;
        }

        .new-course-section-card,
        .new-course-side-card {
          padding: 24px;
        }

        .new-course-section-card,
        .new-course-side-card,
        .new-course-mini-card {
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .new-course-section-card:hover,
        .new-course-side-card:hover,
        .new-course-mini-card:hover,
        .new-course-cta-primary:hover,
        .new-course-primary-submit:hover,
        .new-course-secondary-link:hover,
        .new-course-reset-button:hover {
          transform: translateY(-1px);
        }

        .new-course-section-head {
          margin-bottom: 18px;
        }

        .new-course-section-head h2,
        .new-course-side-head h2 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .new-course-section-head p,
        .new-course-side-head p {
          margin: 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.7;
        }

        .new-course-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .new-course-field-stack {
          margin-top: 20px;
        }

        .new-course-label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 600;
        }

        .new-course-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(203, 213, 225, 0.88);
          background: #ffffff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
          font-size: 1rem;
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .new-course-input:focus {
          outline: none;
          border-color: #02abff;
          box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.22);
        }

        .new-course-help-text {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .new-course-slug-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .new-course-slug-prefix {
          color: #64748b;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .new-course-reset-button {
          padding: 8px 12px;
          border: 1px solid #dbe5f4;
          border-radius: 8px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .new-course-mini-card {
          padding: 14px 16px;
          border-radius: 8px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(226, 232, 240, 0.96);
        }

        .new-course-mini-label {
          color: #64748b;
          font-size: 0.74rem;
          margin-bottom: 6px;
        }

        .new-course-mini-value {
          font-size: 1.15rem;
          font-weight: 800;
          line-height: 1.15;
        }

        .new-course-mini-value.tone-blue,
        .tone-blue {
          color: #0089d6;
        }

        .new-course-mini-value.tone-green,
        .tone-green {
          color: #15803d;
        }

        .new-course-mini-value.tone-amber,
        .tone-amber {
          color: #d97706;
        }

        .new-course-mini-detail {
          margin-top: 8px;
          color: #64748b;
          font-size: 0.76rem;
          line-height: 1.6;
        }

        .new-course-visual-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);
          gap: 20px;
          align-items: start;
        }

        .new-course-aside {
          display: grid;
        }

        .new-course-sticky {
          position: sticky;
          top: 96px;
          display: grid;
          gap: 16px;
        }

        .new-course-side-highlight {
          border-radius: 8px;
          border: 1px solid rgba(191, 219, 254, 0.94);
          background: linear-gradient(135deg, #eefaff 0%, #ffffff 100%);
          padding: 16px;
          display: grid;
          gap: 8px;
        }

        .new-course-side-highlight-kicker {
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .new-course-side-highlight-text {
          color: #0f172a;
          font-size: 0.92rem;
          line-height: 1.65;
          font-weight: 700;
        }

        .new-course-side-meta {
          display: grid;
          gap: 12px;
          margin-top: 6px;
        }

        .new-course-side-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(226, 232, 240, 0.96);
          color: #64748b;
          font-size: 0.82rem;
        }

        .new-course-side-meta-row strong {
          color: #0f172a;
          font-size: 0.95rem;
          line-height: 1.5;
          text-align: right;
        }

        .new-course-side-meta-row.is-column {
          align-items: flex-start;
          flex-direction: column;
        }

        .new-course-side-meta-row.is-column strong {
          word-break: break-word;
          text-align: left;
        }

        .new-course-side-meta-row.is-column small {
          color: #64748b;
          font-size: 0.76rem;
          line-height: 1.6;
        }

        .new-course-submit-wrap {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }

        .new-course-primary-submit {
          padding: 13px 18px;
          border: none;
          border-radius: 8px;
          background: #02abff;
          color: #ffffff;
          font-size: 0.96rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 14px 24px rgba(2, 171, 255, 0.18);
        }

        .new-course-primary-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .new-course-secondary-link {
          padding: 12px 18px;
          border-radius: 8px;
          border: 1px solid rgba(203, 213, 225, 0.88);
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          color: #475569;
          text-decoration: none;
          text-align: center;
          font-size: 0.94rem;
          font-weight: 600;
        }

        @media (max-width: 1120px) {
          .new-course-form-grid {
            grid-template-columns: 1fr;
          }

          .new-course-sticky {
            position: static;
            top: auto;
          }
        }

        @media (max-width: 720px) {
          .new-course-hero {
            padding: 24px 20px;
          }

          .new-course-title {
            font-size: 1.85rem;
          }

          .new-course-field-grid,
          .new-course-visual-grid {
            grid-template-columns: 1fr;
          }

          .new-course-slug-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
