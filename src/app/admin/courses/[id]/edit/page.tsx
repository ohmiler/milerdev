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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/Toast';
import { transitionAdminCourse } from '@/lib/courses/admin-lifecycle-client';
import {
  DEFAULT_CERTIFICATE_COLOR,
  normalizeCertificateColor,
} from '@/lib/certificates/color';
import {
  COURSE_CONTENT_LIST_MAX,
  COURSE_SUMMARY_MAX,
  contentLinesToList,
  contentListToLines,
} from '@/lib/courses/content';
import type { CourseLifecycleAction, CourseStatus } from '@/lib/courses/lifecycle';
import { fromThaiDateTimeInput, toThaiDateTimeInput } from '@/lib/courses/promo-time';

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
    instructorId: '',
    summary: '',
    learningOutcomes: '',
    targetAudience: '',
    prerequisites: '',
    prerequisiteCourseId: '',
  });
  const [instructorOptions, setInstructorOptions] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [prerequisiteOptions, setPrerequisiteOptions] = useState<Array<{ id: string; title: string; status: CourseStatus }>>([]);

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
            promoStartsAt: toThaiDateTimeInput(data.course.promoStartsAt),
            promoEndsAt: toThaiDateTimeInput(data.course.promoEndsAt),
            instructorId: data.course.instructorId || '',
            summary: data.course.summary || '',
            learningOutcomes: contentListToLines(data.course.learningOutcomes),
            targetAudience: contentListToLines(data.course.targetAudience),
            prerequisites: contentListToLines(data.course.prerequisites),
            prerequisiteCourseId: data.course.prerequisiteCourseId || '',
          });
        }
        setInstructorOptions(data.instructorOptions || []);
        setPrerequisiteOptions(data.prerequisiteOptions || []);
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
      // The inputs hold Thai time; send instants so the server never guesses a time zone.
      const promoStartsAt = fromThaiDateTimeInput(courseDetails.promoStartsAt);
      const promoEndsAt = fromThaiDateTimeInput(courseDetails.promoEndsAt);
      if (promoStartsAt === null || promoEndsAt === null) {
        throw new Error('กรุณากรอกเวลาโปรโมชั่นให้ครบทั้งวันที่และเวลา');
      }
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseDetails,
          promoStartsAt,
          promoEndsAt,
          instructorId: courseDetails.instructorId || null,
          learningOutcomes: contentLinesToList(courseDetails.learningOutcomes),
          targetAudience: contentLinesToList(courseDetails.targetAudience),
          prerequisites: contentLinesToList(courseDetails.prerequisites),
          prerequisiteCourseId: courseDetails.prerequisiteCourseId || null,
          tagIds: selectedTagIds,
        }),
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
    { label: 'คำโปรย', ready: Boolean(formData.summary.trim()) },
    { label: 'ภาพปก', ready: Boolean(formData.thumbnailUrl.trim()) },
    { label: 'วิดีโอแนะนำ', ready: Boolean(formData.previewVideoUrl.trim()) },
    { label: 'Slug', ready: Boolean(formData.slug.trim()) },
  ], [formData.description, formData.previewVideoUrl, formData.slug, formData.summary, formData.thumbnailUrl, formData.title]);
  const readyCount = checklist.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / checklist.length) * 100);

  if (loading) return <AdminLoadingState title="กำลังโหลดคอร์ส" />;
  if (error && !formData.title) return <AdminErrorState description={error} action={<Button variant="outline" onClick={() => router.refresh()}>ลองใหม่</Button>} />;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="แก้ไขคอร์ส"
        title={formData.title || 'แก้ไขคอร์ส'}
        description="ปรับข้อมูลหน้าขาย ราคา โปรโมชั่น และภาพลักษณ์ ส่วนการเผยแพร่หรือหยุดขายคอร์สทำที่กล่อง “เปลี่ยนสถานะคอร์ส”"
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
                <Field><FieldLabel htmlFor="course-slug">Slug</FieldLabel><InputGroup><InputGroupAddon>/courses/</InputGroupAddon><InputGroupInput id="course-slug" value={formData.slug} onChange={(event) => setFormData((previous) => ({ ...previous, slug: event.target.value }))} /></InputGroup><FieldDescription>เปลี่ยนอย่างระมัดระวังหากเคยแชร์ลิงก์แล้ว</FieldDescription></Field>
              </div>
              <Field><FieldLabel id="course-description-label">คำอธิบาย</FieldLabel><RichTextEditor labelledBy="course-description-label" content={formData.description} onChange={(description) => setFormData((previous) => ({ ...previous, description }))} /></Field>
              <Field>
                <FieldLabel htmlFor="course-instructor">ผู้สอน</FieldLabel>
                <NativeSelect id="course-instructor" className="w-full" value={formData.instructorId} onChange={(event) => setFormData((previous) => ({ ...previous, instructorId: event.target.value }))}>
                  <NativeSelectOption value="">ไม่ระบุผู้สอน</NativeSelectOption>
                  {instructorOptions.map((option) => (
                    <NativeSelectOption key={option.id} value={option.id}>{option.name || option.email}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>ชื่อนี้จะแสดงบนหน้าคอร์สสาธารณะ เลือกได้เฉพาะบัญชีผู้สอนหรือผู้ดูแลที่ยังใช้งานอยู่</FieldDescription>
              </Field>
              <Field><FieldLabel>แท็ก</FieldLabel><TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} /></Field>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="เนื้อหาบนหน้าคอร์ส" description="ข้อความสั้นที่ช่วยผู้เรียนตัดสินใจ แสดงเหนือรายละเอียดคอร์ส ช่องที่เว้นว่างจะไม่แสดงบนหน้าเว็บ">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="course-summary">คำโปรย</FieldLabel>
                <Textarea id="course-summary" rows={2} maxLength={COURSE_SUMMARY_MAX} value={formData.summary} onChange={(event) => setFormData((previous) => ({ ...previous, summary: event.target.value }))} placeholder="เช่น ก้าวสู่การเป็น Front-end Developer ด้วย React ตั้งแต่พื้นฐาน จนสร้างเว็บแอปที่ใส่พอร์ตได้" />
                <FieldDescription>หนึ่งถึงสองประโยคใต้ชื่อคอร์ส {formData.summary.length}/{COURSE_SUMMARY_MAX} ตัวอักษร</FieldDescription>
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="course-outcomes">สิ่งที่ผู้เรียนจะได้</FieldLabel>
                  <Textarea id="course-outcomes" rows={5} value={formData.learningOutcomes} onChange={(event) => setFormData((previous) => ({ ...previous, learningOutcomes: event.target.value }))} />
                  <FieldDescription>บรรทัดละหนึ่งข้อ ไม่เกิน {COURSE_CONTENT_LIST_MAX} ข้อ</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-audience">เหมาะกับใคร</FieldLabel>
                  <Textarea id="course-audience" rows={5} value={formData.targetAudience} onChange={(event) => setFormData((previous) => ({ ...previous, targetAudience: event.target.value }))} />
                  <FieldDescription>บรรทัดละหนึ่งข้อ ไม่เกิน {COURSE_CONTENT_LIST_MAX} ข้อ</FieldDescription>
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="course-prerequisites">ควรรู้ก่อนเรียน</FieldLabel>
                  <Textarea id="course-prerequisites" rows={3} value={formData.prerequisites} onChange={(event) => setFormData((previous) => ({ ...previous, prerequisites: event.target.value }))} />
                  <FieldDescription>บรรทัดละหนึ่งข้อ เว้นว่างถ้าเริ่มจากศูนย์ได้</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-prerequisite-course">คอร์สที่ควรเรียนก่อน</FieldLabel>
                  <NativeSelect id="course-prerequisite-course" className="w-full" value={formData.prerequisiteCourseId} onChange={(event) => setFormData((previous) => ({ ...previous, prerequisiteCourseId: event.target.value }))}>
                    <NativeSelectOption value="">ไม่ระบุ</NativeSelectOption>
                    {prerequisiteOptions.map((option) => (
                      <NativeSelectOption key={option.id} value={option.id}>{option.title}{option.status === 'draft' ? ' (แบบร่าง)' : option.status === 'archived' ? ' (เก็บเข้าคลัง)' : ''}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>แสดงเป็นลิงก์ใต้ “ควรรู้ก่อนเรียน” สำหรับผู้เรียนที่ยังไม่พร้อม</FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="ราคา สถานะ และโปรโมชั่น" description="การบันทึกราคาไม่เปลี่ยนสถานะคอร์ส จึงไม่เผลอเปิดหรือหยุดขายโดยไม่ตั้งใจ">
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="course-price">ราคา (บาท)</FieldLabel><Input id="course-price" type="number" min="0" value={formData.price} onChange={(event) => setFormData((previous) => ({ ...previous, price: event.target.value }))} /><FieldDescription>ใช้ 0 สำหรับคอร์สฟรี</FieldDescription></Field>
                <Field><FieldLabel htmlFor="course-status">สถานะ</FieldLabel><NativeSelect id="course-status" className="w-full" value={formData.status} disabled aria-describedby="course-status-help"><NativeSelectOption value="draft">แบบร่าง</NativeSelectOption><NativeSelectOption value="published">เผยแพร่</NativeSelectOption><NativeSelectOption value="archived">เก็บเข้าคลัง</NativeSelectOption></NativeSelect><FieldDescription id="course-status-help">เปลี่ยนได้ที่กล่อง <a href="#course-status-actions" className="text-link underline underline-offset-2">เปลี่ยนสถานะคอร์ส</a></FieldDescription></Field>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-4"><h3 className="font-semibold">ราคาโปรโมชั่น</h3><p className="mt-1 text-sm text-muted-foreground">เว้นว่างหากยังไม่ต้องการเปิดโปรโมชั่น</p></div>
                <div className="grid gap-5 md:grid-cols-3">
                  <Field><FieldLabel htmlFor="promo-price">ราคาโปรโมชั่น</FieldLabel><Input id="promo-price" type="number" min="0" value={formData.promoPrice} onChange={(event) => setFormData((previous) => ({ ...previous, promoPrice: event.target.value }))} placeholder="เช่น 990" />{hasPromo && Number(formData.price || 0) > 0 ? <FieldDescription>ลด {promoDiscount}% จากราคาหลัก</FieldDescription> : null}</Field>
                  <Field><FieldLabel htmlFor="promo-start">เริ่มต้น (เวลาไทย)</FieldLabel><Input id="promo-start" type="datetime-local" value={formData.promoStartsAt} onChange={(event) => setFormData((previous) => ({ ...previous, promoStartsAt: event.target.value }))} /></Field>
                  <Field><FieldLabel htmlFor="promo-end">สิ้นสุด (เวลาไทย)</FieldLabel><Input id="promo-end" type="datetime-local" value={formData.promoEndsAt} onChange={(event) => setFormData((previous) => ({ ...previous, promoEndsAt: event.target.value }))} /></Field>
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
              <div><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">ความพร้อม</span><strong>{readinessPercent}%</strong></div><Progress value={readinessPercent} aria-label={`ความพร้อมของคอร์ส ${readinessPercent}%`} /></div>
              <div className="grid gap-2 text-sm">{checklist.map((item) => <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><AdminStatusBadge tone={item.ready ? 'success' : 'neutral'}>{item.ready ? 'พร้อม' : 'ยังไม่พร้อม'}</AdminStatusBadge></div>)}</div>
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">สถานะ</span><strong>{statusLabel}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">ราคา</span><strong>{priceLabel}</strong></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">URL</span><span className="max-w-40 truncate font-mono text-xs">/courses/{normalizedSlug}</span></div></div>
              <Button type="submit" disabled={saving} size="lg">{saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />บันทึกการเปลี่ยนแปลง</>}</Button>
              <Button asChild variant="outline"><Link href={`/admin/courses/${courseId}/lessons`}>จัดการบทเรียน</Link></Button>
              <div id="course-status-actions" className="scroll-mt-24 border-t pt-4"><div className="mb-3 text-sm font-semibold">เปลี่ยนสถานะคอร์ส</div><AdminCourseLifecycleActions status={formData.status} pending={lifecyclePending} onRequest={(action) => { setError(''); setLifecycleAction(action); }} /></div>
            </CardContent>
          </Card>
        </aside>
      </form>

      {lifecycleAction ? <CourseLifecycleDialog isOpen courseTitle={formData.title || 'คอร์สนี้'} action={lifecycleAction} pending={lifecyclePending} error={error} onConfirm={() => void handleLifecycleAction()} onCancel={() => { if (!lifecyclePending) setLifecycleAction(null); }} /> : null}
    </div>
  );
}
