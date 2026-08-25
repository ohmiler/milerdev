'use client';

import { ExternalLink, RotateCcw, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminErrorState,
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
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface Certificate {
  id: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  userId: string;
  courseId: string;
  userEmail: string | null;
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCertificates = useCallback(async (searchValue: string, statusValue: string) => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set('search', searchValue.trim());
    if (statusValue !== 'all') params.set('status', statusValue);

    try {
      const response = await fetch(`/api/admin/certificates?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดใบรับรองได้');
      setCertificates(data.certificates || []);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดใบรับรองได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates('', statusFilter);
  }, [loadCertificates, statusFilter]);

  const refreshCertificates = () => loadCertificates(search, statusFilter);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError('');
    try {
      const response = await fetch(`/api/admin/certificates/${revokeTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', reason: revokeReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เพิกถอนใบรับรองไม่สำเร็จ');
      setRevokeTarget(null);
      setRevokeReason('');
      await refreshCertificates();
    } catch (caughtError) {
      setRevokeError(caughtError instanceof Error ? caughtError.message : 'เพิกถอนใบรับรองไม่สำเร็จ');
    } finally {
      setRevoking(false);
    }
  };

  const handleRestore = async (certificate: Certificate) => {
    setRestoringId(certificate.id);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/certificates/${certificate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'คืนสถานะใบรับรองไม่สำเร็จ');
      await refreshCertificates();
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'คืนสถานะใบรับรองไม่สำเร็จ');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/certificates/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'ลบใบรับรองไม่สำเร็จ');
      setDeleteTarget(null);
      await refreshCertificates();
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : 'ลบใบรับรองไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Credential operations"
        title="ใบรับรอง"
        description="ตรวจสอบใบรับรองที่ออกแล้ว คืนสถานะ หรือเพิกถอนพร้อมบันทึกเหตุผลอย่างชัดเจน"
        meta={`ผลลัพธ์ ${certificates.length.toLocaleString('th-TH')} ใบ`}
      />

      <AdminSection title="ค้นหาและกรอง" description="ค้นหาด้วยชื่อผู้รับ รหัสใบรับรอง หรือชื่อคอร์ส">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void refreshCertificates();
          }}
        >
          <InputGroup className="flex-1">
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ชื่อผู้รับ รหัสใบรับรอง หรือคอร์ส"
              aria-label="ค้นหาใบรับรอง"
            />
          </InputGroup>
          <NativeSelect className="w-full sm:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="กรองสถานะใบรับรอง">
            <NativeSelectOption value="all">ทุกสถานะ</NativeSelectOption>
            <NativeSelectOption value="active">ใช้งาน</NativeSelectOption>
            <NativeSelectOption value="revoked">เพิกถอน</NativeSelectOption>
          </NativeSelect>
          <Button type="submit">ค้นหา</Button>
        </form>
      </AdminSection>

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void refreshCertificates()}>ลองใหม่</Button>} /> : null}

      <AdminSection title="รายการใบรับรอง" description="การเพิกถอนยังเก็บประวัติไว้ ส่วนการลบเป็นการนำรายการออกถาวร">
        {loading ? (
          <AdminLoadingState title="กำลังโหลดใบรับรอง" />
        ) : certificates.length === 0 ? (
          <AdminEmptyState
            title="ไม่พบใบรับรอง"
            description="ใบรับรองจะออกอัตโนมัติเมื่อผู้เรียนผ่านเงื่อนไขจบคอร์ส หรือลองเปลี่ยนคำค้นหาและตัวกรอง"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสใบรับรอง</TableHead>
                <TableHead>ผู้รับ</TableHead>
                <TableHead>คอร์ส</TableHead>
                <TableHead>วันที่ออก</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableCell>
                    <a
                      href={`/certificate/${certificate.certificateCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono font-semibold text-primary hover:underline"
                    >
                      {certificate.certificateCode}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{certificate.recipientName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{certificate.userEmail || '-'}</div>
                  </TableCell>
                  <TableCell className="max-w-64 truncate">{certificate.courseTitle}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(certificate.issuedAt)}</TableCell>
                  <TableCell>
                    <AdminStatusBadge tone={certificate.revokedAt ? 'danger' : 'success'}>
                      {certificate.revokedAt ? 'เพิกถอน' : 'ใช้งาน'}
                    </AdminStatusBadge>
                    {certificate.revokedAt && certificate.revokedReason ? <div className="mt-1 max-w-48 text-xs text-muted-foreground">{certificate.revokedReason}</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {certificate.revokedAt ? (
                        <Button variant="outline" size="sm" disabled={restoringId === certificate.id} onClick={() => void handleRestore(certificate)}>
                          <RotateCcw data-icon="inline-start" aria-hidden />
                          {restoringId === certificate.id ? 'กำลังคืนสถานะ' : 'คืนสถานะ'}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => { setRevokeError(''); setRevokeTarget(certificate); }}>
                          <ShieldAlert data-icon="inline-start" aria-hidden />
                          เพิกถอน
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" onClick={() => { setDeleteError(''); setDeleteTarget(certificate); }} aria-label={`ลบใบรับรอง ${certificate.certificateCode}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminSection>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open && !revoking) {
            setRevokeTarget(null);
            setRevokeReason('');
            setRevokeError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิกถอนใบรับรอง</DialogTitle>
            <DialogDescription>ใบรับรองจะตรวจสอบไม่ผ่านจนกว่าจะคืนสถานะ แต่ประวัติยังคงอยู่</DialogDescription>
          </DialogHeader>
          {revokeTarget ? <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm font-medium">{revokeTarget.certificateCode}</div> : null}
          {revokeError ? <Alert variant="destructive"><AlertTitle>เพิกถอนไม่สำเร็จ</AlertTitle><AlertDescription>{revokeError}</AlertDescription></Alert> : null}
          <Field>
            <FieldLabel htmlFor="revoke-reason">เหตุผลในการเพิกถอน</FieldLabel>
            <Textarea id="revoke-reason" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} rows={4} placeholder="ระบุเหตุผลเพื่อให้ทีมตรวจสอบย้อนหลังได้" />
          </Field>
          <DialogFooter>
            <Button variant="outline" disabled={revoking} onClick={() => setRevokeTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={revoking} onClick={() => void handleRevoke()}>
              {revoking ? <AdminPendingLabel>กำลังเพิกถอน</AdminPendingLabel> : 'ยืนยันเพิกถอน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="ลบใบรับรองถาวร"
        description="รายการนี้จะถูกนำออกถาวร หากเพียงต้องการระงับการตรวจสอบควรใช้การเพิกถอนแทน"
        target={deleteTarget ? <span className="font-mono">{deleteTarget.certificateCode}</span> : null}
        confirmLabel="ลบใบรับรอง"
        pending={deleting}
        pendingLabel="กำลังลบ"
        error={deleteError || undefined}
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}
      />
    </div>
  );
}
