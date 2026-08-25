'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ExternalLink, ImageIcon, Plus, Trash2 } from 'lucide-react';

import ImageUpload from '@/components/admin/ImageUpload';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string | null;
}

const defaultForm = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  orderIndex: 0,
  isActive: true,
};

export default function AdminAffiliateBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchBanners = () => {
    setLoading(true);
    fetch('/api/admin/affiliate-banners')
      .then((response) => response.json())
      .then((data) => setBanners(data.banners || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    setError('');
  };

  const openNewForm = () => {
    setShowForm(true);
    setEditingId(null);
    setForm(defaultForm);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId
        ? '/api/admin/affiliate-banners/' + editingId
        : '/api/admin/affiliate-banners';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      setError('');
      fetchBanners();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      orderIndex: banner.orderIndex,
      isActive: banner.isActive,
    });
    setEditingId(banner.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(id);
    try {
      await fetch('/api/admin/affiliate-banners/' + id, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchBanners();
    } catch {
      // Preserve the current silent retry behavior for this auxiliary content.
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    await fetch('/api/admin/affiliate-banners/' + banner.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    fetchBanners();
  };

  const deleteTarget = banners.find((banner) => banner.id === deleteConfirm);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Affiliate Content"
        title="Affiliate Banners"
        description="จัดลำดับภาพโปรโมต ตรวจสอบปลายทาง และควบคุมว่าแบนเนอร์ใดแสดงต่อผู้ใช้"
        actions={
          <Button onClick={openNewForm}>
            <Plus aria-hidden />
            เพิ่ม Banner
          </Button>
        }
      />

      <AdminSection
        title="รายการ Banner"
        description="ลำดับตัวเลขน้อยจะแสดงก่อน สามารถซ่อนชั่วคราวโดยไม่ต้องลบข้อมูล"
        actions={<AdminStatusBadge tone="info">{banners.length.toLocaleString('th-TH')} รายการ</AdminStatusBadge>}
      >
        {loading ? (
          <AdminLoadingState title="กำลังโหลด Banner" />
        ) : banners.length === 0 ? (
          <AdminEmptyState
            title="ยังไม่มี Banner"
            description="เพิ่ม Banner แรกเพื่อโปรโมตสินค้าและบริการที่แนะนำ"
            icon={<ImageIcon />}
            action={
              <Button variant="outline" onClick={openNewForm}>
                <Plus aria-hidden />
                เพิ่ม Banner
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {[...banners]
              .sort((left, right) => left.orderIndex - right.orderIndex)
              .map((banner) => (
                <article
                  key={banner.id}
                  className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="relative aspect-[12/5] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      unoptimized
                      sizes="180px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-foreground">{banner.title}</h2>
                      <AdminStatusBadge tone={banner.isActive ? 'success' : 'neutral'}>
                        {banner.isActive ? 'กำลังแสดง' : 'ซ่อนอยู่'}
                      </AdminStatusBadge>
                      <AdminStatusBadge>ลำดับ {banner.orderIndex.toLocaleString('th-TH')}</AdminStatusBadge>
                    </div>
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <span className="truncate">{banner.linkUrl}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={() => handleToggleActive(banner)}
                        aria-label={(banner.isActive ? 'ซ่อน ' : 'แสดง ') + banner.title}
                      />
                      <span className="text-xs text-muted-foreground">{banner.isActive ? 'แสดง' : 'ซ่อน'}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(banner)}>
                      แก้ไข
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      title="ลบ Banner"
                      disabled={deleting === banner.id}
                      onClick={() => setDeleteConfirm(banner.id)}
                    >
                      <Trash2 aria-hidden />
                      <span className="sr-only">ลบ {banner.title}</span>
                    </Button>
                  </div>
                </article>
              ))}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไข Banner' : 'เพิ่ม Banner ใหม่'}</DialogTitle>
              <DialogDescription>กำหนดภาพ ลิงก์ปลายทาง ลำดับ และสถานะการแสดงผล</DialogDescription>
            </DialogHeader>

            {error ? (
              <Alert variant="destructive" className="mt-5">
                <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup className="my-6 gap-5">
              <Field>
                <FieldLabel htmlFor="banner-title">ชื่อ Banner *</FieldLabel>
                <Input
                  id="banner-title"
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="เช่น USB-C Hub"
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel>รูปภาพ Banner *</FieldLabel>
                <ImageUpload
                  value={form.imageUrl}
                  onChange={(url: string) => setForm({ ...form, imageUrl: url })}
                  folder="affiliate-banners"
                />
                <FieldDescription>ขนาดแนะนำ 1200 × 500 พิกเซล</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="banner-link">ลิงก์ Affiliate *</FieldLabel>
                <Input
                  id="banner-link"
                  type="url"
                  required
                  value={form.linkUrl}
                  onChange={(event) => setForm({ ...form, linkUrl: event.target.value })}
                  placeholder="https://example.com/affiliate-link"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="banner-order">ลำดับ</FieldLabel>
                  <Input
                    id="banner-order"
                    type="number"
                    value={form.orderIndex}
                    onChange={(event) => setForm({ ...form, orderIndex: parseInt(event.target.value) || 0 })}
                  />
                </Field>
                <Field orientation="horizontal" className="rounded-xl border border-border p-4">
                  <Switch
                    id="banner-active"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <div>
                    <FieldLabel htmlFor="banner-active">แสดง Banner</FieldLabel>
                    <FieldDescription>พร้อมแสดงต่อผู้ใช้ทันทีหลังบันทึก</FieldDescription>
                  </div>
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={closeForm}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <AdminPendingLabel>กำลังบันทึก...</AdminPendingLabel> : editingId ? 'อัพเดท' : 'สร้าง'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบ Banner"
        description="Banner จะถูกลบออกจากระบบและไม่สามารถเรียกคืนได้"
        target={deleteTarget?.title}
        confirmLabel="ลบ Banner"
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
