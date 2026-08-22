'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AdminButton,
  AdminPageHero,
  AdminPill,
  AdminSectionHeading,
  AdminSurfaceCard,
} from '@/components/admin/ui/AdminPrimitives';
import { AdminMetricCard } from '@/components/admin/ui/AdminOperations';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import {
  AdminUserLifecycleAction,
  AdminUserLifecycleBadge,
} from '@/components/admin/AdminUserLifecycleControls';
import {
  applyAuthoritativeLifecycleState,
  buildAdminUsersSearchParams,
  getLifecyclePresentation,
  lifecycleDeactivationDialog,
  lifecycleMutationFeedback,
  type AdminUserLifecycleAction as AdminUserLifecycleActionName,
  type AuthoritativeLifecycleUser,
} from '@/lib/admin-user-lifecycle-ui';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
  enrollmentCount: number;
  lifecycleStatus: 'active' | 'inactive';
  deactivatedAt: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'student' });
  
  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<User | null>(null);

  // Password reset
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = buildAdminUsersSearchParams({
        page: currentPage,
        role: roleFilter,
        status: statusFilter,
        search: searchDebounce,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
      }
      const nextUsers = (data.users || []) as User[];
      setUsers(nextUsers);
      setSelectedUsers((current) => current.filter((id) => nextUsers.some((user) => user.id === id)));
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter, statusFilter, sortBy, sortOrder, searchDebounce]);

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

  const executeLifecycleAction = async (user: User, action: AdminUserLifecycleActionName) => {
    setUpdating(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((current) => applyAuthoritativeLifecycleState(
          current,
          (data.users || []) as AuthoritativeLifecycleUser[],
        ) as User[]);
        showToast(lifecycleMutationFeedback(action, data.changedCount ?? 0, data.skippedCount ?? 0), 'success');
        await fetchUsers();
      } else {
        showToast(data.error || 'ไม่สามารถเปลี่ยนสถานะบัญชีได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
      if (action === 'deactivate') setLifecycleConfirm(null);
    }
  };

  const handleLifecycleRequest = (user: User) => {
    const { action } = getLifecyclePresentation(user.lifecycleStatus);
    if (action === 'deactivate') {
      setLifecycleConfirm(user);
      return;
    }
    void executeLifecycleAction(user, action);
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
      case 'admin': return { background: 'var(--color-error-soft)', color: 'var(--color-error-strong)' };
      case 'instructor': return { background: 'var(--color-warning-soft)', color: 'var(--color-warning-strong)' };
      default: return { background: 'var(--color-success-soft)', color: 'var(--color-success-strong)' };
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
    const params = new URLSearchParams({ role: roleFilter, status: statusFilter });
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

    if (bulkAction === 'delete' || bulkAction === 'deactivate') {
      setBulkDeleteConfirm(true);
      return;
    }

    await executeBulkAction();
  };

  const executeBulkAction = async () => {
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
        const lifecycleAction = bulkAction === 'reactivate' ? 'reactivate' : 'deactivate';
        if (bulkAction !== 'updateRole') {
          setUsers((current) => applyAuthoritativeLifecycleState(
            current,
            (data.users || []) as AuthoritativeLifecycleUser[],
          ) as User[]);
          showToast(lifecycleMutationFeedback(lifecycleAction, data.changedCount ?? 0, data.skippedCount ?? 0), 'success');
        } else {
          showToast(`เปลี่ยนบทบาทสำเร็จ ${data.changedCount ?? 0} บัญชี`, 'success');
        }
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
      setBulkDeleteConfirm(false);
    }
  };

    if (loading && users.length === 0) {
      return (
        <div className="admin-users-state" role="status">
          กำลังโหลดรายชื่อผู้ใช้...
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
        statusFilter={statusFilter}
        sortBy={sortBy}
        loading={loading}
        loadError={loadError}
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
        lifecycleConfirm={lifecycleConfirm}
        bulkDeleteConfirm={bulkDeleteConfirm}
        getRoleStyle={getRoleStyle}
        getRoleText={getRoleText}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); setSelectedUsers([]); }}
        onRoleFilterChange={(value) => { setRoleFilter(value); setCurrentPage(1); setSelectedUsers([]); }}
        onStatusFilterChange={(value) => { setStatusFilter(value); setCurrentPage(1); setSelectedUsers([]); }}
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
        onLifecycleRequest={handleLifecycleRequest}
        onRetry={fetchUsers}
        onPrevPage={() => { setSelectedUsers([]); setCurrentPage((p) => Math.max(1, p - 1)); }}
        onNextPage={() => { setSelectedUsers([]); setCurrentPage((p) => Math.min(pagination?.totalPages || 1, p + 1)); }}
        onCloseEdit={() => setEditingUser(null)}
        onEditFormChange={setEditForm}
        onSave={handleSave}
        onPasswordChange={setNewPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        onClosePasswordReset={() => { setPasswordResetUser(null); setNewPassword(''); setShowPassword(false); }}
        onResetPassword={handleResetPassword}
        onConfirmLifecycle={() => lifecycleConfirm && void executeLifecycleAction(lifecycleConfirm, 'deactivate')}
        onCancelLifecycle={() => setLifecycleConfirm(null)}
        onConfirmBulkDelete={executeBulkAction}
        onCancelBulkDelete={() => setBulkDeleteConfirm(false)}
        onImport={handleImport}
      />
    );
}

