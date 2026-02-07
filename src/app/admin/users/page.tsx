'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        role: roleFilter,
        search,
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
  }, [currentPage, roleFilter, sortBy, sortOrder]);

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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
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
    } catch (error) {
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
    } catch (error) {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setProcessingBulk(false);
    }
  };

  if (loading) {
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
        <input
          type="text"
          placeholder="ค้นหาชื่อหรืออีเมล..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.875rem',
            minWidth: '200px',
          }}
        />
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
          <option value="all">ทุก Role</option>
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
        </select>
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ค้นหา
        </button>
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
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
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
