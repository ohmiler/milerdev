'use client';

import { ArrowLeft, ExternalLink, FolderPlus, ListVideo, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import DraggableLessonList, { type Lesson, type LessonSection } from '@/components/admin/DraggableLessonList';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

function toDurationSeconds(value: string) {
  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    return (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
  }
  return Math.round(parseFloat(value) * 60) || 0;
}

const emptyForm = { title: '', content: '', videoUrl: '', videoDuration: '0:00', isFreePreview: false, sectionId: '' };

// A section dialog either creates a section or renames an existing one.
type SectionDialogState = { mode: 'create' } | { mode: 'rename'; section: LessonSection };

export default function ManageLessonsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [publicCourse, setPublicCourse] = useState<{ slug: string; status: string } | null>(null);
  const [sectionDialog, setSectionDialog] = useState<SectionDialogState | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionDeleteTarget, setSectionDeleteTarget] = useState<LessonSection | null>(null);
  const [sectionDeleteError, setSectionDeleteError] = useState('');
  const [sectionDeleting, setSectionDeleting] = useState(false);

  const fetchLessons = async (id: string) => {
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/courses/${id}/lessons`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'โหลดบทเรียนไม่สำเร็จ');
      setLessons(data.lessons || []);
      setSections(data.sections || []);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'โหลดบทเรียนไม่สำเร็จ');
    }
  };

  useEffect(() => {
    void fetchLessons(courseId).finally(() => setLoading(false));
  }, [courseId]);

  // Only needed for the "view on site" link; a failure just hides the link.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/courses/${courseId}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.course?.slug) setPublicCourse({ slug: data.course.slug, status: data.course.status });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [courseId]);

  const resetForm = () => {
    setFormData(emptyForm);
    setFormError('');
    setShowForm(false);
  };

  const openLessonForm = () => {
    // New lessons default to the last section, which matches appending to the course.
    setFormData({ ...emptyForm, sectionId: sections.at(-1)?.id ?? '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!courseId) return;
    setSaving(true);
    setFormError('');
    try {
      const { sectionId, ...lesson } = formData;
      const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lesson,
          videoDuration: toDurationSeconds(formData.videoDuration),
          // Only courses with sections need a placement; others keep appending to the end.
          ...(sections.length > 0 ? { sectionId: sectionId || null } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เพิ่มบทเรียนไม่สำเร็จ');
      await fetchLessons(courseId);
      resetForm();
      showToast('เพิ่มบทเรียนสำเร็จ', 'success');
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'เพิ่มบทเรียนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deleteTarget || !courseId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/lessons/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ลบบทเรียนไม่สำเร็จ');
      setDeleteTarget(null);
      await fetchLessons(courseId);
      showToast('ลบบทเรียนสำเร็จ', 'success');
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : 'ลบบทเรียนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setDeleting(false);
    }
  };

  const openSectionDialog = (state: SectionDialogState) => {
    setSectionTitle(state.mode === 'rename' ? state.section.title : '');
    setSectionError('');
    setSectionDialog(state);
  };

  const submitSection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sectionDialog || !courseId) return;
    setSectionSaving(true);
    setSectionError('');
    try {
      const isRename = sectionDialog.mode === 'rename';
      const response = await fetch(
        isRename
          ? `/api/admin/courses/${courseId}/sections/${sectionDialog.section.id}`
          : `/api/admin/courses/${courseId}/sections`,
        {
          method: isRename ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sectionTitle }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'บันทึกหมวดไม่สำเร็จ');
      await fetchLessons(courseId);
      setSectionDialog(null);
      showToast(isRename ? 'แก้ชื่อหมวดแล้ว' : 'เพิ่มหมวดแล้ว', 'success');
    } catch (caughtError) {
      setSectionError(caughtError instanceof Error ? caughtError.message : 'บันทึกหมวดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSectionSaving(false);
    }
  };

  const confirmDeleteSection = async () => {
    if (!sectionDeleteTarget || !courseId) return;
    setSectionDeleting(true);
    setSectionDeleteError('');
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/sections/${sectionDeleteTarget.id}`,
        { method: 'DELETE' },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ลบหมวดไม่สำเร็จ');
      setSectionDeleteTarget(null);
      await fetchLessons(courseId);
      showToast('ลบหมวดแล้ว บทเรียนยังอยู่ครบ', 'success');
    } catch (caughtError) {
      setSectionDeleteError(caughtError instanceof Error ? caughtError.message : 'ลบหมวดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSectionDeleting(false);
    }
  };

  const totalLessons = lessons.length;
  const lessonsWithVideo = lessons.filter((lesson) => Boolean(lesson.videoUrl)).length;
  const lessonsWithContent = lessons.filter((lesson) => Boolean(lesson.content?.trim())).length;
  const freePreviewCount = lessons.filter((lesson) => Boolean(lesson.isFreePreview)).length;
  const readinessPercent = totalLessons > 0 ? Math.round(((lessonsWithVideo + lessonsWithContent) / (totalLessons * 2)) * 100) : 0;
  const sectionDeleteIndex = sectionDeleteTarget ? sections.findIndex((section) => section.id === sectionDeleteTarget.id) : -1;
  const sectionDeleteDestination = sectionDeleteIndex > 0 ? `หมวด “${sections[sectionDeleteIndex - 1].title}”` : 'กลุ่มที่ยังไม่อยู่ในหมวด';

  if (loading) return <AdminLoadingState title="กำลังโหลดบทเรียน" />;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="บทเรียนในคอร์ส"
        title="จัดการบทเรียน"
        description="จัดหมวดและลำดับ เติมวิดีโอ ตรวจเนื้อหา และกำหนดบทเรียนตัวอย่างจาก workspace เดียว"
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/courses"><ArrowLeft data-icon="inline-start" aria-hidden />คอร์สทั้งหมด</Link></Button>
            {publicCourse?.status === 'published' ? (
              <Button asChild variant="outline"><Link href={`/courses/${publicCourse.slug}`} target="_blank">ดูหน้าเว็บ<ExternalLink data-icon="inline-end" aria-hidden /></Link></Button>
            ) : null}
            <Button variant="outline" onClick={() => openSectionDialog({ mode: 'create' })}><FolderPlus data-icon="inline-start" aria-hidden />เพิ่มหมวด</Button>
            <Button onClick={openLessonForm}><Plus data-icon="inline-start" aria-hidden />เพิ่มบทเรียน</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="บทเรียนทั้งหมด" value={totalLessons.toLocaleString('th-TH')} detail={sections.length > 0 ? `${sections.length.toLocaleString('th-TH')} หมวด` : 'โครงสร้างในคอร์สนี้'} />
        <AdminMetricCard label="มีวิดีโอแล้ว" value={lessonsWithVideo.toLocaleString('th-TH')} tone="info" detail="พร้อมสำหรับ player" />
        <AdminMetricCard label="มีเนื้อหาแล้ว" value={lessonsWithContent.toLocaleString('th-TH')} tone="success" detail="มีรายละเอียดประกอบ" />
        <AdminMetricCard label="Preview ฟรี" value={freePreviewCount.toLocaleString('th-TH')} tone="warning" detail="เปิดให้ทดลองเรียน" />
      </div>

      <AdminSection title="ความพร้อมของบทเรียน" description="คำนวณจากบทเรียนที่มีทั้งวิดีโอและเนื้อหาประกอบ">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1"><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">ความพร้อมรวม</span><strong>{readinessPercent}%</strong></div><Progress value={readinessPercent} aria-label={`ความพร้อมรวม ${readinessPercent}%`} /></div>
          <AdminStatusBadge tone={readinessPercent === 100 ? 'success' : readinessPercent >= 50 ? 'warning' : 'neutral'}>{readinessPercent === 100 ? 'พร้อม' : 'ต้องตรวจเพิ่ม'}</AdminStatusBadge>
        </div>
      </AdminSection>

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchLessons(courseId)}>ลองใหม่</Button>} /> : null}

      <AdminSection title="โครงสร้างบทเรียน" description="ลากเพื่อจัดลำดับภายในหมวด เลือกหมวดจากเมนูของแต่ละบทเพื่อย้ายข้ามหมวด และแก้วิดีโอแบบ inline">
        {lessons.length === 0 && sections.length === 0 ? (
          <AdminEmptyState icon={<ListVideo aria-hidden />} title="ยังไม่มีบทเรียน" description="เพิ่มบทเรียนแรกเพื่อเริ่มสร้างโครงสร้างคอร์ส" action={<Button onClick={openLessonForm}>เพิ่มบทเรียน</Button>} />
        ) : (
          <DraggableLessonList
            lessons={lessons}
            sections={sections}
            courseId={courseId || ''}
            onDelete={(id) => { setDeleteError(''); setDeleteTarget(lessons.find((lesson) => lesson.id === id) || null); }}
            onStructureChange={(outline) => { setLessons(outline.lessons); setSections(outline.sections); }}
            onRenameSection={(section) => openSectionDialog({ mode: 'rename', section })}
            onDeleteSection={(section) => { setSectionDeleteError(''); setSectionDeleteTarget(section); }}
            onLessonUpdate={(lessonId, data) => setLessons((current) => current.map((lesson) => lesson.id === lessonId ? { ...lesson, ...data } : lesson))}
          />
        )}
      </AdminSection>

      <Dialog open={showForm} onOpenChange={(open) => { if (!saving) { if (!open) resetForm(); else setShowForm(true); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>เพิ่มบทเรียนใหม่</DialogTitle><DialogDescription>เริ่มจากชื่อบทเรียน แล้วเติมเนื้อหา วิดีโอ ระยะเวลา และสิทธิ์ Preview</DialogDescription></DialogHeader>
          {formError ? <Alert variant="destructive"><AlertTitle>เพิ่มบทเรียนไม่สำเร็จ</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
          <form id="new-lesson-form" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="lesson-title">ชื่อบทเรียน *</FieldLabel><Input id="lesson-title" value={formData.title} onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))} required placeholder="เช่น สร้างหน้าแรกด้วย Next.js" /></Field>
              {sections.length > 0 ? (
                <Field>
                  <FieldLabel htmlFor="lesson-section">หมวด</FieldLabel>
                  <NativeSelect id="lesson-section" value={formData.sectionId} onChange={(event) => setFormData((previous) => ({ ...previous, sectionId: event.target.value }))}>
                    <NativeSelectOption value="">ไม่อยู่ในหมวด</NativeSelectOption>
                    {sections.map((section) => <NativeSelectOption key={section.id} value={section.id}>{section.title}</NativeSelectOption>)}
                  </NativeSelect>
                  <FieldDescription>บทเรียนใหม่จะต่อท้ายหมวดที่เลือก</FieldDescription>
                </Field>
              ) : null}
              <Field><FieldLabel id="new-lesson-content-label">เนื้อหาบทเรียน</FieldLabel><RichTextEditor labelledBy="new-lesson-content-label" content={formData.content} onChange={(content) => setFormData((previous) => ({ ...previous, content }))} /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="lesson-video">URL วิดีโอ</FieldLabel><Input id="lesson-video" value={formData.videoUrl} onChange={(event) => setFormData((previous) => ({ ...previous, videoUrl: event.target.value }))} placeholder="Bunny Video GUID หรือ Embed URL" /></Field>
                <Field><FieldLabel htmlFor="lesson-duration">ระยะเวลา</FieldLabel><Input id="lesson-duration" value={formData.videoDuration} onChange={(event) => { if (/^[0-9:]*$/.test(event.target.value)) setFormData((previous) => ({ ...previous, videoDuration: event.target.value })); }} placeholder="10:30" /><FieldDescription>รูปแบบ นาที:วินาที</FieldDescription></Field>
              </div>
              <Field orientation="horizontal" className="rounded-xl border p-4"><div className="flex-1"><FieldLabel htmlFor="lesson-preview">เปิดให้ดูฟรี</FieldLabel><FieldDescription>ใช้เป็น sample lesson ก่อนซื้อคอร์ส</FieldDescription></div><Switch id="lesson-preview" checked={formData.isFreePreview} onCheckedChange={(checked) => setFormData((previous) => ({ ...previous, isFreePreview: checked }))} /></Field>
            </FieldGroup>
          </form>
          <DialogFooter><Button variant="outline" disabled={saving} onClick={resetForm}>ยกเลิก</Button><Button type="submit" form="new-lesson-form" disabled={saving || !formData.title.trim()}>{saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : 'เพิ่มบทเรียน'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sectionDialog)} onOpenChange={(open) => { if (!open && !sectionSaving) setSectionDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{sectionDialog?.mode === 'rename' ? 'แก้ชื่อหมวด' : 'เพิ่มหมวดใหม่'}</DialogTitle>
            <DialogDescription>หมวดช่วยแบ่งบทเรียนเป็นช่วง ๆ ผู้เรียนจะเห็นชื่อหมวดเมื่อหมวดมีบทเรียนแล้ว</DialogDescription>
          </DialogHeader>
          {sectionError ? <Alert variant="destructive"><AlertTitle>บันทึกหมวดไม่สำเร็จ</AlertTitle><AlertDescription>{sectionError}</AlertDescription></Alert> : null}
          <form id="section-form" onSubmit={submitSection}>
            <Field>
              <FieldLabel htmlFor="section-title">ชื่อหมวด *</FieldLabel>
              <Input id="section-title" value={sectionTitle} onChange={(event) => setSectionTitle(event.target.value)} required maxLength={255} placeholder="เช่น พื้นฐาน JavaScript" />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" disabled={sectionSaving} onClick={() => setSectionDialog(null)}>ยกเลิก</Button>
            <Button type="submit" form="section-form" disabled={sectionSaving || !sectionTitle.trim()}>{sectionSaving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : 'บันทึกหมวด'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="ลบบทเรียนถาวร"
        description="การลบไม่สามารถย้อนกลับได้ และอาจกระทบความคืบหน้าของผู้เรียนที่เชื่อมกับบทนี้"
        target={deleteTarget?.title}
        confirmLabel="ลบบทเรียน"
        pending={deleting}
        pendingLabel="กำลังลบ"
        error={deleteError || undefined}
        onConfirm={() => void confirmDeleteLesson()}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}
      />

      <AdminConfirmActionDialog
        open={Boolean(sectionDeleteTarget)}
        title="ลบหมวด"
        description={`บทเรียนในหมวดนี้จะไม่ถูกลบ แต่จะย้ายไปต่อท้าย${sectionDeleteDestination} โดยลำดับการเรียนไม่เปลี่ยน`}
        target={sectionDeleteTarget?.title}
        confirmLabel="ลบหมวด"
        pending={sectionDeleting}
        pendingLabel="กำลังลบ"
        error={sectionDeleteError || undefined}
        onConfirm={() => void confirmDeleteSection()}
        onOpenChange={(open) => { if (!open) { setSectionDeleteTarget(null); setSectionDeleteError(''); } }}
      />
    </div>
  );
}
