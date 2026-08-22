'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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

    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
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
    }
  };

  const confirmDeleteTag = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>
          จัดการแท็ก
        </h1>
        <p style={{ color: 'var(--muted-foreground)' }}>สร้างและจัดการแท็กสำหรับจัดหมวดหมู่คอร์ส</p>
      </div>

      {/* Create New Tag */}
      <div style={{
        background: 'var(--card)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '16px' }}>
          สร้างแท็กใหม่
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="ชื่อแท็ก เช่น JavaScript, Python..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '12px 24px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'กำลังสร้าง...' : '+ สร้างแท็ก'}
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div style={{
        background: 'var(--card)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
            รายการแท็ก ({tagsList.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            กำลังโหลด...
          </div>
        ) : tagsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            ยังไม่มีแท็ก สร้างแท็กใหม่ด้านบน
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {tagsList.map((tag) => (
                <div
                  key={tag.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'var(--muted)',
                    borderRadius: '50px',
                    fontSize: '0.875rem',
                  }}
                >
                  {editing === tag.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          width: '120px',
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(tag.id)}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--color-success-strong)',
                          color: 'var(--primary-foreground)',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => { setEditing(null); setEditName(''); }}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--muted-foreground)',
                          color: 'var(--primary-foreground)',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{tag.name}</span>
                      <span style={{
                        background: 'var(--border)',
                        padding: '2px 8px',
                        borderRadius: '50px',
                        fontSize: '0.625rem',
                        color: 'var(--muted-foreground)',
                      }}>
                        {tag.courseCount} คอร์ส
                      </span>
                      <button
                        onClick={() => startEdit(tag)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-foreground)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                        title="แก้ไข"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(tag.id)}
                        disabled={deleting === tag.id}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error-strong)',
                          cursor: deleting === tag.id ? 'not-allowed' : 'pointer',
                          opacity: deleting === tag.id ? 0.5 : 1,
                          fontSize: '0.75rem',
                        }}
                        title="ลบ"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบแท็ก"
        message="คุณแน่ใจหรือไม่ที่จะลบแท็กนี้?"
        confirmText="ลบแท็ก"
        onConfirm={confirmDeleteTag}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
