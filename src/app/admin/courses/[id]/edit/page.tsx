'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  AdminCourseLifecycleActions,
  CourseLifecycleDialog,
} from '@/components/admin/AdminCourseLifecycleControls';
import { showToast } from '@/components/ui/Toast';
import { transitionAdminCourse } from '@/lib/admin-course-lifecycle-client';
import type { CourseLifecycleAction, CourseStatus } from '@/lib/course-lifecycle';

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
  const [lifecycleAction, setLifecycleAction] = useState<CourseLifecycleAction | null>(null);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '0',
    status: 'draft' as CourseStatus,
    thumbnailUrl: '',
    certificateColor: 'var(--primary)',
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
            certificateColor: data.course.certificateColor || 'var(--primary)',
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
      const { status: lifecycleStatus, ...courseDetails } = formData;
      void lifecycleStatus;
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseDetails, tagIds: selectedTagIds }),
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

  const handleLifecycleAction = async () => {
    if (!courseId || !lifecycleAction || lifecyclePending) return;
    setLifecyclePending(true);
    setError('');

    const result = await transitionAdminCourse({
      courseId,
      action: lifecycleAction,
      expectedStatus: formData.status,
    });

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, 'error');
      if (result.code === 'STATE_CONFLICT' || result.code === 'INVALID_RESPONSE') router.refresh();
      setLifecyclePending(false);
      return;
    }

    setFormData((current) => ({ ...current, status: result.course.status }));
    setLifecycleAction(null);
    setLifecyclePending(false);
    showToast(
      lifecycleAction === 'archive'
        ? 'เก็บคอร์สเข้าคลังแล้ว'
        : lifecycleAction === 'restore'
          ? 'นำคอร์สกลับเป็นแบบร่างแล้ว'
          : 'เผยแพร่คอร์สแล้ว',
      'success',
    );
    router.refresh();
  };

  const isFreeCourse = Number(formData.price || 0) <= 0;
  const isPublished = formData.status === 'published';
  const hasPromo = Boolean(formData.promoPrice) && Number(formData.promoPrice || 0) > 0;
  const normalizedSlug = formData.slug?.trim() || 'your-course-slug';
  const promoDiscount = hasPromo && Number(formData.price || 0) > 0
    ? Math.round((1 - Number(formData.promoPrice || 0) / Number(formData.price || 0)) * 100)
    : 0;
  const statusLabel = formData.status === 'archived'
    ? 'เก็บเข้าคลัง'
    : isPublished
      ? 'เผยแพร่'
      : 'แบบร่าง';
  const priceLabel = isFreeCourse ? 'ฟรี' : `฿${Number(formData.price || 0).toLocaleString()}`;
  const promoLabel = hasPromo ? `ลด ${promoDiscount}%` : 'ไม่มีโปรโมชัน';
  const coursePreviewUrl = `/courses/${normalizedSlug}`;
  const statusDetail = formData.status === 'archived'
    ? 'หยุดขายใหม่ ผู้เรียนเดิมยังเข้าเรียนได้'
    : isPublished
      ? 'ผู้ใช้มองเห็นและซื้อได้'
      : 'ยังไม่เผยแพร่';

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
            {isPublished ? <Link href={`/courses/${normalizedSlug}`} target="_blank">ดูหน้าเว็บ</Link> : null}
          </div>
        </aside>
      </section>

      <section className="admin-edit-course-metrics">
        {[
          { label: 'สถานะ', value: statusLabel, detail: statusDetail },
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
                  disabled
                  aria-describedby="course-status-help"
                >
                  <option value="draft">แบบร่าง</option>
                  <option value="published">เผยแพร่</option>
                  <option value="archived">เก็บเข้าคลัง</option>
                </select>
                <small id="course-status-help">สถานะคอร์สจัดการแยกจากการบันทึกรายละเอียด เพื่อป้องกันการเปิดหรือปิดขายโดยไม่ตั้งใจ</small>
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
                <div className="admin-edit-lifecycle-actions">
                  <span>เปลี่ยนสถานะคอร์ส</span>
                  <AdminCourseLifecycleActions
                    status={formData.status}
                    pending={lifecyclePending}
                    onRequest={(action) => {
                      setError('');
                      setLifecycleAction(action);
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        </aside>
      </form>

      {lifecycleAction ? (
        <CourseLifecycleDialog
          isOpen
          courseTitle={formData.title || 'คอร์สนี้'}
          action={lifecycleAction}
          pending={lifecyclePending}
          error={error}
          onConfirm={handleLifecycleAction}
          onCancel={() => {
            if (!lifecyclePending) setLifecycleAction(null);
          }}
        />
      ) : null}


    </div>
  );
}
