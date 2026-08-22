'use client';

import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  minPurchase: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usageCount: number | null;
  perUserLimit: number | null;
  courseId: string | null;
  courseTitle: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

const defaultForm = {
  code: '',
  description: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  courseId: '',
  startsAt: '',
  expiresAt: '',
};

export default function AdminCouponsPage() {
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/coupons');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดคูปองได้');
      setCouponsList(data.coupons || []);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดคูปองได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoupons();
    fetch('/api/admin/courses')
      .then((response) => response.json())
      .then((data) => setCourseOptions((data.courses || []).map((course: CourseOption) => ({ id: course.id, title: course.title }))))
      .catch(() => setCourseOptions([]));
  }, [fetchCoupons]);

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType as 'percentage' | 'fixed',
      discountValue: coupon.discountValue,
      minPurchase: coupon.minPurchase || '',
      maxDiscount: coupon.maxDiscount || '',
      usageLimit: coupon.usageLimit?.toString() || '',
      perUserLimit: coupon.perUserLimit?.toString() || '1',
      courseId: coupon.courseId || '',
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
    });
    setError('');
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      discountValue: parseFloat(form.discountValue) || 0,
      minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : 1,
      courseId: form.courseId || null,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
    };

    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'บันทึกคูปองไม่สำเร็จ');
      setShowForm(false);
      await fetchCoupons();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกคูปองไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'เปลี่ยนสถานะคูปองไม่สำเร็จ');
      await fetchCoupons();
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนสถานะคูปองไม่สำเร็จ');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ลบคูปองไม่สำเร็จ');
      setDeleteTarget(null);
      await fetchCoupons();
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : 'ลบคูปองไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const formatDiscount = (type: string, value: string) =>
    type === 'percentage' ? `${value}%` : `฿${parseFloat(value).toLocaleString('th-TH')}`;
  const isExpired = (date: string | null) => Boolean(date && new Date(date) < new Date());

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Growth controls"
        title="คูปองและส่วนลด"
        description="สร้างข้อเสนอ กำหนดขอบเขตการใช้ และติดตามโควตาคงเหลือจากจุดเดียว"
        actions={
          <Button onClick={handleCreate}>
            <Plus data-icon="inline-start" aria-hidden />
            สร้างคูปอง
          </Button>
        }
        meta={`ทั้งหมด ${couponsList.length.toLocaleString('th-TH')} คูปอง`}
      />

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchCoupons()}>ลองใหม่</Button>} /> : null}

      <AdminSection title="รายการคูปอง" description="ปิดใช้งานคูปองเพื่อหยุดการใช้ชั่วคราว หรือลบเมื่อแน่ใจว่าไม่ต้องเก็บรายการแล้ว">
        {loading ? (
          <AdminLoadingState title="กำลังโหลดคูปอง" />
        ) : couponsList.length === 0 ? (
          <AdminEmptyState
            icon={<TicketPercent aria-hidden />}
            title="ยังไม่มีคูปอง"
            description="สร้างคูปองแรกเพื่อเริ่มมอบส่วนลดให้ผู้เรียน"
            action={<Button onClick={handleCreate}>สร้างคูปอง</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ส่วนลด</TableHead>
                <TableHead>ขอบเขต</TableHead>
                <TableHead>การใช้งาน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponsList.map((coupon) => {
                const expired = isExpired(coupon.expiresAt);
                return (
                  <TableRow key={coupon.id} className={expired || !coupon.isActive ? 'opacity-65' : undefined}>
                    <TableCell>
                      <div className="font-mono font-semibold text-primary">{coupon.code}</div>
                      {coupon.description ? <div className="mt-1 max-w-64 text-xs text-muted-foreground">{coupon.description}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[var(--color-success-strong)]">{formatDiscount(coupon.discountType, coupon.discountValue)}</div>
                      {coupon.maxDiscount ? <div className="mt-1 text-xs text-muted-foreground">สูงสุด ฿{parseFloat(coupon.maxDiscount).toLocaleString('th-TH')}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{coupon.courseTitle || 'ทุกคอร์ส'}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {coupon.usageCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' / ไม่จำกัด'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={coupon.isActive && !expired}
                          disabled={expired || togglingId === coupon.id}
                          onCheckedChange={() => void handleToggle(coupon)}
                          aria-label={`${coupon.isActive ? 'ปิด' : 'เปิด'}ใช้งานคูปอง ${coupon.code}`}
                        />
                        <AdminStatusBadge tone={expired ? 'danger' : coupon.isActive ? 'success' : 'neutral'}>
                          {expired ? 'หมดอายุ' : coupon.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </AdminStatusBadge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                          <Pencil data-icon="inline-start" aria-hidden />
                          แก้ไข
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setDeleteError(''); setDeleteTarget(coupon); }} aria-label={`ลบคูปอง ${coupon.code}`}>
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AdminSection>

      <Dialog open={showForm} onOpenChange={(open) => { if (!saving) setShowForm(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</DialogTitle>
            <DialogDescription>กำหนดมูลค่า เงื่อนไข และช่วงเวลาที่ใช้ส่วนลดได้</DialogDescription>
          </DialogHeader>
          <form id="coupon-form" onSubmit={handleSubmit}>
            <FieldGroup className="gap-5">
              {error ? <Alert variant="destructive"><AlertTitle>บันทึกไม่สำเร็จ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="coupon-code">รหัสคูปอง *</FieldLabel>
                  <Input id="coupon-code" required value={form.code} onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value.toUpperCase() }))} placeholder="SAVE20" className="font-mono uppercase" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="coupon-type">ประเภทส่วนลด *</FieldLabel>
                  <NativeSelect id="coupon-type" className="w-full" value={form.discountType} onChange={(event) => setForm((previous) => ({ ...previous, discountType: event.target.value === 'fixed' ? 'fixed' : 'percentage' }))}>
                    <NativeSelectOption value="percentage">เปอร์เซ็นต์ (%)</NativeSelectOption>
                    <NativeSelectOption value="fixed">จำนวนเงิน (฿)</NativeSelectOption>
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="coupon-value">มูลค่าส่วนลด *</FieldLabel>
                  <Input id="coupon-value" required type="number" step="0.01" min="0" value={form.discountValue} onChange={(event) => setForm((previous) => ({ ...previous, discountValue: event.target.value }))} placeholder={form.discountType === 'percentage' ? '20' : '100'} />
                </Field>
                {form.discountType === 'percentage' ? (
                  <Field>
                    <FieldLabel htmlFor="coupon-maximum">ลดสูงสุด (฿)</FieldLabel>
                    <Input id="coupon-maximum" type="number" step="0.01" min="0" value={form.maxDiscount} onChange={(event) => setForm((previous) => ({ ...previous, maxDiscount: event.target.value }))} placeholder="ไม่จำกัด" />
                  </Field>
                ) : null}
              </div>
              <Field>
                <FieldLabel htmlFor="coupon-description">คำอธิบาย</FieldLabel>
                <Input id="coupon-description" value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} placeholder="เช่น ส่วนลดสำหรับผู้เรียนใหม่" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="coupon-minimum">ยอดซื้อขั้นต่ำ (฿)</FieldLabel>
                  <Input id="coupon-minimum" type="number" step="0.01" min="0" value={form.minPurchase} onChange={(event) => setForm((previous) => ({ ...previous, minPurchase: event.target.value }))} placeholder="0" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="coupon-course">ใช้ได้กับคอร์ส</FieldLabel>
                  <NativeSelect id="coupon-course" className="w-full" value={form.courseId} onChange={(event) => setForm((previous) => ({ ...previous, courseId: event.target.value }))}>
                    <NativeSelectOption value="">ทุกคอร์ส</NativeSelectOption>
                    {courseOptions.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="coupon-limit">จำนวนใช้ได้ทั้งหมด</FieldLabel>
                  <Input id="coupon-limit" type="number" min="0" value={form.usageLimit} onChange={(event) => setForm((previous) => ({ ...previous, usageLimit: event.target.value }))} placeholder="ไม่จำกัด" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="coupon-user-limit">จำนวนต่อคน</FieldLabel>
                  <Input id="coupon-user-limit" type="number" min="1" value={form.perUserLimit} onChange={(event) => setForm((previous) => ({ ...previous, perUserLimit: event.target.value }))} placeholder="1" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="coupon-start">เริ่มใช้ได้</FieldLabel>
                  <Input id="coupon-start" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((previous) => ({ ...previous, startsAt: event.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="coupon-expiry">หมดอายุ</FieldLabel>
                  <Input id="coupon-expiry" type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((previous) => ({ ...previous, expiresAt: event.target.value }))} />
                </Field>
              </div>
              {form.discountType === 'percentage' && Number(form.discountValue) > 100 ? <FieldError>ส่วนลดเปอร์เซ็นต์ไม่ควรเกิน 100%</FieldError> : null}
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setShowForm(false)}>ยกเลิก</Button>
            <Button type="submit" form="coupon-form" disabled={saving}>
              {saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : editingId ? 'บันทึกการแก้ไข' : 'สร้างคูปอง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="ลบคูปองถาวร"
        description="การลบไม่สามารถย้อนกลับได้ หากต้องการหยุดใช้ชั่วคราวให้เลือกปิดใช้งานแทน"
        target={deleteTarget ? <span className="font-mono">{deleteTarget.code}</span> : null}
        confirmLabel="ลบคูปอง"
        pending={deleting}
        pendingLabel="กำลังลบ"
        error={deleteError || undefined}
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}
      />
    </div>
  );
}
