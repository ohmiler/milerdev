'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  AdminButton,
  AdminPageHero,
  AdminPill,
  AdminSectionHeading,
  AdminSurfaceCard,
} from '@/components/admin/ui/AdminPrimitives';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
  enrollmentCount: number;
}

interface Stats {
  total: number;
  admins: number;
  instructors: number;
  students: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'student' });
  
  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);
  
  // Bulk operations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkRole, setBulkRole] = useState('student');
  const [processingBulk, setProcessingBulk] = useState(false);
  
  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success?: number; skipped?: number; failed?: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Password reset
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        role: roleFilter,
        ...(searchDebounce && { search: searchDebounce }),
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter, sortBy, sortOrder, searchDebounce]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', role: user.role });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setUpdating(editingUser.id);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchUsers();
        setEditingUser(null);
        showToast('บันทึกสำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return;
    const userId = deleteConfirm;
    setDeleteConfirm(null);

    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchUsers();
        showToast('ลบผู้ใช้สำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'ไม่สามารถลบผู้ใช้ได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser) return;
    if (newPassword.length < 8) {
      showToast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordResetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        showToast(`เปลี่ยนรหัสผ่านของ ${passwordResetUser.name || passwordResetUser.email} สำเร็จ`, 'success');
        setPasswordResetUser(null);
        setNewPassword('');
        setShowPassword(false);
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return { background: '#fef2f2', color: '#dc2626' };
      case 'instructor': return { background: '#fef3c7', color: '#d97706' };
      default: return { background: '#dcfce7', color: '#16a34a' };
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'instructor': return 'ผู้สอน';
      default: return 'นักเรียน';
    }
  };


  const handleExport = async () => {
    const params = new URLSearchParams({ role: roleFilter });
    window.open(`/api/admin/users/export?${params}`, '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      setImportResult(data.results || data);
      if (res.ok) {
        await fetchUsers();
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการนำเข้า', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      showToast('กรุณาเลือกผู้ใช้และการดำเนินการ', 'error');
      return;
    }

    if (bulkAction === 'delete') {
      setBulkDeleteConfirm(true);
      return;
    }

    await executeBulkAction();
  };

  const executeBulkAction = async () => {
    setBulkDeleteConfirm(false);
    setProcessingBulk(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedUsers,
          data: bulkAction === 'updateRole' ? { role: bulkRole } : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`ดำเนินการสำเร็จ ${data.affectedCount} รายการ`, 'success');
        setSelectedUsers([]);
        setBulkAction('');
        await fetchUsers();
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setProcessingBulk(false);
    }
  };

  const useRedesignedWorkspace = true as boolean;
  if (useRedesignedWorkspace) {
    if (loading && users.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          กำลังโหลด...
        </div>
      );
    }

    return (
      <AdminUsersWorkspace
        users={users}
        stats={stats}
        pagination={pagination}
        search={search}
        roleFilter={roleFilter}
        sortBy={sortBy}
        selectedUsers={selectedUsers}
        bulkAction={bulkAction}
        bulkRole={bulkRole}
        processingBulk={processingBulk}
        importing={importing}
        importResult={importResult}
        editingUser={editingUser}
        editForm={editForm}
        updating={updating}
        passwordResetUser={passwordResetUser}
        newPassword={newPassword}
        showPassword={showPassword}
        resettingPassword={resettingPassword}
        deleteConfirm={deleteConfirm}
        bulkDeleteConfirm={bulkDeleteConfirm}
        getRoleStyle={getRoleStyle}
        getRoleText={getRoleText}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
        onRoleFilterChange={(value) => { setRoleFilter(value); setCurrentPage(1); }}
        onSortByChange={setSortBy}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectUser={toggleSelectUser}
        onBulkActionChange={setBulkAction}
        onBulkRoleChange={setBulkRole}
        onHandleBulkAction={handleBulkAction}
        onOpenImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onClearImportResult={() => setImportResult(null)}
        onHandleEdit={handleEdit}
        onOpenPasswordReset={(user) => { setPasswordResetUser(user); setNewPassword(''); setShowPassword(false); }}
        onDeleteRequest={setDeleteConfirm}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(pagination?.totalPages || 1, p + 1))}
        onCloseEdit={() => setEditingUser(null)}
        onEditFormChange={setEditForm}
        onSave={handleSave}
        onPasswordChange={setNewPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        onClosePasswordReset={() => { setPasswordResetUser(null); setNewPassword(''); setShowPassword(false); }}
        onResetPassword={handleResetPassword}
        onConfirmDelete={confirmDeleteUser}
        onCancelDelete={() => setDeleteConfirm(null)}
        onConfirmBulkDelete={executeBulkAction}
        onCancelBulkDelete={() => setBulkDeleteConfirm(false)}
        onImport={handleImport}
      />
    );
  }

  if (loading && users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          จัดการผู้ใช้
        </h1>
        <p style={{ color: '#64748b' }}>จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้ใช้ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>Admin</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{stats.admins}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ผู้สอน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.instructors}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>นักเรียน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{stats.students}</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '350px' }}>
          <svg
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#94a3b8',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">Role ทั้งหมด</option>
          <option value="admin">Admin</option>
          <option value="instructor">ผู้สอน</option>
          <option value="student">นักเรียน</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="createdAt">เรียงตามวันที่</option>
          <option value="name">เรียงตามชื่อ</option>
          <option value="email">เรียงตามอีเมล</option>
          <option value="enrollmentCount">เรียงตามคอร์สที่ลง</option>
        </select>
      </div>

      {/* Actions Row */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Bulk Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedUsers.length > 0 && (
            <>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                เลือก {selectedUsers.length} รายการ
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: 'white',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">เลือกการดำเนินการ</option>
                <option value="updateRole">เปลี่ยน Role</option>
                <option value="delete">ลบ</option>
              </select>
              {bulkAction === 'updateRole' && (
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="student">นักเรียน</option>
                  <option value="instructor">ผู้สอน</option>
                  <option value="admin">Admin</option>
                </select>
              )}
              <button
                onClick={handleBulkAction}
                disabled={processingBulk || !bulkAction}
                style={{
                  padding: '8px 16px',
                  background: bulkAction === 'delete' ? '#dc2626' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: processingBulk || !bulkAction ? 'not-allowed' : 'pointer',
                  opacity: processingBulk || !bulkAction ? 0.7 : 1,
                  fontSize: '0.875rem',
                }}
              >
                {processingBulk ? 'กำลังดำเนินการ...' : 'ดำเนินการ'}
              </button>
            </>
          )}
        </div>

        {/* Import/Export */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {importing ? 'กำลังนำเข้า...' : '📥 นำเข้า CSV'}
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📤 ส่งออก CSV
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: '8px' }}>ผลการนำเข้า</div>
          <div style={{ fontSize: '0.875rem', color: '#166534' }}>
            สำเร็จ: {importResult.success} | ข้าม: {importResult.skipped} | ล้มเหลว: {importResult.failed}
          </div>
          {(importResult.errors?.length ?? 0) > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#dc2626' }}>
              {importResult.errors?.slice(0, 5).map((err: string, i: number) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
          <button
            onClick={() => setImportResult(null)}
            style={{
              marginTop: '8px',
              padding: '4px 12px',
              background: 'transparent',
              color: '#16a34a',
              border: '1px solid #16a34a',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            ปิด
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            margin: '16px',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
              แก้ไขผู้ใช้
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                ชื่อ
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'white',
                }}
              >
                <option value="student">นักเรียน</option>
                <option value="instructor">ผู้สอน</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={updating === editingUser.id}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: updating === editingUser.id ? 'not-allowed' : 'pointer',
                  opacity: updating === editingUser.id ? 0.7 : 1,
                }}
              >
                {updating === editingUser.id ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  ผู้ใช้
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  Role
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  คอร์สที่ลงทะเบียน
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  วันที่สมัคร
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0', background: selectedUsers.includes(user.id) ? '#f0f9ff' : 'transparent' }}>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div
                        onClick={() => window.location.href = `/admin/users/${user.id}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 500, color: '#2563eb' }}>
                          {user.name || 'ไม่ระบุชื่อ'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '50px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      ...getRoleStyle(user.role),
                    }}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    {user.enrollmentCount} คอร์ส
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }) : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: '6px 12px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => { setPasswordResetUser(user); setNewPassword(''); setShowPassword(false); }}
                        style={{
                          padding: '6px 12px',
                          background: '#fef3c7',
                          color: '#d97706',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        รหัสผ่าน
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
                        disabled={updating === user.id}
                        style={{
                          padding: '6px 12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: updating === user.id ? 'not-allowed' : 'pointer',
                          opacity: updating === user.id ? 0.7 : 1,
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            ยังไม่มีผู้ใช้
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '16px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ก่อนหน้า
            </button>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
              หน้า {currentPage} จาก {pagination.totalPages} (ทั้งหมด {pagination.total} รายการ)
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
                cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === pagination.totalPages ? 0.5 : 1,
              }}
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            margin: '16px',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
              เปลี่ยนรหัสผ่าน
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>
              {passwordResetUser.name || 'ไม่ระบุชื่อ'} ({passwordResetUser.email})
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                รหัสผ่านใหม่
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    paddingRight: '48px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    padding: '4px 8px',
                  }}
                >
                  {showPassword ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '6px' }}>
                  รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPasswordResetUser(null); setNewPassword(''); setShowPassword(false); }}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword || newPassword.length < 8}
                style={{
                  padding: '10px 20px',
                  background: '#d97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: resettingPassword || newPassword.length < 8 ? 'not-allowed' : 'pointer',
                  opacity: resettingPassword || newPassword.length < 8 ? 0.7 : 1,
                }}
              >
                {resettingPassword ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบผู้ใช้"
        message="คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบผู้ใช้"
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="ลบผู้ใช้หลายรายการ"
        message={`คุณแน่ใจหรือไม่ที่จะลบ ${selectedUsers.length} ผู้ใช้?`}
        confirmText="ลบทั้งหมด"
        onConfirm={executeBulkAction}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}

interface AdminUsersWorkspaceProps {
  users: User[];
  stats: Stats | null;
  pagination: Pagination | null;
  search: string;
  roleFilter: string;
  sortBy: string;
  selectedUsers: string[];
  bulkAction: string;
  bulkRole: string;
  processingBulk: boolean;
  importing: boolean;
  importResult: { success?: number; skipped?: number; failed?: number; errors?: string[] } | null;
  editingUser: User | null;
  editForm: { name: string; role: string };
  updating: string | null;
  passwordResetUser: User | null;
  newPassword: string;
  showPassword: boolean;
  resettingPassword: boolean;
  deleteConfirm: string | null;
  bulkDeleteConfirm: boolean;
  getRoleStyle: (role: string) => { background: string; color: string };
  getRoleText: (role: string) => string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onToggleSelectAll: () => void;
  onToggleSelectUser: (userId: string) => void;
  onBulkActionChange: (value: string) => void;
  onBulkRoleChange: (value: string) => void;
  onHandleBulkAction: () => void;
  onOpenImport: () => void;
  onExport: () => void;
  onClearImportResult: () => void;
  onHandleEdit: (user: User) => void;
  onOpenPasswordReset: (user: User) => void;
  onDeleteRequest: (userId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onCloseEdit: () => void;
  onEditFormChange: (value: { name: string; role: string }) => void;
  onSave: () => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onClosePasswordReset: () => void;
  onResetPassword: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmBulkDelete: () => void;
  onCancelBulkDelete: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function AdminUsersWorkspace({
  users,
  stats,
  pagination,
  search,
  roleFilter,
  sortBy,
  selectedUsers,
  bulkAction,
  bulkRole,
  processingBulk,
  importing,
  importResult,
  editingUser,
  editForm,
  updating,
  passwordResetUser,
  newPassword,
  showPassword,
  resettingPassword,
  deleteConfirm,
  bulkDeleteConfirm,
  getRoleStyle,
  getRoleText,
  onSearchChange,
  onRoleFilterChange,
  onSortByChange,
  onToggleSelectAll,
  onToggleSelectUser,
  onBulkActionChange,
  onBulkRoleChange,
  onHandleBulkAction,
  onOpenImport,
  onExport,
  onClearImportResult,
  onHandleEdit,
  onOpenPasswordReset,
  onDeleteRequest,
  onPrevPage,
  onNextPage,
  onCloseEdit,
  onEditFormChange,
  onSave,
  onPasswordChange,
  onToggleShowPassword,
  onClosePasswordReset,
  onResetPassword,
  onConfirmDelete,
  onCancelDelete,
  onConfirmBulkDelete,
  onCancelBulkDelete,
  onImport,
}: AdminUsersWorkspaceProps) {
  const formatDate = (dateString: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '-';

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <AdminPageHero
        eyebrow="User Directory"
        title="ดูแลบัญชีผู้ใช้ สิทธิ์ และการดำเนินการแบบกลุ่ม"
        description="รวมการค้นหา กรอง แก้ไขบทบาท นำเข้า-ส่งออก CSV และจัดการบัญชีสำคัญไว้ใน workspace เดียว เพื่อให้ทีมดูแลฐานผู้ใช้ได้เร็วขึ้นและสม่ำเสมอขึ้น"
        actions={
          <>
            <AdminButton tone="default" onClick={onOpenImport} disabled={importing}>
              {importing ? 'กำลังนำเข้า...' : 'นำเข้า CSV'}
            </AdminButton>
            <AdminButton tone="dark" onClick={onExport}>
              ส่งออก CSV
            </AdminButton>
            <AdminPill tone={selectedUsers.length > 0 ? 'warning' : 'default'}>
              เลือกแล้ว {selectedUsers.length} รายการ
            </AdminPill>
          </>
        }
        meta="ออกแบบให้รองรับงานที่ทำซ้ำบ่อย เช่นค้นหาบัญชี, เปลี่ยน role แบบกลุ่ม, reset password และดูสถานะฐานผู้ใช้จากหน้าเดียว"
      />

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
          {[
            ['บัญชีทั้งหมด', stats.total, '#2563eb', 'ผู้ใช้ที่มีอยู่ในระบบ'],
            ['Admin', stats.admins, '#dc2626', 'สิทธิ์ระดับดูแลระบบ'],
            ['Instructors', stats.instructors, '#b45309', 'ผู้สอนที่ดูแลคอร์ส'],
            ['Students', stats.students, '#15803d', 'ผู้เรียนที่ใช้งานอยู่'],
          ].map(([label, value, color, note]) => (
            <AdminSurfaceCard key={String(label)} style={{ padding: '20px 22px' }}>
              <div style={summaryLabelStyle}>{label}</div>
              <div style={{ color: String(color), fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '6px' }}>{value}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.6 }}>{note}</div>
            </AdminSurfaceCard>
          ))}
        </div>
      )}

      <AdminSurfaceCard>
        <AdminSectionHeading
          title="Member Operations"
          description="ค้นหา กรอง และจัดการบัญชีจากรายการเดียว พร้อมทางลัดสำหรับ bulk actions, import/export และงานดูแลบัญชีสำคัญ"
        />

        <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <svg
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#94a3b8' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="ค้นหาจากชื่อหรืออีเมล" value={search} onChange={(e) => onSearchChange(e.target.value)} style={filterInputStyle} />
            </div>
            <select value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)} style={filterSelectStyle}>
              <option value="all">ทุก role</option>
              <option value="admin">Admin</option>
              <option value="instructor">ผู้สอน</option>
              <option value="student">นักเรียน</option>
            </select>
            <select value={sortBy} onChange={(e) => onSortByChange(e.target.value)} style={filterSelectStyle}>
              <option value="createdAt">เรียงตามวันที่</option>
              <option value="name">เรียงตามชื่อ</option>
              <option value="email">เรียงตามอีเมล</option>
              <option value="enrollmentCount">เรียงตามคอร์สที่ลง</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '18px', background: '#f8fbff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <AdminPill tone="default">ทั้งหมด {pagination?.total ?? users.length} บัญชี</AdminPill>
              <AdminPill tone="success">นักเรียน {stats?.students ?? 0}</AdminPill>
              <AdminPill tone="warning">ผู้สอน {stats?.instructors ?? 0}</AdminPill>
            </div>
            {selectedUsers.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>เลือก {selectedUsers.length} รายการ</span>
                <select value={bulkAction} onChange={(e) => onBulkActionChange(e.target.value)} style={bulkSelectStyle}>
                  <option value="">เลือกการดำเนินการ</option>
                  <option value="updateRole">เปลี่ยน role</option>
                  <option value="delete">ลบ</option>
                </select>
                {bulkAction === 'updateRole' && (
                  <select value={bulkRole} onChange={(e) => onBulkRoleChange(e.target.value)} style={bulkSelectStyle}>
                    <option value="student">นักเรียน</option>
                    <option value="instructor">ผู้สอน</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                <button onClick={onHandleBulkAction} disabled={processingBulk || !bulkAction} style={{ padding: '10px 16px', background: bulkAction === 'delete' ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '12px', cursor: processingBulk || !bulkAction ? 'not-allowed' : 'pointer', opacity: processingBulk || !bulkAction ? 0.7 : 1, fontSize: '0.875rem', fontWeight: 700 }}>
                  {processingBulk ? 'กำลังดำเนินการ...' : 'ดำเนินการ'}
                </button>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>เลือกผู้ใช้จากตารางเพื่อใช้ bulk actions</div>
            )}
          </div>
        </div>
        {importResult && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>Import result</div>
            <div style={{ fontSize: '0.875rem', color: '#166534' }}>
              Success: {importResult.success} | Skipped: {importResult.skipped} | Failed: {importResult.failed}
            </div>
            {(importResult.errors?.length ?? 0) > 0 && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#dc2626' }}>
                {importResult.errors?.slice(0, 5).map((err: string, i: number) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <button
              onClick={onClearImportResult}
              style={{ marginTop: '8px', padding: '4px 12px', background: 'transparent', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '999px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px', background: 'white' }}>
            <thead>
              <tr style={{ background: '#f8fbff', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ ...headerCellStyle, textAlign: 'center', width: '52px' }}>
                  <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={onToggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={headerCellStyle}>User</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Role</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Enrollments</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Joined</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #edf2f7', background: selectedUsers.includes(user.id) ? '#f8fbff' : 'transparent' }}>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => onToggleSelectUser(user.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={bodyCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                        {(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                      </div>
                      <div onClick={() => (window.location.href = `/admin/users/${user.id}`)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>{user.name || 'No name'}</div>
                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, ...getRoleStyle(user.role) }}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center', color: '#64748b' }}>{user.enrollmentCount} courses</td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>{formatDate(user.createdAt)}</td>
                  <td style={{ ...bodyCellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button onClick={() => onHandleEdit(user)} style={actionButtonStyle('#eff6ff', '#2563eb')}>Edit</button>
                      <button onClick={() => onOpenPasswordReset(user)} style={actionButtonStyle('#fff7ed', '#b45309')}>Password</button>
                      <button
                        onClick={() => onDeleteRequest(user.id)}
                        disabled={updating === user.id}
                        style={{ ...actionButtonStyle('#fef2f2', '#dc2626'), cursor: updating === user.id ? 'not-allowed' : 'pointer', opacity: updating === user.id ? 0.7 : 1 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>No users found</div>}

        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '18px', borderTop: '1px solid #e2e8f0' }}>
            <button onClick={onPrevPage} disabled={pagination.page === 1} style={paginationButtonStyle(pagination.page === 1)}>Previous</button>
            <span style={{ color: '#64748b', fontSize: '0.84rem' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <button onClick={onNextPage} disabled={pagination.page === pagination.totalPages} style={paginationButtonStyle(pagination.page === pagination.totalPages)}>Next</button>
          </div>
        )}
      </AdminSurfaceCard>

      {editingUser && (
        <div style={modalBackdropStyle}>
          <div style={modalPanelStyle(400)}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' }}>Edit user</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={modalLabelStyle}>Name</label>
              <input type="text" value={editForm.name} onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })} style={modalInputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={modalLabelStyle}>Role</label>
              <select value={editForm.role} onChange={(e) => onEditFormChange({ ...editForm, role: e.target.value })} style={{ ...modalInputStyle, background: 'white' }}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={onCloseEdit} style={secondaryModalButtonStyle}>Cancel</button>
              <button onClick={onSave} disabled={updating === editingUser.id} style={{ ...primaryModalButtonStyle, cursor: updating === editingUser.id ? 'not-allowed' : 'pointer', opacity: updating === editingUser.id ? 0.7 : 1 }}>
                {updating === editingUser.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordResetUser && (
        <div style={modalBackdropStyle}>
          <div style={modalPanelStyle(420)}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>Reset password</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>
              {passwordResetUser.name || 'No name'} ({passwordResetUser.email})
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={modalLabelStyle}>New password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => onPasswordChange(e.target.value)} placeholder="At least 8 characters" style={{ ...modalInputStyle, paddingRight: '48px' }} />
                <button type="button" onClick={onToggleShowPassword} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b', padding: '4px 8px' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '6px' }}>Password must be at least 8 characters</p>}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={onClosePasswordReset} style={secondaryModalButtonStyle}>Cancel</button>
              <button onClick={onResetPassword} disabled={resettingPassword || newPassword.length < 8} style={{ ...warningModalButtonStyle, cursor: resettingPassword || newPassword.length < 8 ? 'not-allowed' : 'pointer', opacity: resettingPassword || newPassword.length < 8 ? 0.7 : 1 }}>
                {resettingPassword ? 'Saving...' : 'Reset password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete user"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete user"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="Delete selected users"
        message={`Are you sure you want to delete ${selectedUsers.length} users?`}
        confirmText="Delete all"
        onConfirm={onConfirmBulkDelete}
        onCancel={onCancelBulkDelete}
      />

      <input type="file" onChange={onImport} accept=".csv" style={{ display: 'none' }} />
    </div>
  );
}

const summaryLabelStyle: CSSProperties = {
  color: '#64748b',
  fontSize: '0.78rem',
  marginBottom: '8px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const filterInputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  border: '1px solid #dbe5f0',
  borderRadius: '14px',
  fontSize: '0.9rem',
  background: '#f8fbff',
  color: '#0f172a',
};

const filterSelectStyle: CSSProperties = {
  padding: '12px 14px',
  border: '1px solid #dbe5f0',
  borderRadius: '14px',
  background: '#f8fbff',
  fontSize: '0.875rem',
  color: '#334155',
};

const bulkSelectStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #dbe5f0',
  borderRadius: '12px',
  background: 'white',
  fontSize: '0.875rem',
};

const headerCellStyle: CSSProperties = {
  padding: '15px 18px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#64748b',
  fontSize: '0.79rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bodyCellStyle: CSSProperties = {
  padding: '18px',
  verticalAlign: 'middle',
};

const actionButtonStyle = (background: string, color: string): CSSProperties => ({
  padding: '8px 12px',
  background,
  color,
  border: '1px solid transparent',
  borderRadius: '10px',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
});

const paginationButtonStyle = (disabled: boolean): CSSProperties => ({
  padding: '9px 16px',
  border: '1px solid #dbe5f0',
  borderRadius: '10px',
  background: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.48)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalPanelStyle = (maxWidth: number): CSSProperties => ({
  background: 'white',
  borderRadius: '18px',
  padding: '24px',
  width: '100%',
  maxWidth,
  margin: '16px',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
});

const modalLabelStyle: CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '8px',
  color: '#374151',
};

const modalInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #dbe5f0',
  borderRadius: '12px',
  fontSize: '1rem',
};

const secondaryModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 700,
};

const primaryModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 700,
};

const warningModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: '#d97706',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 700,
};
