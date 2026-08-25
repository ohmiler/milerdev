'use client';

import { CircleCheck, FileUp, GraduationCap, Plus, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/Toast';

interface Enrollment {
  id: string;
  userId: string | null;
  courseId: string | null;
  enrolledAt: string;
  progressPercent: number | null;
  completedAt: string | null;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  coursePrice: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ImportResult = {
  success?: number;
  skipped?: number;
  userNotFound?: number;
  courseNotFound?: number;
  total?: number;
  errors?: string[];
  missingUsers?: string[];
  missingCourses?: string[];
  matchedAliases?: string[];
};

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '', courseId: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchEnrollments = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        courseId: courseFilter,
        ...(searchDebounce && { search: searchDebounce }),
      });
      const response = await fetch(`/api/admin/enrollments?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดการลงทะเบียนได้');
      setEnrollments(data.enrollments || []);
      setCourses(data.courses || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดการลงทะเบียนได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดผู้ใช้ได้');
      setUsers(data.users || []);
    } catch (caughtError) {
      setAddError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดผู้ใช้ได้');
    }
  };

  useEffect(() => {
    void fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter, currentPage, searchDebounce]);

  useEffect(() => {
    if (showAddModal && users.length === 0) void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal]);

  const confirmDeleteEnrollment = async () => {
    if (!deleteTarget) return;
    const enrollmentId = deleteTarget.id;
    setUpdating(enrollmentId);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ลบการลงทะเบียนไม่สำเร็จ');
      setDeleteTarget(null);
      await fetchEnrollments();
      showToast('ลบการลงทะเบียนสำเร็จ', 'success');
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : 'ลบการลงทะเบียนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUpdating(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.userId || !addForm.courseId) {
      setAddError('กรุณาเลือกผู้ใช้และคอร์ส');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เพิ่มการลงทะเบียนไม่สำเร็จ');
      await fetchEnrollments();
      setShowAddModal(false);
      setAddForm({ userId: '', courseId: '' });
      showToast('เพิ่มการลงทะเบียนสำเร็จ', 'success');
    } catch (caughtError) {
      setAddError(caughtError instanceof Error ? caughtError.message : 'เพิ่มการลงทะเบียนไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setAdding(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/enrollments/import', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'นำเข้าข้อมูลไม่สำเร็จ');
      setImportResult(data.results);
      await fetchEnrollments();
      showToast(`นำเข้าสำเร็จ ${data.results?.success || 0} รายการ`, 'success');
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'นำเข้าข้อมูลไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Learning operations"
        title="การลงทะเบียน"
        description="ตรวจสิทธิ์เข้าเรียน ความคืบหน้า และจัดการการเพิ่มหรือถอนผู้เรียนจากคอร์ส"
        actions={
          <>
            <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" tabIndex={-1} />
            <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <FileUp data-icon="inline-start" aria-hidden />
              {importing ? 'กำลังนำเข้า' : 'นำเข้า CSV'}
            </Button>
            <Button onClick={() => { setAddError(''); setShowAddModal(true); }}>
              <Plus data-icon="inline-start" aria-hidden />
              เพิ่มการลงทะเบียน
            </Button>
          </>
        }
        meta="การเพิ่มสิทธิ์จากหน้านี้เป็นการกระทำโดยผู้ดูแลโดยตรง"
      />

      {importResult ? (
        <Alert className={importResult.success ? 'border-[var(--color-success)]/25 bg-[var(--color-success-soft)]' : 'border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)]'}>
          <CircleCheck aria-hidden />
          <AlertTitle>ผลการนำเข้าข้อมูล</AlertTitle>
          <AlertDescription>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              <span>ทั้งหมด {importResult.total || 0}</span>
              <span>สำเร็จ {importResult.success || 0}</span>
              <span>ข้าม {importResult.skipped || 0}</span>
              <span>ไม่พบผู้ใช้ {importResult.userNotFound || 0}</span>
              <span>ไม่พบคอร์ส {importResult.courseNotFound || 0}</span>
            </div>
            {importResult.matchedAliases?.length ? <ImportDetails title="ชื่อคอร์สที่จับคู่ใกล้เคียง" items={importResult.matchedAliases} /> : null}
            {importResult.missingCourses?.length ? <ImportDetails title="คอร์สที่ไม่พบ" items={importResult.missingCourses} /> : null}
            {importResult.missingUsers?.length ? <ImportDetails title="ผู้ใช้ที่ไม่พบ" items={importResult.missingUsers} /> : null}
            {importResult.errors?.length ? <ImportDetails title="ข้อผิดพลาด" items={importResult.errors} /> : null}
          </AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="icon-sm" onClick={() => setImportResult(null)} aria-label="ปิดผลการนำเข้า"><X aria-hidden /></Button>
          </AlertAction>
        </Alert>
      ) : null}

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="ทั้งหมด" value={stats.total.toLocaleString('th-TH')} detail="สิทธิ์เข้าเรียนทุกสถานะ" />
          <AdminMetricCard label="เรียนจบแล้ว" value={stats.completed.toLocaleString('th-TH')} tone="success" detail="ผ่านเงื่อนไขจบคอร์ส" />
          <AdminMetricCard label="กำลังเรียน" value={stats.inProgress.toLocaleString('th-TH')} tone="info" detail="มีความคืบหน้ามากกว่า 0%" />
          <AdminMetricCard label="ยังไม่เริ่ม" value={stats.notStarted.toLocaleString('th-TH')} tone="neutral" detail="ยังไม่มีความคืบหน้า" />
        </div>
      ) : null}

      <AdminSection title="ค้นหาและกรอง" description="ค้นหาจากชื่อ อีเมล หรือชื่อคอร์ส">
        <div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup className="flex-1">
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
              placeholder="ชื่อ อีเมล หรือคอร์ส"
              aria-label="ค้นหาการลงทะเบียน"
            />
          </InputGroup>
          <NativeSelect className="w-full sm:w-64" value={courseFilter} onChange={(event) => { setCourseFilter(event.target.value); setCurrentPage(1); }} aria-label="กรองตามคอร์ส">
            <NativeSelectOption value="all">คอร์สทั้งหมด</NativeSelectOption>
            {courses.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </AdminSection>

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchEnrollments()}>ลองใหม่</Button>} /> : null}

      <AdminSection title="รายการสิทธิ์เข้าเรียน" description={pagination ? `${pagination.total.toLocaleString('th-TH')} รายการ` : undefined}>
        {loading && enrollments.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดการลงทะเบียน" />
        ) : enrollments.length === 0 ? (
          <AdminEmptyState icon={<GraduationCap aria-hidden />} title="ไม่พบการลงทะเบียน" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มสิทธิ์เข้าเรียนใหม่" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>คอร์ส</TableHead>
                  <TableHead>ความคืบหน้า</TableHead>
                  <TableHead>วันที่ลงทะเบียน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const progress = enrollment.progressPercent || 0;
                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        {enrollment.userId ? <Link href={`/admin/users/${enrollment.userId}`} className="font-medium text-primary hover:underline">{enrollment.userName || 'ไม่ระบุชื่อ'}</Link> : <div className="font-medium">{enrollment.userName || 'ไม่ระบุชื่อ'}</div>}
                        <div className="mt-1 text-xs text-muted-foreground">{enrollment.userEmail || '-'}</div>
                      </TableCell>
                      <TableCell className="max-w-64 truncate">{enrollment.courseTitle || '-'}</TableCell>
                      <TableCell>
                        <div className="flex min-w-32 items-center gap-3">
                          <Progress value={progress} className="w-24" aria-label={`ความคืบหน้า ${progress}%`} />
                          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(enrollment.enrolledAt)}</TableCell>
                      <TableCell>
                        <AdminStatusBadge tone={enrollment.completedAt ? 'success' : progress > 0 ? 'info' : 'neutral'}>
                          {enrollment.completedAt ? 'เรียนจบ' : progress > 0 ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                        </AdminStatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon-sm" disabled={updating === enrollment.id} onClick={() => { setDeleteError(''); setDeleteTarget(enrollment); }} aria-label={`ถอน ${enrollment.userName || enrollment.userEmail || 'ผู้ใช้'} ออกจากคอร์ส`}>
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                <div className="text-sm text-muted-foreground">หน้า {currentPage.toLocaleString('th-TH')} จาก {pagination.totalPages.toLocaleString('th-TH')}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>ก่อนหน้า</Button>
                  <Button variant="outline" size="sm" disabled={currentPage === pagination.totalPages} onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}>ถัดไป</Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </AdminSection>

      <Dialog open={showAddModal} onOpenChange={(open) => { if (!adding) { setShowAddModal(open); if (!open) setAddForm({ userId: '', courseId: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มการลงทะเบียนใหม่</DialogTitle>
            <DialogDescription>มอบสิทธิ์เข้าเรียนโดยผู้ดูแล การดำเนินการนี้ไม่ผ่านขั้นตอนชำระเงิน</DialogDescription>
          </DialogHeader>
          {addError ? <Alert variant="destructive"><AlertTitle>เพิ่มสิทธิ์ไม่สำเร็จ</AlertTitle><AlertDescription>{addError}</AlertDescription></Alert> : null}
          <div className="grid gap-5">
            <Field>
              <FieldLabel htmlFor="enrollment-user">ผู้ใช้</FieldLabel>
              <NativeSelect id="enrollment-user" className="w-full" value={addForm.userId} onChange={(event) => setAddForm((previous) => ({ ...previous, userId: event.target.value }))}>
                <NativeSelectOption value="">เลือกผู้ใช้</NativeSelectOption>
                {users.map((user) => <NativeSelectOption key={user.id} value={user.id}>{user.name || user.email} ({user.email})</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="enrollment-course">คอร์ส</FieldLabel>
              <NativeSelect id="enrollment-course" className="w-full" value={addForm.courseId} onChange={(event) => setAddForm((previous) => ({ ...previous, courseId: event.target.value }))}>
                <NativeSelectOption value="">เลือกคอร์ส</NativeSelectOption>
                {courses.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={adding} onClick={() => setShowAddModal(false)}>ยกเลิก</Button>
            <Button disabled={adding || !addForm.userId || !addForm.courseId} onClick={() => void handleAdd()}>
              {adding ? <AdminPendingLabel>กำลังเพิ่ม</AdminPendingLabel> : 'เพิ่มการลงทะเบียน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="ถอนสิทธิ์การลงทะเบียน"
        description="ผู้เรียนจะเสียสิทธิ์เข้าคอร์สและข้อมูลความคืบหน้าที่ผูกกับการลงทะเบียนนี้อาจถูกลบ"
        target={deleteTarget ? <span>{deleteTarget.userName || deleteTarget.userEmail || 'ผู้ใช้'} · {deleteTarget.courseTitle || 'ไม่ระบุคอร์ส'}</span> : null}
        confirmLabel="ถอนสิทธิ์"
        pending={Boolean(deleteTarget && updating === deleteTarget.id)}
        pendingLabel="กำลังถอนสิทธิ์"
        error={deleteError || undefined}
        onConfirm={() => void confirmDeleteEnrollment()}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}
      />
    </div>
  );
}

function ImportDetails({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-medium">{title} ({items.length.toLocaleString('th-TH')})</summary>
      <ul className="mt-2 flex max-h-28 list-disc flex-col gap-1 overflow-y-auto pl-5 text-xs">
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </details>
  );
}
