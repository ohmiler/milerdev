'use client';

import { useEffect, useState } from 'react';
import { CircleOff, Megaphone, Plus, RadioTower } from 'lucide-react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
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
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/Toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetRole: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  creatorName: string | null;
  creatorEmail: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

const emptyForm = {
  title: '',
  content: '',
  type: 'info',
  targetRole: 'all',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

const typePresentation: Record<Announcement['type'], { label: string; tone: AdminTone }> = {
  info: { label: 'ข้อมูล', tone: 'info' },
  success: { label: 'สำเร็จ', tone: 'success' },
  warning: { label: 'คำเตือน', tone: 'warning' },
  error: { label: 'ข้อผิดพลาด', tone: 'danger' },
};

function getRoleText(role: string) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'instructor':
      return 'ผู้สอน';
    case 'student':
      return 'นักเรียน';
    default:
      return 'ทุกคน';
  }
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch('/api/admin/announcements?' + params);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.content) {
      showToast('กรุณาระบุหัวข้อและเนื้อหา', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? '/api/admin/announcements/' + editingId : '/api/admin/announcements';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchAnnouncements();
        resetForm();
        setShowForm(false);
        showToast(editingId ? 'แก้ไขประกาศสำเร็จ' : 'สร้างประกาศสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      targetRole: announcement.targetRole,
      isActive: announcement.isActive,
      startsAt: announcement.startsAt ? announcement.startsAt.split('T')[0] : '',
      endsAt: announcement.endsAt ? announcement.endsAt.split('T')[0] : '',
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(id);

    try {
      const res = await fetch('/api/admin/announcements/' + id, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchAnnouncements();
        showToast('ลบประกาศสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const res = await fetch('/api/admin/announcements/' + announcement.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !announcement.isActive }),
      });

      if (res.ok) await fetchAnnouncements();
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const deleteTarget = announcements.find((announcement) => announcement.id === deleteConfirm);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Communication"
        title="ประกาศ"
        description="จัดการข่าวสาร กำหนดกลุ่มเป้าหมาย และควบคุมช่วงเวลาที่ประกาศแสดงต่อผู้ใช้"
        actions={
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus aria-hidden />
            สร้างประกาศ
          </Button>
        }
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard label="ประกาศทั้งหมด" value={stats.total.toLocaleString('th-TH')} icon={<Megaphone />} />
          <AdminMetricCard
            label="กำลังเปิดใช้งาน"
            value={stats.active.toLocaleString('th-TH')}
            detail="ผู้ใช้มีโอกาสเห็นตามช่วงเวลาที่กำหนด"
            icon={<RadioTower />}
            tone="success"
          />
          <AdminMetricCard
            label="ปิดใช้งาน"
            value={stats.inactive.toLocaleString('th-TH')}
            icon={<CircleOff />}
            tone="neutral"
          />
        </div>
      ) : null}

      <AdminSection
        title="รายการประกาศ"
        description="กรองตามสถานะ แล้วเปิดหรือปิดการแสดงผลได้จากแต่ละรายการ"
        actions={
          <NativeSelect
            aria-label="กรองสถานะประกาศ"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-44"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </NativeSelect>
        }
      >
        {loading ? (
          <AdminLoadingState title="กำลังโหลดประกาศ" />
        ) : announcements.length === 0 ? (
          <AdminEmptyState
            title="ยังไม่มีประกาศ"
            description={
              statusFilter === 'all'
                ? 'สร้างประกาศแรกเพื่อสื่อสารกับผู้ใช้ในระบบ'
                : 'ไม่พบประกาศในสถานะที่เลือก'
            }
            icon={<Megaphone />}
            action={
              statusFilter === 'all' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                >
                  <Plus aria-hidden />
                  สร้างประกาศ
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((announcement) => {
              const presentation = typePresentation[announcement.type];

              return (
                <article
                  key={announcement.id}
                  className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge tone={presentation.tone}>{presentation.label}</AdminStatusBadge>
                      <AdminStatusBadge>{getRoleText(announcement.targetRole)}</AdminStatusBadge>
                      <AdminStatusBadge tone={announcement.isActive ? 'success' : 'neutral'}>
                        {announcement.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </AdminStatusBadge>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-foreground">{announcement.title}</h2>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{announcement.content}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      สร้างโดย {announcement.creatorName || announcement.creatorEmail || 'ไม่ทราบ'} ·{' '}
                      {new Date(announcement.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="mr-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Switch
                        aria-label={(announcement.isActive ? 'ปิด' : 'เปิด') + 'ประกาศ ' + announcement.title}
                        checked={announcement.isActive}
                        onCheckedChange={() => handleToggleActive(announcement)}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {announcement.isActive ? 'เปิดอยู่' : 'ปิดอยู่'}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}>
                      แก้ไข
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleting === announcement.id}
                      onClick={() => setDeleteConfirm(announcement.id)}
                    >
                      ลบ
                    </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}</DialogTitle>
              <DialogDescription>
                ระบุข้อความ กลุ่มผู้รับ และช่วงเวลาที่ต้องการแสดงประกาศ
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="my-6 gap-5">
              <Field>
                <FieldLabel htmlFor="announcement-title">หัวข้อ *</FieldLabel>
                <Input
                  id="announcement-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="หัวข้อประกาศ"
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="announcement-content">เนื้อหา *</FieldLabel>
                <Textarea
                  id="announcement-content"
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows={6}
                  placeholder="ข้อความที่ผู้ใช้จะเห็น"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="announcement-type">ประเภท</FieldLabel>
                  <NativeSelect
                    id="announcement-type"
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value })}
                  >
                    <option value="info">ข้อมูล</option>
                    <option value="success">สำเร็จ</option>
                    <option value="warning">คำเตือน</option>
                    <option value="error">ข้อผิดพลาด</option>
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel htmlFor="announcement-role">กลุ่มเป้าหมาย</FieldLabel>
                  <NativeSelect
                    id="announcement-role"
                    value={form.targetRole}
                    onChange={(event) => setForm({ ...form, targetRole: event.target.value })}
                  >
                    <option value="all">ทุกคน</option>
                    <option value="student">นักเรียน</option>
                    <option value="instructor">ผู้สอน</option>
                    <option value="admin">Admin</option>
                  </NativeSelect>
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="announcement-start">เริ่มแสดง</FieldLabel>
                  <Input
                    id="announcement-start"
                    type="date"
                    value={form.startsAt}
                    onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  />
                  <FieldDescription>เว้นว่างเพื่อเริ่มแสดงทันที</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="announcement-end">สิ้นสุด</FieldLabel>
                  <Input
                    id="announcement-end"
                    type="date"
                    value={form.endsAt}
                    onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                  />
                  <FieldDescription>เว้นว่างเพื่อไม่กำหนดวันสิ้นสุด</FieldDescription>
                </Field>
              </div>

              <Field orientation="horizontal" className="rounded-xl border border-border p-4">
                <Switch
                  id="announcement-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
                <div>
                  <FieldLabel htmlFor="announcement-active">เปิดใช้งานประกาศ</FieldLabel>
                  <FieldDescription>ปิดตัวเลือกนี้หากต้องการบันทึกเป็นฉบับที่ยังไม่แสดง</FieldDescription>
                </div>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={closeForm}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <AdminPendingLabel>กำลังบันทึก...</AdminPendingLabel> : editingId ? 'บันทึกการแก้ไข' : 'สร้างประกาศ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบประกาศ"
        description="ประกาศจะถูกนำออกจากระบบและไม่สามารถเรียกคืนได้"
        target={deleteTarget?.title}
        confirmLabel="ลบประกาศ"
        pendingLabel="กำลังลบ"
        pending={Boolean(deleting)}
        onConfirm={confirmDeleteAnnouncement}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
