'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    certificateColor: '#02abff',
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
            certificateColor: data.course.certificateColor || '#02abff',
            certificateHeaderImage: data.course.certificateHeaderImage || '',
            previewVideoUrl: data.course.previewVideoUrl || '',
            promoPrice: data.course.promoPrice ? String(data.course.promoPrice) : '',
            promoStartsAt: data.course.promoStartsAt ? new Date(data.course.promoStartsAt).toISOString().slice(0, 16) : '',
            promoEndsAt: data.course.promoEndsAt ? new Date(data.course.promoEndsAt).toISOString().slice(0, 16) : '',
          });
        }
        if (data.tags) {
          setSelectedTagIds(data.tags.map((tag: { id: string }) => tag.id));
        }
      })
      .catch(() => setError('โหลดข้อมูลคอร์สไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        showToast('บันทึกคอร์สสำเร็จ', 'success');
        router.push('/admin/courses');
      } else {
        setError(data.error || 'บันทึกคอร์สไม่สำเร็จ');
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
        showToast(data.error || 'ลบคอร์สไม่สำเร็จ', 'error');
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
  const statusLabel = isPublished ? 'เผยแพร่' : 'แบบร่าง';
  const priceLabel = isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`;
  const promoLabel = hasPromo ? `ลด ${promoDiscount}%` : 'ไม่มีโปรโมชัน';
  const coursePreviewUrl = `/courses/${normalizedSlug}`;

  const checklist = useMemo(() => [
    { label: 'ชื่อคอร์ส', ready: formData.title.trim().length > 0 },
    { label: 'คำอธิบาย', ready: formData.description.trim().length > 0 },
    { label: 'ภาพปก', ready: formData.thumbnailUrl.trim().length > 0 },
    { label: 'Preview video', ready: formData.previewVideoUrl.trim().length > 0 },
    { label: 'Slug', ready: formData.slug.trim().length > 0 },
  ], [formData.description, formData.previewVideoUrl, formData.slug, formData.thumbnailUrl, formData.title]);
  const readyCount = checklist.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / checklist.length) * 100);
  const nextAction = !formData.thumbnailUrl
    ? 'เพิ่มภาพปกก่อน เพื่อให้หน้าคอร์สและการแชร์ลิงก์ดูพร้อมใช้งาน'
    : !formData.description.trim()
      ? 'เติมคำอธิบายคอร์สให้ชัด เพื่อให้หน้าขายและ SEO มีบริบทครบ'
      : !formData.previewVideoUrl
        ? 'เพิ่มวิดีโอแนะนำคอร์ส เพื่อช่วยให้ผู้เรียนตัดสินใจเร็วขึ้น'
        : hasPromo && (!formData.promoStartsAt || !formData.promoEndsAt)
          ? 'ตรวจช่วงเวลาโปรโมชันให้ครบก่อนบันทึก'
          : 'ข้อมูลหลักพร้อมแล้ว ไปจัดการบทเรียนต่อได้เลย';

  if (loading) {
    return <div className="admin-edit-course-loading">กำลังโหลดคอร์ส...</div>;
  }

  return (
    <div className="admin-edit-course-page">
      <section className="admin-edit-course-hero">
        <div className="admin-edit-course-copy">
          <Link href="/admin/courses" className="admin-edit-course-back">← กลับไปคอร์สทั้งหมด</Link>
          <span className="admin-edit-course-kicker">Course editor</span>
          <h1>แก้ไขคอร์ส</h1>
          <p>
            ปรับข้อมูลคอร์สให้พร้อมทั้งด้านหน้าขาย การจัดการบทเรียน ราคา โปรโมชัน และภาพลักษณ์
            โดยมี summary ช่วยบอกว่าควรจัดการอะไรต่อ
          </p>
        </div>

        <aside className={isPublished ? 'admin-edit-priority published' : 'admin-edit-priority'}>
          <div>
            <span className="admin-edit-course-kicker">Next action</span>
            <h2>{nextAction}</h2>
          </div>
          <div className="admin-edit-priority-actions">
            <Link href={`/admin/courses/${courseId}/lessons`}>จัดการบทเรียน</Link>
            <Link href={`/courses/${normalizedSlug}`} target="_blank">ดูหน้าเว็บ</Link>
          </div>
        </aside>
      </section>

      <section className="admin-edit-course-metrics">
        {[
          { label: 'สถานะ', value: statusLabel, detail: isPublished ? 'ผู้ใช้มองเห็นได้' : 'ยังไม่เผยแพร่' },
          { label: 'ราคา', value: priceLabel, detail: isFreeCourse ? 'คอร์สฟรี' : 'ราคาหลักของคอร์ส' },
          { label: 'โปรโมชัน', value: promoLabel, detail: hasPromo ? 'มีราคาโปรโมชัน' : 'ใช้ราคาหลัก' },
          { label: 'ความพร้อม', value: `${readinessPercent}%`, detail: `${readyCount}/${checklist.length} รายการพร้อม` },
        ].map((item, index) => (
          <article className="admin-edit-course-metric" key={item.label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.value}</strong>
            <div>
              <b>{item.label}</b>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      {error ? <div className="admin-edit-error">{error}</div> : null}

      <form id="course-edit-form" onSubmit={handleSubmit} className="admin-edit-form-layout">
        <main className="admin-edit-main">
          <section className="admin-edit-card">
            <header>
              <span className="admin-edit-course-kicker">Identity</span>
              <h2>ตัวตนและบริบทของคอร์ส</h2>
              <p>ชื่อ URL คำอธิบาย และแท็ก เป็นข้อมูลหลักที่ใช้ทั้งบนหน้าขายและระบบ admin</p>
            </header>

            <div className="admin-edit-field-grid">
              <label>
                <span>ชื่อคอร์ส *</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  required
                />
                <small>ใช้ชื่อที่อ่านแล้วเข้าใจผลลัพธ์ของคอร์สทันที</small>
              </label>

              <label>
                <span>Slug</span>
                <div className="admin-edit-slug-row">
                  <em>/courses/</em>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(event) => setFormData({ ...formData, slug: event.target.value })}
                  />
                </div>
                <small>เปลี่ยนอย่างระมัดระวังหากเคยแชร์ลิงก์ไปแล้ว</small>
              </label>
            </div>

            <div className="admin-edit-field-stack admin-edit-field-group">
              <span>คำอธิบาย</span>
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
              />
            </div>

            <div className="admin-edit-field-stack admin-edit-field-group">
              <span>แท็ก</span>
              <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
            </div>
          </section>

          <section className="admin-edit-card">
            <header>
              <span className="admin-edit-course-kicker">Commerce</span>
              <h2>ราคา สถานะ และโปรโมชัน</h2>
              <p>จัดการการเผยแพร่และ pricing workflow ของคอร์สจาก section เดียว</p>
            </header>

            <div className="admin-edit-field-grid">
              <label>
                <span>ราคา (บาท)</span>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                />
                <small>ใส่ 0 หากต้องการให้เป็นคอร์สฟรี</small>
              </label>

              <label>
                <span>สถานะ</span>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                >
                  <option value="draft">แบบร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
                <small>เผยแพร่เมื่อภาพปก คำอธิบาย และบทเรียนพร้อมแล้ว</small>
              </label>
            </div>

            <div className="admin-edit-promo-box">
              <div>
                <span className="admin-edit-course-kicker">Promotion</span>
                <h3>ราคาโปรโมชัน</h3>
                <p>เว้นว่างไว้หากยังไม่ต้องการเปิดโปรโมชัน</p>
              </div>
              <div className="admin-edit-field-grid">
                <label>
                  <span>ราคาโปรโมชัน</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.promoPrice}
                    onChange={(event) => setFormData({ ...formData, promoPrice: event.target.value })}
                    placeholder="เช่น 990"
                  />
                  {hasPromo && Number(formData.price || 0) > 0 ? (
                    <small>ลด {promoDiscount}% จาก {priceLabel}</small>
                  ) : null}
                </label>

                <div className="admin-edit-date-grid">
                  <label>
                    <span>เริ่มต้น</span>
                    <input
                      type="datetime-local"
                      value={formData.promoStartsAt}
                      onChange={(event) => setFormData({ ...formData, promoStartsAt: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>สิ้นสุด</span>
                    <input
                      type="datetime-local"
                      value={formData.promoEndsAt}
                      onChange={(event) => setFormData({ ...formData, promoEndsAt: event.target.value })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-edit-card">
            <header>
              <span className="admin-edit-course-kicker">Media</span>
              <h2>ภาพลักษณ์ของคอร์ส</h2>
              <p>ภาพปก วิดีโอแนะนำ และ certificate assets ทำให้หน้าคอร์สดูพร้อมใช้งานขึ้นทันที</p>
            </header>

            <div className="admin-edit-media-grid">
              <label>
                <span>รูปภาพปก</span>
                <ImageUpload
                  value={formData.thumbnailUrl}
                  onChange={(url) => setFormData((prev) => ({ ...prev, thumbnailUrl: url }))}
                  folder="courses"
                />
              </label>

              <label>
                <span>สีใบรับรอง</span>
                <CertificateColorPicker
                  value={formData.certificateColor}
                  onChange={(color) => setFormData((prev) => ({ ...prev, certificateColor: color }))}
                />
              </label>
            </div>

            <div className="admin-edit-field-grid">
              <label>
                <span>วิดีโอแนะนำคอร์ส</span>
                <input
                  type="text"
                  value={formData.previewVideoUrl}
                  onChange={(event) => setFormData({ ...formData, previewVideoUrl: event.target.value })}
                  placeholder="Bunny.net, YouTube หรือ Vimeo URL"
                />
                <small>ใช้แสดงปุ่ม play บนหน้า course detail</small>
              </label>

              <label>
                <span>รูป Header ใบรับรอง</span>
                <ImageUpload
                  value={formData.certificateHeaderImage}
                  onChange={(url) => setFormData((prev) => ({ ...prev, certificateHeaderImage: url }))}
                  folder="certificates"
                />
                <small>แนะนำ 1800 x 500 px</small>
              </label>
            </div>
          </section>
        </main>

        <aside className="admin-edit-sidebar">
          <div className="admin-edit-sticky">
            <section className="admin-edit-side-card">
              <header>
                <span className="admin-edit-course-kicker">Save panel</span>
                <h2>พร้อมบันทึก</h2>
                <p>{nextAction}</p>
              </header>

              <div className="admin-edit-readiness">
                <div className="admin-edit-meter" style={{ '--course-ready': `${readinessPercent}%` } as CSSProperties}>
                  <strong>{readinessPercent}%</strong>
                </div>
                <div>
                  {checklist.map((item) => (
                    <span key={item.label} className={item.ready ? 'ready' : ''}>
                      <b /> {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-edit-side-meta">
                <div>
                  <span>สถานะ</span>
                  <strong className={isPublished ? 'success' : 'warning'}>{statusLabel}</strong>
                </div>
                <div>
                  <span>ราคา</span>
                  <strong>{priceLabel}</strong>
                </div>
                <div>
                  <span>URL</span>
                  <strong>{coursePreviewUrl}</strong>
                </div>
              </div>

              <div className="admin-edit-side-actions">
                <button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</button>
                <Link href={`/admin/courses/${courseId}/lessons`}>จัดการบทเรียน</Link>
                <Link href="/admin/courses">ยกเลิก</Link>
                <button type="button" className="danger" onClick={() => setShowDeleteConfirm(true)}>ลบคอร์ส</button>
              </div>
            </section>
          </div>
        </aside>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="ลบคอร์ส"
        message="คุณแน่ใจหรือไม่ที่จะลบคอร์สนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบคอร์ส"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <style>{`
        .admin-edit-course-page {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          display: grid;
          gap: 18px;
          color: var(--ink);
        }

        .admin-edit-course-loading {
          padding: 60px;
          color: #64758b;
          text-align: center;
        }

        .admin-edit-course-hero,
        .admin-edit-course-metric,
        .admin-edit-card,
        .admin-edit-side-card {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-edit-course-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: 18px;
          padding: 22px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(238, 250, 255, 0.92), rgba(255, 255, 255, 0.98) 48%), #fff;
        }

        .admin-edit-course-copy {
          display: grid;
          gap: 10px;
          align-content: center;
          min-height: 190px;
        }

        .admin-edit-course-back {
          width: fit-content;
          color: var(--muted);
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 700;
        }

        .admin-edit-course-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-edit-course-hero h1,
        .admin-edit-priority h2,
        .admin-edit-card h2,
        .admin-edit-side-card h2 {
          margin: 0;
          color: var(--ink);
          line-height: 1.22;
        }

        .admin-edit-course-hero h1 {
          font-size: clamp(2rem, 4vw, 3.45rem);
        }

        .admin-edit-course-hero p,
        .admin-edit-card p,
        .admin-edit-side-card p,
        .admin-edit-priority p {
          margin: 0;
          color: var(--muted);
          font-size: 0.96rem;
          line-height: 1.8;
        }

        .admin-edit-priority {
          display: grid;
          align-content: space-between;
          gap: 20px;
          padding: 20px;
          border-radius: 8px;
          background: #0b1220;
          color: #fff;
        }

        .admin-edit-priority.published {
          background: linear-gradient(135deg, #0b1220, #0f5132);
        }

        .admin-edit-priority h2 {
          margin-top: 8px;
          color: #fff;
          font-size: 1.28rem;
        }

        .admin-edit-priority-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-edit-priority-actions a {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--brand);
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.8rem;
        }

        .admin-edit-priority-actions a:last-child {
          background: rgba(255,255,255,0.12);
        }

        .admin-edit-course-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-edit-course-metric {
          display: grid;
          gap: 12px;
          min-height: 138px;
          padding: 18px;
          border-radius: 8px;
        }

        .admin-edit-course-metric > span {
          color: #a6b5c5;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .admin-edit-course-metric > strong {
          color: var(--ink);
          font-size: clamp(1.35rem, 2vw, 1.8rem);
          line-height: 1.1;
        }

        .admin-edit-course-metric p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-edit-error {
          padding: 12px 16px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fff1f2;
          color: #be123c;
          font-weight: 700;
        }

        .admin-edit-form-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.24fr) minmax(320px, 0.76fr);
          gap: 18px;
          align-items: start;
        }

        .admin-edit-main {
          display: grid;
          gap: 18px;
        }

        .admin-edit-card,
        .admin-edit-side-card {
          display: grid;
          gap: 18px;
          padding: 20px;
          border-radius: 8px;
        }

        .admin-edit-card header,
        .admin-edit-side-card header {
          display: grid;
          gap: 6px;
        }

        .admin-edit-field-grid,
        .admin-edit-media-grid,
        .admin-edit-date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .admin-edit-field-stack,
        .admin-edit-field-group,
        .admin-edit-card label,
        .admin-edit-promo-box label {
          display: grid;
          gap: 8px;
          color: var(--ink);
          font-weight: 800;
        }

        .admin-edit-card input,
        .admin-edit-card select,
        .admin-edit-promo-box input {
          width: 100%;
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #f7fbff;
          color: var(--ink);
          font-size: 0.95rem;
        }

        .admin-edit-card input:focus,
        .admin-edit-card select:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.2);
        }

        .admin-edit-card small,
        .admin-edit-promo-box small {
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.6;
          font-weight: 500;
        }

        .admin-edit-slug-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 8px;
          align-items: center;
        }

        .admin-edit-slug-row em {
          color: var(--muted);
          font-style: normal;
          font-weight: 700;
        }

        .admin-edit-promo-box {
          display: grid;
          gap: 16px;
          padding: 18px;
          border: 1px solid #ffe0a8;
          border-radius: 8px;
          background: #fff9ed;
        }

        .admin-edit-promo-box h3 {
          margin: 4px 0 4px;
          color: var(--ink);
        }

        .admin-edit-sidebar {
          display: grid;
        }

        .admin-edit-sticky {
          position: sticky;
          top: 96px;
        }

        .admin-edit-readiness {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        .admin-edit-meter {
          display: grid;
          place-items: center;
          width: 112px;
          height: 112px;
          border-radius: 999px;
          background: radial-gradient(circle closest-side, white 68%, transparent 69%), conic-gradient(var(--brand) var(--course-ready), #e8f1f8 0);
        }

        .admin-edit-meter strong {
          color: var(--ink);
          font-size: 1.3rem;
        }

        .admin-edit-readiness > div:last-child {
          display: grid;
          gap: 7px;
        }

        .admin-edit-readiness span {
          display: flex;
          gap: 8px;
          align-items: center;
          color: var(--muted);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .admin-edit-readiness b {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #f5a524;
        }

        .admin-edit-readiness span.ready b {
          background: #11a66a;
        }

        .admin-edit-side-meta {
          display: grid;
          gap: 10px;
        }

        .admin-edit-side-meta > div {
          display: grid;
          gap: 4px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .admin-edit-side-meta span {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .admin-edit-side-meta strong {
          color: var(--ink);
          word-break: break-word;
        }

        .admin-edit-side-meta strong.success {
          color: #0f7a4b;
        }

        .admin-edit-side-meta strong.warning {
          color: #b45309;
        }

        .admin-edit-side-actions {
          display: grid;
          gap: 9px;
        }

        .admin-edit-side-actions button,
        .admin-edit-side-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #fff;
          color: var(--ink);
          cursor: pointer;
          text-decoration: none;
          font-weight: 800;
        }

        .admin-edit-side-actions button:first-child {
          border-color: var(--brand);
          background: var(--brand);
          color: #fff;
        }

        .admin-edit-side-actions button.danger {
          border-color: #ffd5d8;
          background: #fff7f7;
          color: #be123c;
        }

        .admin-edit-side-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @media (max-width: 1180px) {
          .admin-edit-course-hero,
          .admin-edit-form-layout {
            grid-template-columns: 1fr;
          }

          .admin-edit-course-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-edit-sticky {
            position: static;
          }
        }

        @media (max-width: 760px) {
          .admin-edit-course-hero,
          .admin-edit-card,
          .admin-edit-side-card {
            padding: 16px;
            border-radius: 8px;
          }

          .admin-edit-course-copy {
            min-height: unset;
          }

          .admin-edit-course-metrics,
          .admin-edit-field-grid,
          .admin-edit-media-grid,
          .admin-edit-date-grid,
          .admin-edit-readiness {
            grid-template-columns: 1fr;
          }

          .admin-edit-slug-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
