'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info',
    targetRole: 'all',
    isActive: true,
    startsAt: '',
    endsAt: '',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch(`/api/admin/announcements?${params}`);
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
    setForm({
      title: '',
      content: '',
      type: 'info',
      targetRole: 'all',
      isActive: true,
      startsAt: '',
      endsAt: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      showToast('กรุณาระบุหัวข้อและเนื้อหา', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingId 
        ? `/api/admin/announcements/${editingId}` 
        : '/api/admin/announcements';
      
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
    setDeleteConfirm(null);

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
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
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !announcement.isActive }),
      });

      if (res.ok) {
        await fetchAnnouncements();
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'success': return { background: 'var(--color-success-soft)', color: 'var(--color-success-strong)' };
      case 'warning': return { background: 'var(--color-warning-soft)', color: 'var(--color-warning-strong)' };
      case 'error': return { background: 'var(--color-error-soft)', color: 'var(--color-error-strong)' };
      default: return { background: 'var(--secondary)', color: 'var(--primary)' };
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'success': return 'สำเร็จ';
      case 'warning': return 'คำเตือน';
      case 'error': return 'ข้อผิดพลาด';
      default: return 'ข้อมูล';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'instructor': return 'ผู้สอน';
      case 'student': return 'นักเรียน';
      default: return 'ทุกคน';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>
            ประกาศ
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>จัดการประกาศและข่าวสารสำหรับผู้ใช้</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            padding: '12px 24px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + สร้างประกาศ
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>เปิดใช้งาน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success-strong)' }}>{stats.active}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '4px' }}>ปิดใช้งาน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>{stats.inactive}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '24px' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--card)',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'color-mix(in oklch, var(--foreground) 48%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: 'var(--foreground)' }}>
              {editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                  หัวข้อ *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                  เนื้อหา *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                    ประเภท
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--card)',
                    }}
                  >
                    <option value="info">ข้อมูล</option>
                    <option value="success">สำเร็จ</option>
                    <option value="warning">คำเตือน</option>
                    <option value="error">ข้อผิดพลาด</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                    กลุ่มเป้าหมาย
                  </label>
                  <select
                    value={form.targetRole}
                    onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--card)',
                    }}
                  >
                    <option value="all">ทุกคน</option>
                    <option value="student">นักเรียน</option>
                    <option value="instructor">ผู้สอน</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                    เริ่มแสดง (ถ้ามี)
                  </label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: 'var(--foreground)' }}>
                    สิ้นสุด (ถ้ามี)
                  </label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ color: 'var(--foreground)' }}>เปิดใช้งาน</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'สร้าง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div style={{
        background: 'var(--card)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            กำลังโหลด...
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted-foreground)' }}>
            ยังไม่มีประกาศ
          </div>
        ) : (
          <div>
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  padding: '20px',
                  borderBottom: '1px solid var(--muted)',
                  opacity: announcement.isActive ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        ...getTypeStyle(announcement.type),
                      }}>
                        {getTypeText(announcement.type)}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        background: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                      }}>
                        {getRoleText(announcement.targetRole)}
                      </span>
                      {!announcement.isActive && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          background: 'var(--color-error-soft)',
                          color: 'var(--color-error-strong)',
                        }}>
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>
                      {announcement.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '8px', lineHeight: 1.6 }}>
                      {announcement.content.length > 200 
                        ? announcement.content.substring(0, 200) + '...' 
                        : announcement.content}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      สร้างโดย {announcement.creatorName || announcement.creatorEmail || 'ไม่ทราบ'} • 
                      {new Date(announcement.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleActive(announcement)}
                      style={{
                        padding: '6px 12px',
                        background: announcement.isActive ? 'var(--color-error-soft)' : 'var(--color-success-soft)',
                        color: announcement.isActive ? 'var(--color-error-strong)' : 'var(--color-success-strong)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {announcement.isActive ? 'ปิด' : 'เปิด'}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--secondary)',
                        color: 'var(--primary)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(announcement.id)}
                      disabled={deleting === announcement.id}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--color-error-soft)',
                        color: 'var(--color-error-strong)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: deleting === announcement.id ? 'not-allowed' : 'pointer',
                        opacity: deleting === announcement.id ? 0.7 : 1,
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบประกาศ"
        message="คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?"
        confirmText="ลบประกาศ"
        onConfirm={confirmDeleteAnnouncement}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
