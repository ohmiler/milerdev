'use client';

import { Eye, EyeOff, FileDown, FileUp, KeyRound, Pencil, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
  AdminUserLifecycleAction,
  AdminUserLifecycleBadge,
} from '@/components/admin/AdminUserLifecycleControls';
import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
  type AdminTone,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/Toast';
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

type ImportResult = { success?: number; skipped?: number; failed?: number; errors?: string[] };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'student' });
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkRole, setBulkRole] = useState('student');
  const [processingBulk, setProcessingBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

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
        sortOrder: 'desc',
      });
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
      const nextUsers = (data.users || []) as User[];
      setUsers(nextUsers);
      setSelectedUsers((current) => current.filter((id) => nextUsers.some((user) => user.id === id)));
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter, statusFilter, sortBy, searchDebounce]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', role: user.role });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setUpdating(editingUser.id);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'บันทึกผู้ใช้ไม่สำเร็จ');
      await fetchUsers();
      setEditingUser(null);
      showToast('บันทึกผู้ใช้สำเร็จ', 'success');
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'บันทึกผู้ใช้ไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const executeLifecycleAction = async (user: User, action: AdminUserLifecycleActionName) => {
    setUpdating(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถเปลี่ยนสถานะบัญชีได้');
      setUsers((current) => applyAuthoritativeLifecycleState(current, (data.users || []) as AuthoritativeLifecycleUser[]) as User[]);
      showToast(lifecycleMutationFeedback(action, data.changedCount ?? 0, data.skippedCount ?? 0), 'success');
      await fetchUsers();
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setUpdating(null);
      if (action === 'deactivate') setLifecycleConfirm(null);
    }
  };

  const handleLifecycleRequest = (user: User) => {
    const { action } = getLifecyclePresentation(user.lifecycleStatus);
    if (action === 'deactivate') setLifecycleConfirm(user);
    else void executeLifecycleAction(user, action);
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser || newPassword.length < 8) return;
    setResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/users/${passwordResetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      showToast(`เปลี่ยนรหัสผ่านของ ${passwordResetUser.name || passwordResetUser.email} สำเร็จ`, 'success');
      setPasswordResetUser(null);
      setNewPassword('');
      setShowPassword(false);
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ role: roleFilter, status: statusFilter });
    window.open(`/api/admin/users/export?${params}`, '_blank');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/users/import', { method: 'POST', body: formData });
      const data = await response.json();
      setImportResult(data.results || data);
      if (!response.ok) throw new Error(data.error || 'นำเข้าผู้ใช้ไม่สำเร็จ');
      await fetchUsers();
      showToast('นำเข้าผู้ใช้สำเร็จ', 'success');
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'นำเข้าผู้ใช้ไม่สำเร็จ', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((previous) => previous.includes(userId) ? previous.filter((id) => id !== userId) : [...previous, userId]);
  };

  const toggleSelectAll = () => {
    setSelectedUsers((previous) => previous.length === users.length ? [] : users.map((user) => user.id));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      showToast('กรุณาเลือกผู้ใช้และการดำเนินการ', 'error');
      return;
    }
    if (bulkAction === 'delete' || bulkAction === 'deactivate') {
      setBulkConfirm(true);
      return;
    }
    await executeBulkAction();
  };

  const executeBulkAction = async () => {
    setProcessingBulk(true);
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedUsers,
          data: bulkAction === 'updateRole' ? { role: bulkRole } : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ดำเนินการแบบกลุ่มไม่สำเร็จ');
      if (bulkAction !== 'updateRole') {
        const lifecycleAction = bulkAction === 'reactivate' ? 'reactivate' : 'deactivate';
        setUsers((current) => applyAuthoritativeLifecycleState(current, (data.users || []) as AuthoritativeLifecycleUser[]) as User[]);
        showToast(lifecycleMutationFeedback(lifecycleAction, data.changedCount ?? 0, data.skippedCount ?? 0), 'success');
      } else {
        showToast(`เปลี่ยนบทบาทสำเร็จ ${data.changedCount ?? 0} บัญชี`, 'success');
      }
      setSelectedUsers([]);
      setBulkAction('');
      await fetchUsers();
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'ดำเนินการแบบกลุ่มไม่สำเร็จ', 'error');
    } finally {
      setProcessingBulk(false);
      setBulkConfirm(false);
    }
  };

  const formatDate = (dateString: string) => dateString
    ? new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';
  const roleText = (role: User['role']) => role === 'admin' ? 'ผู้ดูแล' : role === 'instructor' ? 'ผู้สอน' : 'ผู้เรียน';
  const roleTone = (role: User['role']): AdminTone => role === 'admin' ? 'danger' : role === 'instructor' ? 'warning' : 'success';

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6" aria-busy={loading}>
      <AdminPageHeader
        eyebrow="User directory"
        title="บัญชีผู้ใช้"
        description="ค้นหา ปรับบทบาท และปิดหรือเปิดใช้งานบัญชี โดยไม่ลบประวัติการเรียน การชำระเงิน หรือใบรับรอง"
        actions={
          <>
            <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" tabIndex={-1} />
            <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <FileUp data-icon="inline-start" aria-hidden />
              {importing ? 'กำลังนำเข้า' : 'นำเข้า CSV'}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <FileDown data-icon="inline-start" aria-hidden />
              ส่งออก CSV
            </Button>
          </>
        }
        meta={`เลือกอยู่ ${selectedUsers.length.toLocaleString('th-TH')} บัญชี`}
      />

      {stats ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปสถานะบัญชีผู้ใช้">
          <AdminMetricCard label="บัญชีทั้งหมด" value={stats.total.toLocaleString('th-TH')} detail="ผู้ใช้ที่อยู่ในระบบ" tone="info" />
          <AdminMetricCard label="ใช้งาน" value={stats.active.toLocaleString('th-TH')} detail="เข้าสู่ระบบได้" tone="success" />
          <AdminMetricCard label="ปิดใช้งาน" value={stats.inactive.toLocaleString('th-TH')} detail="ข้อมูลคงอยู่ แต่เข้าสู่ระบบไม่ได้" tone="warning" />
          <AdminMetricCard label="ผู้ดูแลระบบ" value={stats.admins.toLocaleString('th-TH')} detail="บัญชีที่มีสิทธิ์ระดับ admin" tone="danger" />
        </section>
      ) : null}

      <AdminSection title="ค้นหาและกรอง" description="ค้นหาจากชื่อหรืออีเมล แล้วกรองตามบทบาทและสถานะ">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_11rem_13rem]">
          <InputGroup>
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); setSelectedUsers([]); }} placeholder="ชื่อหรืออีเมล" aria-label="ค้นหาผู้ใช้" />
          </InputGroup>
          <NativeSelect className="w-full" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setCurrentPage(1); setSelectedUsers([]); }} aria-label="กรองตามบทบาท">
            <NativeSelectOption value="all">ทุกบทบาท</NativeSelectOption>
            <NativeSelectOption value="admin">ผู้ดูแล</NativeSelectOption>
            <NativeSelectOption value="instructor">ผู้สอน</NativeSelectOption>
            <NativeSelectOption value="student">ผู้เรียน</NativeSelectOption>
          </NativeSelect>
          <NativeSelect className="w-full" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setCurrentPage(1); setSelectedUsers([]); }} aria-label="กรองตามสถานะบัญชี">
            <NativeSelectOption value="all">ทุกสถานะ</NativeSelectOption>
            <NativeSelectOption value="active">ใช้งาน</NativeSelectOption>
            <NativeSelectOption value="inactive">ปิดใช้งาน</NativeSelectOption>
          </NativeSelect>
          <NativeSelect className="w-full" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="เรียงลำดับผู้ใช้">
            <NativeSelectOption value="createdAt">วันที่สมัคร</NativeSelectOption>
            <NativeSelectOption value="name">ชื่อ</NativeSelectOption>
            <NativeSelectOption value="email">อีเมล</NativeSelectOption>
            <NativeSelectOption value="enrollmentCount">จำนวนคอร์ส</NativeSelectOption>
          </NativeSelect>
        </div>
      </AdminSection>

      {importResult ? (
        <Alert className="border-[var(--color-success)]/25 bg-[var(--color-success-soft)]">
          <FileUp aria-hidden />
          <AlertTitle>ผลการนำเข้าผู้ใช้</AlertTitle>
          <AlertDescription>สำเร็จ {importResult.success || 0} · ข้าม {importResult.skipped || 0} · ล้มเหลว {importResult.failed || 0}</AlertDescription>
          <AlertAction><Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>ปิด</Button></AlertAction>
          {importResult.errors?.length ? <ul className="col-start-2 mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-destructive">{importResult.errors.slice(0, 5).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul> : null}
        </Alert>
      ) : null}

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchUsers()}>ลองใหม่</Button>} /> : null}

      <AdminSection
        title="รายชื่อบัญชีผู้ใช้"
        description={`${(pagination?.total ?? users.length).toLocaleString('th-TH')} บัญชี`}
        actions={selectedUsers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge tone="warning">เลือก {selectedUsers.length.toLocaleString('th-TH')}</AdminStatusBadge>
            <NativeSelect value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} aria-label="เลือกการดำเนินการแบบกลุ่ม">
              <NativeSelectOption value="">เลือกการดำเนินการ</NativeSelectOption>
              <NativeSelectOption value="updateRole">เปลี่ยนบทบาท</NativeSelectOption>
              <NativeSelectOption value="deactivate">ปิดใช้งาน</NativeSelectOption>
              <NativeSelectOption value="reactivate">เปิดใช้งาน</NativeSelectOption>
            </NativeSelect>
            {bulkAction === 'updateRole' ? (
              <NativeSelect value={bulkRole} onChange={(event) => setBulkRole(event.target.value)} aria-label="บทบาทใหม่">
                <NativeSelectOption value="student">ผู้เรียน</NativeSelectOption>
                <NativeSelectOption value="instructor">ผู้สอน</NativeSelectOption>
                <NativeSelectOption value="admin">ผู้ดูแล</NativeSelectOption>
              </NativeSelect>
            ) : null}
            <Button size="sm" variant={bulkAction === 'deactivate' ? 'destructive' : 'default'} disabled={processingBulk || !bulkAction} onClick={() => void handleBulkAction()}>
              {processingBulk ? <AdminPendingLabel>กำลังดำเนินการ</AdminPendingLabel> : 'ดำเนินการ'}
            </Button>
          </div>
        ) : undefined}
      >
        {loading && users.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดรายชื่อผู้ใช้" />
        ) : users.length === 0 && !loadError ? (
          <AdminEmptyState icon={<Users aria-hidden />} title="ไม่พบบัญชีที่ตรงกับตัวกรอง" description="ลองเปลี่ยนคำค้นหา บทบาท หรือสถานะบัญชี" />
        ) : !loadError ? (
          <>
            {loading ? <div className="mb-3 text-xs text-muted-foreground">กำลังอัปเดตรายชื่อ…</div> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedUsers.length === users.length && users.length > 0} onCheckedChange={toggleSelectAll} aria-label="เลือกผู้ใช้ทั้งหมดในหน้านี้" /></TableHead>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">คอร์ส</TableHead>
                  <TableHead>วันที่สมัคร</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={user.lifecycleStatus === 'inactive' ? 'opacity-65' : selectedUsers.includes(user.id) ? 'bg-muted/50' : undefined}>
                    <TableCell><Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => toggleSelectUser(user.id)} aria-label={`เลือก ${user.name || user.email}`} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}</div>
                        <Link href={`/admin/users/${user.id}`} className="min-w-0 hover:underline">
                          <div className="truncate font-semibold text-primary">{user.name || 'ไม่ระบุชื่อ'}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{user.email}</div>
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell><AdminStatusBadge tone={roleTone(user.role)}>{roleText(user.role)}</AdminStatusBadge></TableCell>
                    <TableCell><AdminUserLifecycleBadge status={user.lifecycleStatus} detail={user.deactivatedAt ? `ตั้งแต่ ${formatDate(user.deactivatedAt)}` : undefined} /></TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">{user.enrollmentCount.toLocaleString('th-TH')}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}><Pencil data-icon="inline-start" aria-hidden />แก้ไข</Button>
                        <Button variant="outline" size="sm" onClick={() => { setPasswordResetUser(user); setNewPassword(''); setShowPassword(false); }}><KeyRound data-icon="inline-start" aria-hidden />รหัสผ่าน</Button>
                        <AdminUserLifecycleAction status={user.lifecycleStatus} pending={updating === user.id} onRequest={() => handleLifecycleRequest(user)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                <div className="text-sm text-muted-foreground">หน้า {pagination.page.toLocaleString('th-TH')} จาก {pagination.totalPages.toLocaleString('th-TH')} · {pagination.total.toLocaleString('th-TH')} บัญชี</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => { setSelectedUsers([]); setCurrentPage((page) => Math.max(1, page - 1)); }}>ก่อนหน้า</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => { setSelectedUsers([]); setCurrentPage((page) => Math.min(pagination.totalPages, page + 1)); }}>ถัดไป</Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </AdminSection>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => { if (!open && !updating) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขบัญชีผู้ใช้</DialogTitle><DialogDescription>ปรับชื่อที่แสดงและบทบาทของบัญชี</DialogDescription></DialogHeader>
          <div className="grid gap-5">
            <Field><FieldLabel htmlFor="edit-user-name">ชื่อ</FieldLabel><Input id="edit-user-name" value={editForm.name} onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))} /></Field>
            <Field><FieldLabel htmlFor="edit-user-role">บทบาท</FieldLabel><NativeSelect id="edit-user-role" className="w-full" value={editForm.role} onChange={(event) => setEditForm((previous) => ({ ...previous, role: event.target.value }))}><NativeSelectOption value="student">ผู้เรียน</NativeSelectOption><NativeSelectOption value="instructor">ผู้สอน</NativeSelectOption><NativeSelectOption value="admin">ผู้ดูแล</NativeSelectOption></NativeSelect></Field>
          </div>
          <DialogFooter><Button variant="outline" disabled={Boolean(updating)} onClick={() => setEditingUser(null)}>ยกเลิก</Button><Button disabled={Boolean(updating)} onClick={() => void handleSave()}>{updating ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : 'บันทึก'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordResetUser)} onOpenChange={(open) => { if (!open && !resettingPassword) { setPasswordResetUser(null); setNewPassword(''); setShowPassword(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>ตั้งรหัสผ่านใหม่</DialogTitle><DialogDescription>{passwordResetUser ? `${passwordResetUser.name || 'ไม่ระบุชื่อ'} (${passwordResetUser.email})` : 'กำหนดรหัสผ่านใหม่ให้ผู้ใช้'}</DialogDescription></DialogHeader>
          <Field data-invalid={Boolean(newPassword && newPassword.length < 8)}>
            <FieldLabel htmlFor="new-password">รหัสผ่านใหม่</FieldLabel>
            <InputGroup><InputGroupInput id="new-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" /><InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</InputGroupButton></InputGroupAddon></InputGroup>
            <FieldDescription>อย่างน้อย 8 ตัวอักษร</FieldDescription>
            {newPassword && newPassword.length < 8 ? <FieldError>รหัสผ่านสั้นเกินไป</FieldError> : null}
          </Field>
          <DialogFooter><Button variant="outline" disabled={resettingPassword} onClick={() => setPasswordResetUser(null)}>ยกเลิก</Button><Button disabled={resettingPassword || newPassword.length < 8} onClick={() => void handleResetPassword()}>{resettingPassword ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : 'ตั้งรหัสผ่านใหม่'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(lifecycleConfirm)}
        title={lifecycleDeactivationDialog.title}
        description={lifecycleDeactivationDialog.message}
        target={lifecycleConfirm ? lifecycleConfirm.name || lifecycleConfirm.email : undefined}
        confirmLabel={lifecycleDeactivationDialog.confirmText}
        pending={Boolean(lifecycleConfirm && updating === lifecycleConfirm.id)}
        pendingLabel="กำลังปิดใช้งาน"
        onConfirm={() => { if (lifecycleConfirm) void executeLifecycleAction(lifecycleConfirm, 'deactivate'); }}
        onOpenChange={(open) => { if (!open) setLifecycleConfirm(null); }}
      />
      <AdminConfirmActionDialog
        open={bulkConfirm}
        title="ปิดใช้งานบัญชีที่เลือก"
        description="บัญชีที่เลือกจะเข้าสู่ระบบไม่ได้และเซสชันเดิมจะสิ้นสุด แต่ข้อมูลที่เชื่อมกับบัญชียังคงอยู่"
        target={`${selectedUsers.length.toLocaleString('th-TH')} บัญชี`}
        confirmLabel="ยืนยันปิดใช้งาน"
        pending={processingBulk}
        pendingLabel="กำลังปิดใช้งาน"
        onConfirm={() => void executeBulkAction()}
        onOpenChange={(open) => { if (!open) setBulkConfirm(false); }}
      />
    </div>
  );
}
