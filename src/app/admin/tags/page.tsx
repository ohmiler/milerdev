'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/Toast';

interface Tag {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
  createdAt: string;
}

export default function AdminTagsPage() {
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tags');
      const data = await res.json();
      setTagsList(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      showToast('กรุณาระบุชื่อแท็ก', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      });

      if (res.ok) {
        setNewTagName('');
        await fetchTags();
        showToast('สร้างแท็กสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการสร้างแท็ก', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      showToast('กรุณาระบุชื่อแท็ก', 'error');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/tags/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (res.ok) {
        setEditing(null);
        setEditName('');
        await fetchTags();
        showToast('อัพเดทแท็กสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการอัพเดทแท็ก', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const confirmDeleteTag = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(id);

    try {
      const res = await fetch('/api/admin/tags/' + id, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchTags();
        showToast('ลบแท็กสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการลบแท็ก', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditing(tag.id);
    setEditName(tag.name);
  };

  const deleteTarget = tagsList.find((tag) => tag.id === deleteConfirm);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Taxonomy"
        title="จัดการแท็ก"
        description="สร้างชื่อเรียกที่สม่ำเสมอสำหรับจัดหมวดหมู่และช่วยให้ผู้ดูแลค้นหาคอร์สได้เร็วขึ้น"
        meta={tagsList.length > 0 ? 'มีแท็กในระบบ ' + tagsList.length.toLocaleString('th-TH') + ' รายการ' : undefined}
      />

      <AdminSection
        title="สร้างแท็กใหม่"
        description="ใช้ชื่อสั้น อ่านง่าย และหลีกเลี่ยงแท็กที่มีความหมายซ้ำกัน"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="เช่น JavaScript, Python"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleCreate();
            }}
            aria-label="ชื่อแท็กใหม่"
          />
          <Button onClick={handleCreate} disabled={creating} className="sm:shrink-0">
            {creating ? (
              <AdminPendingLabel>กำลังสร้าง...</AdminPendingLabel>
            ) : (
              <>
                <Plus aria-hidden />
                สร้างแท็ก
              </>
            )}
          </Button>
        </div>
      </AdminSection>

      <AdminSection
        title="รายการแท็ก"
        description="จำนวนคอร์สช่วยบอกผลกระทบก่อนแก้ไขหรือลบแท็ก"
        actions={<AdminStatusBadge tone="info">{tagsList.length.toLocaleString('th-TH')} แท็ก</AdminStatusBadge>}
      >
        {loading ? (
          <AdminLoadingState title="กำลังโหลดแท็ก" />
        ) : tagsList.length === 0 ? (
          <AdminEmptyState
            title="ยังไม่มีแท็ก"
            description="เพิ่มแท็กจากช่องด้านบนเพื่อเริ่มจัดกลุ่มคอร์ส"
            icon={<TagIcon />}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tagsList.map((tag) => (
              <div
                key={tag.id}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/25"
              >
                {editing === tag.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleUpdate(tag.id);
                        if (event.key === 'Escape') {
                          setEditing(null);
                          setEditName('');
                        }
                      }}
                      aria-label={'แก้ไขชื่อแท็ก ' + tag.name}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating}
                        onClick={() => {
                          setEditing(null);
                          setEditName('');
                        }}
                      >
                        ยกเลิก
                      </Button>
                      <Button size="sm" disabled={updating} onClick={() => handleUpdate(tag.id)}>
                        {updating ? <AdminPendingLabel>กำลังบันทึก...</AdminPendingLabel> : 'บันทึก'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{tag.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">slug: {tag.slug}</p>
                      <AdminStatusBadge className="mt-3">
                        {tag.courseCount.toLocaleString('th-TH')} คอร์ส
                      </AdminStatusBadge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" title="แก้ไขแท็ก" onClick={() => startEdit(tag)}>
                        <Pencil aria-hidden />
                        <span className="sr-only">แก้ไข {tag.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="ลบแท็ก"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting === tag.id}
                        onClick={() => setDeleteConfirm(tag.id)}
                      >
                        <Trash2 aria-hidden />
                        <span className="sr-only">ลบ {tag.name}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบแท็ก"
        description={
          deleteTarget?.courseCount
            ? 'แท็กนี้ถูกใช้กับคอร์สอยู่ โปรดตรวจสอบการจัดหมวดหมู่หลังลบ'
            : 'แท็กจะถูกลบออกจากระบบและไม่สามารถเรียกคืนได้'
        }
        target={
          deleteTarget
            ? deleteTarget.name + ' · ' + deleteTarget.courseCount.toLocaleString('th-TH') + ' คอร์ส'
            : undefined
        }
        confirmLabel="ลบแท็ก"
        pendingLabel="กำลังลบ"
        pending={Boolean(deleting)}
        onConfirm={confirmDeleteTag}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
