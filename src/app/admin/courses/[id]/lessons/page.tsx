'use client';

import { ArrowLeft, ListVideo, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import DraggableLessonList from '@/components/admin/DraggableLessonList';
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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  orderIndex: number | null;
  isFreePreview: boolean | null;
}

function toDurationSeconds(value: string) {
  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    return (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
  }
  return Math.round(parseFloat(value) * 60) || 0;
}

const emptyForm = { title: '', content: '', videoUrl: '', videoDuration: '0:00', isFreePreview: false };

export default function ManageLessonsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchLessons = async (id: string) => {
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/courses/${id}/lessons`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'โหลดบทเรียนไม่สำเร็จ');
      setLessons(data.lessons || []);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'โหลดบทเรียนไม่สำเร็จ');
    }
  };

  useEffect(() => {
    void fetchLessons(courseId).finally(() => setLoading(false));
  }, [courseId]);

  const resetForm = () => {
    setFormData(emptyForm);
    setFormError('');
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!courseId) return;
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, videoDuration: toDurationSeconds(formData.videoDuration) }),
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

  const totalLessons = lessons.length;
  const lessonsWithVideo = lessons.filter((lesson) => Boolean(lesson.videoUrl)).length;
  const lessonsWithContent = lessons.filter((lesson) => Boolean(lesson.content?.trim())).length;
  const freePreviewCount = lessons.filter((lesson) => Boolean(lesson.isFreePreview)).length;
  const readinessPercent = totalLessons > 0 ? Math.round(((lessonsWithVideo + lessonsWithContent) / (totalLessons * 2)) * 100) : 0;

  if (loading) return <AdminLoadingState title="กำลังโหลดบทเรียน" />;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Lesson operations"
        title="จัดการบทเรียน"
        description="จัดลำดับ เติมวิดีโอ ตรวจเนื้อหา และกำหนดบทเรียนตัวอย่างจาก workspace เดียว"
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/courses"><ArrowLeft data-icon="inline-start" aria-hidden />คอร์สทั้งหมด</Link></Button>
            <Button onClick={() => { setFormData(emptyForm); setFormError(''); setShowForm(true); }}><Plus data-icon="inline-start" aria-hidden />เพิ่มบทเรียน</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="บทเรียนทั้งหมด" value={totalLessons.toLocaleString('th-TH')} detail="โครงสร้างในคอร์สนี้" />
        <AdminMetricCard label="มีวิดีโอแล้ว" value={lessonsWithVideo.toLocaleString('th-TH')} tone="info" detail="พร้อมสำหรับ player" />
        <AdminMetricCard label="มีเนื้อหาแล้ว" value={lessonsWithContent.toLocaleString('th-TH')} tone="success" detail="มีรายละเอียดประกอบ" />
        <AdminMetricCard label="Preview ฟรี" value={freePreviewCount.toLocaleString('th-TH')} tone="warning" detail="เปิดให้ทดลองเรียน" />
      </div>

      <AdminSection title="ความพร้อมของบทเรียน" description="คำนวณจากบทเรียนที่มีทั้งวิดีโอและเนื้อหาประกอบ">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1"><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">ความพร้อมรวม</span><strong>{readinessPercent}%</strong></div><Progress value={readinessPercent} /></div>
          <AdminStatusBadge tone={readinessPercent === 100 ? 'success' : readinessPercent >= 50 ? 'warning' : 'neutral'}>{readinessPercent === 100 ? 'พร้อม' : 'ต้องตรวจเพิ่ม'}</AdminStatusBadge>
        </div>
      </AdminSection>

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchLessons(courseId)}>ลองใหม่</Button>} /> : null}

      <AdminSection title="โครงสร้างบทเรียน" description="ลากเพื่อจัดลำดับ ใช้ตัวกรองหาบทที่ยังไม่พร้อม และแก้วิดีโอแบบ inline">
        {lessons.length === 0 ? (
          <AdminEmptyState icon={<ListVideo aria-hidden />} title="ยังไม่มีบทเรียน" description="เพิ่มบทเรียนแรกเพื่อเริ่มสร้างโครงสร้างคอร์ส" action={<Button onClick={() => setShowForm(true)}>เพิ่มบทเรียน</Button>} />
        ) : (
          <DraggableLessonList
            lessons={lessons}
            courseId={courseId || ''}
            onDelete={(id) => { setDeleteError(''); setDeleteTarget(lessons.find((lesson) => lesson.id === id) || null); }}
            onReorder={(newIds) => setLessons(newIds.map((id) => lessons.find((lesson) => lesson.id === id)!).filter(Boolean))}
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
              <Field><FieldLabel>เนื้อหาบทเรียน</FieldLabel><RichTextEditor content={formData.content} onChange={(content) => setFormData((previous) => ({ ...previous, content }))} /></Field>
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
    </div>
  );
}