interface AdminUsersWorkspaceProps {
  users: User[];
  stats: Stats | null;
  pagination: Pagination | null;
  search: string;
  roleFilter: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortBy: string;
  loading: boolean;
  loadError: string | null;
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
  lifecycleConfirm: User | null;
  bulkDeleteConfirm: boolean;
  getRoleStyle: (role: string) => { background: string; color: string };
  getRoleText: (role: string) => string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
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
  onLifecycleRequest: (user: User) => void;
  onRetry: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onCloseEdit: () => void;
  onEditFormChange: (value: { name: string; role: string }) => void;
  onSave: () => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onClosePasswordReset: () => void;
  onResetPassword: () => void;
  onConfirmLifecycle: () => void;
  onCancelLifecycle: () => void;
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
  statusFilter,
  sortBy,
  loading,
  loadError,
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
  lifecycleConfirm,
  bulkDeleteConfirm,
  getRoleStyle,
  getRoleText,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
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
  onLifecycleRequest,
  onRetry,
  onPrevPage,
  onNextPage,
  onCloseEdit,
  onEditFormChange,
  onSave,
  onPasswordChange,
  onToggleShowPassword,
  onClosePasswordReset,
  onResetPassword,
  onConfirmLifecycle,
  onCancelLifecycle,
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
    <div className="admin-users-workspace" aria-busy={loading}>
      <AdminPageHero
        eyebrow="User Directory"
        title="ดูแลบัญชีผู้ใช้ สิทธิ์ และการดำเนินการแบบกลุ่ม"
        description="ค้นหาและดูสถานะบัญชี ปรับบทบาท และปิดหรือเปิดใช้งานได้โดยไม่ลบประวัติการเรียน การชำระเงิน หรือใบรับรอง"
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
        meta="การปิดใช้งานจะตัดสิทธิ์เข้าสู่ระบบและยกเลิกเซสชันเดิม ข้อมูลที่เชื่อมกับบัญชียังคงอยู่และเปิดใช้งานใหม่ได้"
      />

