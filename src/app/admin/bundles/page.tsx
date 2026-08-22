'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Package, Plus, Trash2 } from 'lucide-react';

import ImageUpload from '@/components/admin/ImageUpload';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CourseOption {
  id: string;
  title: string;
  price: string;
  status: string;
}

interface BundleCourse {
  courseId: string;
  courseTitle: string;
  coursePrice: string;
}

interface Bundle {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  status: string;
  courses: BundleCourse[];
  courseCount: number;
  totalOriginalPrice: number;
  discount: number;
  createdAt: string | null;
}

const defaultForm = {
  title: '',
  slug: '',
  description: '',
  price: '',
  status: 'draft',
  thumbnailUrl: '',
  courseIds: [] as string[],
};

const statusPresentation: Record<string, { label: string; tone: AdminTone }> = {
  published: { label: 'เผยแพร่', tone: 'success' },
  archived: { label: 'เก็บถาวร', tone: 'neutral' },
  draft: { label: 'แบบร่าง', tone: 'warning' },
};

export default function AdminBundlesPage() {
  const [bundlesList, setBundlesList] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchBundles = () => {
    setLoading(true);
    fetch('/api/admin/bundles')
      .then((response) => response.json())
      .then((data) => setBundlesList(data.bundles || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBundles();
    fetch('/api/admin/courses')
      .then((response) => response.json())
      .then((data) => setCourseOptions(data.courses || []))
      .catch(console.error);
  }, []);

  const handleEdit = (bundle: Bundle) => {
    setEditingId(bundle.id);
    setForm({
      title: bundle.title,
      slug: bundle.slug,
      description: bundle.description || '',
      price: bundle.price,
      status: bundle.status,
      thumbnailUrl: bundle.thumbnailUrl || '',
      courseIds: bundle.courses.map((course) => course.courseId),
    });
    setShowForm(true);
    setError('');
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    setError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(id);
    try {
      const res = await fetch('/api/admin/bundles/' + id, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchBundles();
      }
    } catch (deleteError) {
      console.error(deleteError);
    } finally {
      setDeleting(null);
    }
  };

  const toggleCourse = (courseId: string) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const selectedCoursesTotal = form.courseIds.reduce((sum, id) => {
    const course = courseOptions.find((option) => option.id === id);
    return sum + parseFloat(course?.price || '0');
  }, 0);

  const discountPercent =
    selectedCoursesTotal > 0 && parseFloat(form.price) > 0
      ? Math.round((1 - parseFloat(form.price) / selectedCoursesTotal) * 100)
      : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? '/api/admin/bundles/' + editingId : '/api/admin/bundles';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      fetchBundles();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const deleteTarget = bundlesList.find((bundle) => bundle.id === deleteConfirm);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Commerce"
        title="จัดการ Bundle"
        description="รวมหลายคอร์สเป็นชุดราคาเดียว พร้อมตรวจส่วนลดและสถานะก่อนเปิดขาย"
        actions={
          <Button onClick={handleNew}>
            <Plus aria-hidden />
            สร้าง Bundle
          </Button>
        }
      />

      <AdminSection
        title="Bundle ทั้งหมด"
        description="ตรวจคอร์สที่รวมอยู่ ราคาเต็ม ราคาขาย และสถานะเผยแพร่จากรายการเดียว"
        actions={<AdminStatusBadge tone="info">{bundlesList.length.toLocaleString('th-TH')} Bundle</AdminStatusBadge>}
      >
        {loading ? (
          <AdminLoadingState title="กำลังโหลด Bundle" />
        ) : bundlesList.length === 0 ? (
          <AdminEmptyState
            title="ยังไม่มี Bundle"
            description="สร้าง Bundle แรกเพื่อขายหลายคอร์สในราคาพิเศษ"
            icon={<Package />}
            action={
              <Button variant="outline" onClick={handleNew}>
                <Plus aria-hidden />
                สร้าง Bundle
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {bundlesList.map((bundle) => {
              const presentation = statusPresentation[bundle.status] ?? statusPresentation.draft;

              return (
                <article key={bundle.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">{bundle.title}</h2>
                        <AdminStatusBadge tone={presentation.tone}>{presentation.label}</AdminStatusBadge>
                        <AdminStatusBadge>{bundle.courseCount.toLocaleString('th-TH')} คอร์ส</AdminStatusBadge>
                      </div>
                      {bundle.description ? (
                        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {bundle.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bundle.courses.map((course) => (
                          <span
                            key={course.courseId}
                            className="rounded-md border border-primary/15 bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                          >
                            {course.courseTitle}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xl font-semibold tabular-nums text-foreground">
                          ฿{parseFloat(bundle.price).toLocaleString('th-TH')}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ฿{bundle.totalOriginalPrice.toLocaleString('th-TH')}
                        </span>
                        {bundle.discount > 0 ? (
                          <AdminStatusBadge tone="success">ลด {bundle.discount.toLocaleString('th-TH')}%</AdminStatusBadge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={'/bundles/' + bundle.slug} target="_blank">
                          <ExternalLink aria-hidden />
                          ดูหน้าขาย
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(bundle)}>
                        แก้ไข
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting === bundle.id}
                        onClick={() => setDeleteConfirm(bundle.id)}
                      >
                        <Trash2 aria-hidden />
                        ลบ
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (open) setShowForm(true);
          else closeForm();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไข Bundle' : 'สร้าง Bundle ใหม่'}</DialogTitle>
              <DialogDescription>กำหนดข้อมูล ราคา สถานะ รูปปก และคอร์สอย่างน้อย 2 รายการ</DialogDescription>
            </DialogHeader>

            {error ? (
              <Alert variant="destructive" className="mt-5">
                <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup className="my-6 gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bundle-title">ชื่อ Bundle *</FieldLabel>
                  <Input
                    id="bundle-title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="เช่น Full-Stack Developer Bundle"
                    required
                    autoFocus
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="bundle-slug">Slug</FieldLabel>
                  <Input
                    id="bundle-slug"
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="สร้างอัตโนมัติหากไม่ระบุ"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="bundle-description">รายละเอียด</FieldLabel>
                <Textarea
                  id="bundle-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="อธิบายจุดเด่นของ Bundle"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bundle-price">ราคา Bundle (บาท) *</FieldLabel>
                  <Input
                    id="bundle-price"
                    type="number"
                    value={form.price}
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    min="0"
                    step="0.01"
                    required
                  />
                  <FieldDescription
                    className={cn(
                      discountPercent > 0 && 'text-[var(--color-success-strong)]',
                      discountPercent < 0 && 'text-destructive',
                    )}
                  >
                    ราคารวมปกติ ฿{selectedCoursesTotal.toLocaleString('th-TH')} · ส่วนลด {discountPercent.toLocaleString('th-TH')}%
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bundle-status">สถานะ</FieldLabel>
                  <NativeSelect
                    id="bundle-status"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="draft">แบบร่าง</option>
                    <option value="published">เผยแพร่</option>
                    <option value="archived">เก็บถาวร</option>
                  </NativeSelect>
                </Field>
              </div>

              <Field>
                <FieldLabel>รูปปก Bundle</FieldLabel>
                <ImageUpload
                  value={form.thumbnailUrl}
                  onChange={(url) => setForm((current) => ({ ...current, thumbnailUrl: url }))}
                  folder="bundles"
                />
                <FieldDescription>ขนาดแนะนำ 1200 × 630 พิกเซล</FieldDescription>
              </Field>

              <Field>
                <FieldLabel>คอร์สใน Bundle *</FieldLabel>
                <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {courseOptions.map((course) => {
                    const selected = form.courseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
                          selected && 'bg-primary/5',
                        )}
                      >
                        <Checkbox checked={selected} onCheckedChange={() => toggleCourse(course.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{course.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {course.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                          ฿{parseFloat(course.price).toLocaleString('th-TH')}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldDescription>
                  เลือกแล้ว {form.courseIds.length.toLocaleString('th-TH')} คอร์ส · ราคารวม ฿
                  {selectedCoursesTotal.toLocaleString('th-TH')}
                </FieldDescription>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={closeForm}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <AdminPendingLabel>กำลังบันทึก...</AdminPendingLabel>
                ) : editingId ? (
                  'อัปเดต Bundle'
                ) : (
                  'สร้าง Bundle'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบ Bundle"
        description="Bundle จะถูกลบออกจากระบบ โปรดตรวจสอบว่าไม่มีหน้าขายหรือลิงก์การตลาดที่ยังอ้างถึง"
        target={
          deleteTarget
            ? deleteTarget.title + ' · ' + deleteTarget.courseCount.toLocaleString('th-TH') + ' คอร์ส'
            : undefined
        }
        confirmLabel="ลบ Bundle"
        pendingLabel="กำลังลบ"
        pending={Boolean(deleting)}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
