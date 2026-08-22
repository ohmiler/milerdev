'use client';

import { ArrowLeft, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  courseId: string;
}

export default function EditLessonPage() {
  const router = useRouter();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '', videoUrl: '', videoDuration: '0:00', isFreePreview: false });

  const fetchLesson = async (id: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/lessons/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่พบบทเรียน');
      const loadedLesson = data.lesson as Lesson;
      setLesson(loadedLesson);
      const totalSeconds = loadedLesson.videoDuration || 0;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setFormData({
        title: loadedLesson.title,
        content: loadedLesson.content || '',
        videoUrl: loadedLesson.videoUrl || '',
        videoDuration: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
        isFreePreview: loadedLesson.isFreePreview || false,
      });
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลบทเรียนไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLesson(lessonId);
  }, [lessonId]);

  const hasTitle = Boolean(formData.title.trim());
  const hasVideo = Boolean(formData.videoUrl.trim());
  const hasContent = Boolean(formData.content.trim().replace(/<[^>]*>/g, ''));
  const durationLabel = formData.videoDuration.trim() || '0:00';
  const orderLabel = lesson?.orderIndex != null ? String(lesson.orderIndex + 1).padStart(2, '0') : '--';
  const checklist = useMemo(() => [
    { label: 'ชื่อบทเรียน', ready: hasTitle, hint: hasTitle ? 'พร้อมแสดงในสารบัญ' : 'ควรใส่ชื่อให้ชัดเจน' },
    { label: 'เนื้อหา', ready: hasContent, hint: hasContent ? 'มีรายละเอียดประกอบ' : 'เพิ่มคำอธิบายหรือ resource' },
    { label: 'วิดีโอ', ready: hasVideo, hint: hasVideo ? 'เชื่อม video source แล้ว' : 'ยังไม่มี URL วิดีโอ' },
    { label: 'ระยะเวลา', ready: durationLabel !== '0:00' && durationLabel !== '0', hint: durationLabel !== '0:00' && durationLabel !== '0' ? 'ตั้งค่าแล้ว' : 'ช่วยผู้เรียนวางแผนเวลา' },
  ], [durationLabel, hasContent, hasTitle, hasVideo]);
  const readyCount = checklist.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / checklist.length) * 100);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lessonId) return;
    setSaving(true);
    setSaveError('');
    try {
      let durationInSeconds = 0;
      if (formData.videoDuration.includes(':')) {
        const [minutes, seconds] = formData.videoDuration.split(':');
        durationInSeconds = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
      } else {
        durationInSeconds = Math.round(parseFloat(formData.videoDuration) * 60) || 0;
      }
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, videoDuration: durationInSeconds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'บันทึกบทเรียนไม่สำเร็จ');
      showToast('บันทึกบทเรียนสำเร็จ', 'success');
      if (lesson?.courseId) router.push(`/admin/courses/${lesson.courseId}/lessons`);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : 'บันทึกบทเรียนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoadingState title="กำลังโหลดบทเรียน" />;
  if (!lesson) return <AdminErrorState description={loadError || 'ไม่พบบทเรียน'} action={<Button variant="outline" onClick={() => void fetchLesson(lessonId)}>ลองใหม่</Button>} />;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Lesson editor"
        title={formData.title || 'แก้ไขบทเรียน'}
        description="ปรับชื่อ เนื้อหา วิดีโอ ระยะเวลา และสิทธิ์ Preview ก่อนกลับไปจัดลำดับในสารบัญ"
        actions={<Button asChild variant="outline"><Link href={`/admin/courses/${lesson.courseId}/lessons`}><ArrowLeft data-icon="inline-start" aria-hidden />กลับไปจัดการบทเรียน</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="ลำดับ" value={orderLabel} detail="ตำแหน่งในสารบัญ" />
        <AdminMetricCard label="วิดีโอ" value={hasVideo ? 'พร้อม' : 'ยังไม่มี'} tone={hasVideo ? 'success' : 'warning'} detail={hasVideo ? 'เชื่อม video source แล้ว' : 'ควรเพิ่ม URL วิดีโอ'} />
        <AdminMetricCard label="ระยะเวลา" value={durationLabel} tone="info" detail="แสดงให้ผู้เรียนวางแผนเวลา" />
        <AdminMetricCard label="Preview" value={formData.isFreePreview ? 'เปิด' : 'เฉพาะผู้เรียน'} tone={formData.isFreePreview ? 'warning' : 'neutral'} detail={formData.isFreePreview ? 'ดูได้ก่อนซื้อคอร์ส' : 'จำกัดเฉพาะผู้มีสิทธิ์'} />
      </div>

      {saveError ? <Alert variant="destructive"><AlertTitle>บันทึกไม่สำเร็จ</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert> : null}

      <form id="lesson-edit-form" onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <AdminSection title="เนื้อหาหลักของบทเรียน" description="ชื่อและรายละเอียดควรช่วยให้ผู้เรียนเข้าใจว่าจะได้ทำอะไรในบทนี้">
            <FieldGroup>
              <Field><FieldLabel htmlFor="lesson-title">ชื่อบทเรียน *</FieldLabel><Input id="lesson-title" value={formData.title} onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))} required placeholder="เช่น State, Props และการจัดการ Component" /><FieldDescription>ใช้ชื่อที่สแกนง่ายเมื่ออยู่ในสารบัญ</FieldDescription></Field>
              <Field><FieldLabel>เนื้อหาบทเรียน</FieldLabel><RichTextEditor content={formData.content} onChange={(content) => setFormData((previous) => ({ ...previous, content }))} /><FieldDescription>ใส่ summary, code snippet, resource หรือโจทย์ฝึกหัด</FieldDescription></Field>
            </FieldGroup>
          </AdminSection>

          <AdminSection title="วิดีโอและการเข้าถึง" description="ตั้งค่าแหล่งวิดีโอ ระยะเวลา และสถานะ Preview ให้ตรงกับประสบการณ์เรียนจริง">
            <FieldGroup>
              <Field><FieldLabel htmlFor="lesson-video">URL วิดีโอ</FieldLabel><Input id="lesson-video" value={formData.videoUrl} onChange={(event) => setFormData((previous) => ({ ...previous, videoUrl: event.target.value }))} placeholder="Bunny Video GUID หรือ Embed URL" /><FieldDescription>รองรับ source ที่ระบบ course player ใช้งานอยู่</FieldDescription></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="lesson-duration">ระยะเวลา</FieldLabel><Input id="lesson-duration" value={formData.videoDuration} onChange={(event) => { if (/^[0-9:]*$/.test(event.target.value)) setFormData((previous) => ({ ...previous, videoDuration: event.target.value })); }} placeholder="10:30" /><FieldDescription>รูปแบบ นาที:วินาที</FieldDescription></Field>
                <Field orientation="horizontal" className="rounded-xl border p-4"><div className="flex-1"><FieldLabel htmlFor="lesson-preview">เปิดให้ดูฟรี</FieldLabel><FieldDescription>ใช้เป็น sample lesson ก่อนซื้อคอร์ส</FieldDescription></div><Switch id="lesson-preview" checked={formData.isFreePreview} onCheckedChange={(checked) => setFormData((previous) => ({ ...previous, isFreePreview: checked }))} /></Field>
              </div>
            </FieldGroup>
          </AdminSection>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card>
            <CardHeader><CardTitle>{readinessPercent}% พร้อมใช้งาน</CardTitle><CardDescription>{formData.title || 'ยังไม่มีชื่อบทเรียน'}</CardDescription></CardHeader>
            <CardContent className="grid gap-5">
              <Progress value={readinessPercent} aria-label={`ความพร้อม ${readinessPercent}%`} />
              <div className="grid gap-3">{checklist.map((item) => <div key={item.label} className="grid grid-cols-[1fr_auto] gap-2"><div><div className="text-sm font-medium">{item.label}</div><div className="mt-1 text-xs text-muted-foreground">{item.hint}</div></div><AdminStatusBadge tone={item.ready ? 'success' : 'neutral'}>{item.ready ? 'พร้อม' : 'ยังไม่พร้อม'}</AdminStatusBadge></div>)}</div>
              <Button type="submit" disabled={saving} size="lg">{saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />บันทึกการแก้ไข</>}</Button>
              <Button asChild variant="outline"><Link href={`/admin/courses/${lesson.courseId}/lessons`}>ยกเลิกและกลับไปสารบัญ</Link></Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