      {stats && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปสถานะบัญชีผู้ใช้">
          <AdminMetricCard label="บัญชีทั้งหมด" value={stats.total} detail="ผู้ใช้ที่เก็บอยู่ในระบบ" tone="info" />
          <AdminMetricCard label="ใช้งาน" value={stats.active} detail="เข้าสู่ระบบและใช้บัญชีได้" tone="success" />
          <AdminMetricCard label="ปิดใช้งาน" value={stats.inactive} detail="ข้อมูลคงอยู่ แต่เข้าสู่ระบบไม่ได้" tone="warning" />
          <AdminMetricCard label="ผู้ดูแลระบบ" value={stats.admins} detail="บัญชีที่มีสิทธิ์ดูแลระบบ" tone="neutral" />
        </section>
      )}

      <AdminSurfaceCard>
        <AdminSectionHeading
          title="รายการบัญชีผู้ใช้"
          description="ค้นหา กรอง และจัดการบัญชีจากรายการเดียว พร้อมงานแบบกลุ่มและการนำเข้าหรือส่งออกข้อมูล"
        />

        <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <svg
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--muted-foreground)' }}
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
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              style={filterSelectStyle}
              aria-label="กรองตามสถานะบัญชี"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
            <select value={sortBy} onChange={(e) => onSortByChange(e.target.value)} style={filterSelectStyle}>
              <option value="createdAt">เรียงตามวันที่</option>
              <option value="name">เรียงตามชื่อ</option>
              <option value="email">เรียงตามอีเมล</option>
              <option value="enrollmentCount">เรียงตามคอร์สที่ลง</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '18px', background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <AdminPill tone="default">ทั้งหมด {pagination?.total ?? users.length} บัญชี</AdminPill>
              <AdminPill tone="success">ใช้งาน {stats?.active ?? 0}</AdminPill>
              <AdminPill tone="warning">ปิดใช้งาน {stats?.inactive ?? 0}</AdminPill>
            </div>
            {selectedUsers.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>เลือก {selectedUsers.length} รายการ</span>
                <select value={bulkAction} onChange={(e) => onBulkActionChange(e.target.value)} style={bulkSelectStyle}>
                  <option value="">เลือกการดำเนินการ</option>
                  <option value="updateRole">เปลี่ยน role</option>
                  <option value="deactivate">ปิดใช้งาน</option>
                  <option value="reactivate">เปิดใช้งาน</option>
                </select>
                {bulkAction === 'updateRole' && (
                  <select value={bulkRole} onChange={(e) => onBulkRoleChange(e.target.value)} style={bulkSelectStyle}>
                    <option value="student">นักเรียน</option>
                    <option value="instructor">ผู้สอน</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                <button className={`admin-users-bulk-submit${bulkAction === 'deactivate' ? ' is-destructive' : ''}`} onClick={onHandleBulkAction} disabled={processingBulk || !bulkAction}>
                  {processingBulk ? 'กำลังดำเนินการ...' : 'ดำเนินการ'}
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>เลือกผู้ใช้จากตารางเพื่อใช้ bulk actions</div>
            )}
          </div>
        </div>
        {importResult && (
          <div style={{ background: 'var(--color-success-soft)', border: '1px solid var(--color-success-soft)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-success-strong)', marginBottom: '8px' }}>Import result</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-success-strong)' }}>
              Success: {importResult.success} | Skipped: {importResult.skipped} | Failed: {importResult.failed}
            </div>
            {(importResult.errors?.length ?? 0) > 0 && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-error-strong)' }}>
                {importResult.errors?.slice(0, 5).map((err: string, i: number) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <button
              onClick={onClearImportResult}
              style={{ marginTop: '8px', padding: '4px 12px', background: 'transparent', color: 'var(--color-success-strong)', border: '1px solid var(--color-success-strong)', borderRadius: '999px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {loadError ? (
          <div className="admin-users-state admin-users-state--error" role="alert">
            <strong>โหลดรายชื่อผู้ใช้ไม่สำเร็จ</strong>
            <span>{loadError}</span>
            <AdminButton tone="default" onClick={onRetry}>ลองอีกครั้ง</AdminButton>
          </div>
        ) : null}
        {loading && users.length > 0 ? (
          <div className="admin-users-refreshing" role="status">กำลังอัปเดตรายชื่อ...</div>
        ) : null}

        {!loadError ? <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <caption className="admin-users-table-caption">
              รายชื่อผู้ใช้ บทบาท สถานะบัญชี จำนวนคอร์ส วันที่สมัคร และการจัดการ
            </caption>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...headerCellStyle, textAlign: 'center', width: '52px' }}>
                  <input aria-label="เลือกผู้ใช้ทั้งหมดในหน้านี้" type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} onChange={onToggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={headerCellStyle}>User</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Role</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>สถานะ</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Enrollments</th>
                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Joined</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.lifecycleStatus === 'inactive' ? 'is-inactive' : undefined} style={{ borderBottom: '1px solid var(--border)', background: selectedUsers.includes(user.id) ? 'var(--muted)' : 'transparent' }}>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <input aria-label={`เลือก ${user.name || user.email}`} type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => onToggleSelectUser(user.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={bodyCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-foreground)', fontWeight: 700, flexShrink: 0 }}>
                        {(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                      </div>
                      <Link href={`/admin/users/${user.id}`} className="block rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                        <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>{user.name || 'No name'}</div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--muted-foreground)' }}>{user.email}</div>
                      </Link>
                    </div>
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, ...getRoleStyle(user.role) }}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <AdminUserLifecycleBadge
                      status={user.lifecycleStatus}
                      detail={user.deactivatedAt ? `ตั้งแต่ ${formatDate(user.deactivatedAt)}` : undefined}
                    />
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center', color: 'var(--muted-foreground)' }}>{user.enrollmentCount} courses</td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.84rem' }}>{formatDate(user.createdAt)}</td>
                  <td style={{ ...bodyCellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button onClick={() => onHandleEdit(user)} style={actionButtonStyle('var(--secondary)', 'var(--primary)')}>Edit</button>
                      <button onClick={() => onOpenPasswordReset(user)} style={actionButtonStyle('var(--color-warning-soft)', 'var(--color-warning-strong)')}>Password</button>
                      <AdminUserLifecycleAction
                        status={user.lifecycleStatus}
                        pending={updating === user.id}
                        onRequest={() => onLifecycleRequest(user)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : null}

        {!loadError && users.length === 0 && !loading ? (
          <div className="admin-users-state" role="status">
            <strong>ไม่พบบัญชีที่ตรงกับตัวกรอง</strong>
            <span>ลองเปลี่ยนคำค้นหา บทบาท หรือสถานะบัญชี</span>
          </div>
        ) : null}

        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '18px', borderTop: '1px solid var(--border)' }}>
            <button onClick={onPrevPage} disabled={pagination.page === 1} style={paginationButtonStyle(pagination.page === 1)}>Previous</button>
            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.84rem' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <button onClick={onNextPage} disabled={pagination.page === pagination.totalPages} style={paginationButtonStyle(pagination.page === pagination.totalPages)}>Next</button>
          </div>
        )}
      </AdminSurfaceCard>

      {editingUser && (
        <div style={modalBackdropStyle}>
          <div style={modalPanelStyle(400)}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--foreground)' }}>Edit user</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={modalLabelStyle}>Name</label>
              <input type="text" value={editForm.name} onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })} style={modalInputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={modalLabelStyle}>Role</label>
              <select value={editForm.role} onChange={(e) => onEditFormChange({ ...editForm, role: e.target.value })} style={{ ...modalInputStyle, background: 'var(--card)' }}>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--foreground)' }}>Reset password</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
              {passwordResetUser.name || 'No name'} ({passwordResetUser.email})
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={modalLabelStyle}>New password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => onPasswordChange(e.target.value)} placeholder="At least 8 characters" style={{ ...modalInputStyle, paddingRight: '48px' }} />
                <button type="button" onClick={onToggleShowPassword} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--muted-foreground)', padding: '4px 8px' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && <p style={{ fontSize: '0.75rem', color: 'var(--color-error-strong)', marginTop: '6px' }}>Password must be at least 8 characters</p>}
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
        isOpen={!!lifecycleConfirm}
        title={lifecycleDeactivationDialog.title}
        message={`${lifecycleConfirm?.name || lifecycleConfirm?.email || 'บัญชีนี้'}: ${lifecycleDeactivationDialog.message}`}
        confirmText={updating === lifecycleConfirm?.id ? 'กำลังปิดใช้งาน...' : lifecycleDeactivationDialog.confirmText}
        confirmDisabled={updating === lifecycleConfirm?.id}
        onConfirm={onConfirmLifecycle}
        onCancel={onCancelLifecycle}
      />
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="ปิดใช้งานบัญชีที่เลือก"
        message={`บัญชี ${selectedUsers.length} รายการจะเข้าสู่ระบบไม่ได้และเซสชันเดิมจะสิ้นสุด แต่ข้อมูลที่เชื่อมกับบัญชียังคงอยู่`}
        confirmText={processingBulk ? 'กำลังปิดใช้งาน...' : 'ยืนยันปิดใช้งาน'}
        confirmDisabled={processingBulk}
        onConfirm={onConfirmBulkDelete}
        onCancel={onCancelBulkDelete}
      />

      <input type="file" onChange={onImport} accept=".csv" style={{ display: 'none' }} />
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  fontSize: '0.9rem',
  background: 'var(--muted)',
  color: 'var(--foreground)',
};

const filterSelectStyle: CSSProperties = {
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  background: 'var(--muted)',
  fontSize: '0.875rem',
  color: 'var(--foreground)',
};

const bulkSelectStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  background: 'var(--card)',
  fontSize: '0.875rem',
};

const headerCellStyle: CSSProperties = {
  padding: '15px 18px',
  textAlign: 'left',
  fontWeight: 700,
  color: 'var(--muted-foreground)',
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
  border: '1px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--card)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'color-mix(in oklch, var(--foreground) 48%, transparent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalPanelStyle = (maxWidth: number): CSSProperties => ({
  background: 'var(--card)',
  borderRadius: '18px',
  padding: '24px',
  width: '100%',
  maxWidth,
  margin: '16px',
});

const modalLabelStyle: CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '8px',
  color: 'var(--foreground)',
};

const modalInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  fontSize: '1rem',
};

const secondaryModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: 'var(--muted)',
  color: 'var(--muted-foreground)',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 700,
};

const primaryModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: 'var(--primary)',
  color: 'var(--primary-foreground)',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 700,
};

const warningModalButtonStyle: CSSProperties = {
  padding: '10px 20px',
  background: 'var(--color-warning-strong)',
  color: 'var(--primary-foreground)',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 700,
};
