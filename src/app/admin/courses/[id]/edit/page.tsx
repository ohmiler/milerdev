'use client';

import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  AdminCourseLifecycleActions,
  CourseLifecycleDialog,
} from '@/components/admin/AdminCourseLifecycleControls';
import {
  AdminErrorState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { showToast } from '@/components/ui/Toast';
import { transitionAdminCourse } from '@/lib/admin-course-lifecycle-client';
import {
  DEFAULT_CERTIFICATE_COLOR,
  normalizeCertificateColor,
} from '@/lib/certificate-color';
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
    certificateColor: DEFAULT_CERTIFICATE_COLOR,
    certificateHeaderImage: '',
    previewVideoUrl: '',
    promoPrice: '',
    promoStartsAt: '',
    promoEndsAt: '',
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/courses/${courseId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลคอร์สไม่สำเร็จ');
        return data;
      })
      .then((data) => {
        if (data.course) {
          setFormData({
            title: data.course.title || '',
            slug: data.course.slug || '',
            description: data.course.description || '',
            price: String(data.course.price || 0),
            status: data.course.status || 'draft',
            thumbnailUrl: data.course.thumbnailUrl || '',
            certificateColor: normalizeCertificateColor(data.course.certificateColor),
            certificateHeaderImage: data.course.certificateHeaderImage || '',
            previewVideoUrl: data.course.previewVideoUrl || '',
            promoPrice: data.course.promoPrice ? String(data.course.promoPrice) : '',
            promoStartsAt: data.course.promoStartsAt ? new Date(data.course.promoStartsAt).toISOString().slice(0, 16) : '',
            promoEndsAt: data.course.promoEndsAt ? new Date(data.course.promoEndsAt).toISOString().slice(0, 16) : '',
          });
        }
        setSelectedTagIds((data.tags || []).map((tag: { id: string }) => tag.id));
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลคอร์สไม่สำเร็จ'))
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
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseDetails, tagIds: selectedTagIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'บันทึกคอร์สไม่สำเร็จ');
      showToast('บันทึกคอร์สสำเร็จ', 'success');
      router.push('/admin/courses');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกคอร์สไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const handleLifecycleAction = async () => {
    if (!courseId || !lifecycleAction || lifecyclePending) return;
    setLifecyclePending(true);
    setError('');
    const requestedAction = lifecycleAction;
    const result = await transitionAdminCourse({ courseId, action: requestedAction, expectedStatus: formData.status });
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
    showToast(requestedAction === 'archive' ? 'เก็บคอร์สเข้าคลังแล้ว' : requestedAction === 'restore' ? 'นำคอร์สกลับเป็นแบบร่างแล้ว' : 'เผยแพร่คอร์สแล้ว', 'success');
    router.refresh();
  };

  const isFreeCourse = Number(formData.price || 0) <= 0;
  const isPublished = formData.status === 'published';
  const hasPromo = Boolean(formData.promoPrice) && Number(formData.promoPrice || 0) > 0;
  const normalizedSlug = formData.slug.trim() || 'course-slug';
  const promoDiscount = hasPromo && Number(formData.price || 0) > 0 ? Math.round((1 - Number(formData.promoPrice || 0) / Number(formData.price || 0)) * 100) : 0;
  const statusLabel = formData.status === 'archived' ? 'เก็บเข้าคลัง' : isPublished ? 'เผยแพร่' : 'แบบร่าง';
  const priceLabel = isFreeCourse ? 'ฟรี' : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(formData.price || 0));
  const checklist = useMemo(() => [
    { label: 'ชื่อคอร์ส', ready: Boolean(formData.title.trim()) },
    { label: 'คำอธิบาย', ready: Boolean(formData.description.trim()) },
    { label: 'ภาพปก', ready: Boolean(formData.thumbnailUrl.trim()) },
    { label: 'วิดีโอแนะนำ', ready: Boolean(formData.previewVideoUrl.trim()) },
    { label: 'Slug', ready: Boolean(formData.slug.trim()) },
  ], [formData.description, formData.previewVideoUrl, formData.slug, formData.thumbnailUrl, formData.title]);
  const readyCount = checklist.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / checklist.length) * 100);

  if (loading) return <AdminLoadingState title="กำลังโหลดคอร์ส" />;
  if (error && !formData.title) return <AdminErrorState description={error} action={<Button variant="outline" onClick={() => router.refresh()}>ลองใหม่</Button>} />;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Course editor"
        title={formData.title || 'แก้ไขคอร์ส'}
        description="ปรับข้อมูลหน้าขาย ราคา โปรโมชั่น และภาพลักษณ์ ส่วนสถานะคอร์สจัดการผ่าน lifecycle actions แยกต่างหาก"
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/courses"><ArrowLeft data-icon="inline-start" aria-hidden />คอร์สทั้งหมด</Link></Button>
            <Button asChild variant="outline"><Link href={`/admin/courses/${courseId}/lessons`}>จัดการบทเรียน</Link></Button>
            {isPublished ? <Button asChild variant="outline"><Link href={`/courses/${normalizedSlug}`} target="_blank">ดูหน้าเว็บ<ExternalLink data-icon="inline-end" aria-hidden /></Link></Button> : null}
          </>
        }
        meta="การบันทึกรายละเอียดจะไม่เปลี่ยนสถานะคอร์สโดยอัตโนมัติ"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="สถานะ" value={statusLabel} tone={isPublished ? 'success' : formData.status === 'archived' ? 'neutral' : 'warning'} detail={isPublished ? 'ผู้ใช้มองเห็นและซื้อได้' : formData.status === 'archived' ? 'หยุดขายใหม่' : 'ยังไม่เผยแพร่'} />
        <AdminMetricCard label="ราคา" value={priceLabel} tone={isFreeCourse ? 'success' : 'info'} detail={isFreeCourse ? 'คอร์สฟรี' : 'ราคาหลัก'} />
        <AdminMetricCard label="โปรโมชั่น" value={hasPromo ? `ลด ${promoDiscount}%` : 'ไม่มี'} tone={hasPromo ? 'warning' : 'neutral'} detail={hasPromo ? 'มีราคาโปรโมชั่น' : 'ใช้ราคาหลัก'} />
        <AdminMetricCard label="ความพร้อม" value={`${readinessPercent}%`} tone={readinessPercent === 100 ? 'success' : 'neutral'} detail={`${readyCount}/${checklist.length} รายการพร้อม`} />
      </div>

      {error ? <Alert variant="destructive"><AlertTitle>ดำเนินการไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <form id="course-edit-form" onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <AdminSection title="ตัวตนและบริบทของคอร์ส" description="ชื่อ URL คำอธิบาย และแท็กที่ใช้ทั้งบนหน้าขายและระบบผู้ดูแล">
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="course-title">ชื่อคอร์ส *</FieldLabel><Input id="course-title" value={formData.title} onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))} required /><FieldDescription>ชื่อที่สื่อผลลัพธ์ของคอร์สอย่างชัดเจน</FieldDescription></Field>
                <Field><FieldLabel htmlFor="course-slug">Slug</FieldLabel><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">/courses/</span><Input id="course-slug" value={formData.slug} onChange={(event) => setFormData((previous) => ({ ...previous, slug: event.target.value }))} /></div><FieldDescription>เปลี่ยนอย่างระมัดระวังหากเคยแชร์ลิงก์แล้ว</FieldDescription></Field>
              </div>
              <Field><FieldLabel>คำอธิบาย</FieldLabel><RichTextEditor content={formData.description} onChange={(description) => setFormData((previous) => ({ ...previous, description }))} /></Field>
              <Field><FieldLabel>แท็ก</FieldLabel><TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} /></Field>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="ราคา สถานะ และโปรโมชั่น" description="บันทึกราคาแยกจาก lifecycle เพื่อป้องกันการเปิดหรือหยุดขายโดยไม่ตั้งใจ">
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="course-price">ราคา (บาท)</FieldLabel><Input id="course-price" type="number" min="0" value={formData.price} onChange={(event) => setFormData((previous) => ({ ...previous, price: event.target.value }))} /><FieldDescription>ใช้ 0 สำหรับคอร์สฟรี</FieldDescription></Field>
                <Field><FieldLabel htmlFor="course-status">สถานะ</FieldLabel><NativeSelect id="course-status" className="w-full" value={formData.status} disabled aria-describedby="course-status-help"><NativeSelectOption value="draft">แบบร่าง</NativeSelectOption><NativeSelectOption value="published">เผยแพร่</NativeSelectOption><NativeSelectOption value="archived">เก็บเข้าคลัง</NativeSelectOption></NativeSelect><FieldDescription id="course-status-help">เปลี่ยนผ่าน lifecycle actions เท่านั้น</FieldDescription></Field>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-4"><h3 className="font-semibold">ราคาโปรโมชั่น</h3><p className="mt-1 text-sm text-muted-foreground">เว้นว่างหากยังไม่ต้องการเปิดโปรโมชั่น</p></div>
                <div className="grid gap-5 md:grid-cols-3">
                  <Field><FieldLabel htmlFor="promo-price">ราคาโปรโมชั่น</FieldLabel><Input id="promo-price" type="number" min="0" value={formData.promoPrice} onChange={(event) => setFormData((previous) => ({ ...previous, promoPrice: event.target.value }))} placeholder="เช่น 990" />{hasPromo && Number(formData.price || 0) > 0 ? <FieldDescription>ลด {promoDiscount}% จากราคาหลัก</FieldDescription> : null}</Field>
                  <Field><FieldLabel htmlFor="promo-start">เริ่มต้น</FieldLabel><Input id="promo-start" type="datetime-local" value={formData.promoStartsAt} onChange={(event) => setFormData((previous) => ({ ...previous, promoStartsAt: event.target.value }))} /></Field>
                  <Field><FieldLabel htmlFor="promo-end">สิ้นสุด</FieldLabel><Input id="promo-end" type="datetime-local" value={formData.promoEndsAt} onChange={(event) => setFormData((previous) => ({ ...previous, promoEndsAt: event.target.value }))} /></Field>
                </div>
              </div>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="ภาพลักษณ์และสื่อ" description="ภาพปก วิดีโอแนะนำ และองค์ประกอบของใบรับรอง">
            <FieldGroup>
              <div className="grid gap-6 md:grid-cols-2">
                <Field><FieldLabel>รูปภาพปก</FieldLabel><ImageUpload value={formData.thumbnailUrl} onChange={(thumbnailUrl) => setFormData((previous) => ({ ...previous, thumbnailUrl }))} folder="courses" /></Field>
                <Field><FieldLabel>สีใบรับรอง</FieldLabel><CertificateColorPicker value={formData.certificateColor} onChange={(certificateColor) => setFormData((previous) => ({ ...previous, certificateColor }))} /></Field>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Field><FieldLabel htmlFor="preview-video">วิดีโอแนะนำคอร์ส</FieldLabel><Input id="preview-video" value={formData.previewVideoUrl} onChange={(event) => setFormData((previous) => ({ ...previous, previewVideoUrl: event.target.value }))} placeholder="Bunny.net, YouTube หรือ Vimeo URL" /></Field>
                <Field><FieldLabel>รูป Header ใบรับรอง</FieldLabel><ImageUpload value={formData.certificateHeaderImage} onChange={(certificateHeaderImage) => setFormData((previous) => ({ ...previous, certificateHeaderImage }))} folder="certificates" /><FieldDescription>แนะนำ 1800 × 500 px</FieldDescription></Field>
              </div>
            </FieldGroup>
          </AdminSection>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card>
            <CardHeader><CardTitle>พร้อมบันทึก</CardTitle><CardDescription>ตรวจความพร้อมและจัดการสถานะคอร์สจากจุดนี้</CardDescription></CardHeader>
            <CardContent className="grid gap-5">
              <div><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">ความพร้อม</span><strong>{readinessPercent}%</strong></div><Progress value={readinessPercent} /></div>
              <div className="grid gap-2 text-sm">{checklist.map((item) => <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><AdminStatusBadge tone={item.ready ? 'success' : 'neutral'}>{item.ready ? 'พร้อม' : 'ยังไม่พร้อม'}</AdminStatusBadge></div>)}</div>
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">สถานะ</span><strong>{statusLabel}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">ราคา</span><strong>{priceLabel}</strong></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">URL</span><span className="max-w-40 truncate font-mono text-xs">/courses/{normalizedSlug}</span></div></div>
              <Button type="submit" disabled={saving} size="lg">{saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />บันทึกการเปลี่ยนแปลง</>}</Button>
              <Button asChild variant="outline"><Link href={`/admin/courses/${courseId}/lessons`}>จัดการบทเรียน</Link></Button>
              <div className="border-t pt-4"><div className="mb-3 text-sm font-semibold">เปลี่ยนสถานะคอร์ส</div><AdminCourseLifecycleActions status={formData.status} pending={lifecyclePending} onRequest={(action) => { setError(''); setLifecycleAction(action); }} /></div>
            </CardContent>
          </Card>
        </aside>
      </form>

      {lifecycleAction ? <CourseLifecycleDialog isOpen courseTitle={formData.title || 'คอร์สนี้'} action={lifecycleAction} pending={lifecyclePending} error={error} onConfirm={() => void handleLifecycleAction()} onCancel={() => { if (!lifecyclePending) setLifecycleAction(null); }} /> : null}
    </div>
  );
}
