'use client';

import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import ReconciliationCaseDetails, {
  describeCaseBlock,
  type ReconciliationCase,
  type ReconciliationCaseState,
} from '@/components/admin/ReconciliationCaseDetails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface PaymentRecord {
  id: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  amount: string;
  currency: string;
  method: string;
  status: string;
  itemTitle: string | null;
  slipUrl: string | null;
  retryCount: number | null;
  lastRetryAt: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  bundleTitle: string | null;
}

interface Summary {
  verifying: number;
  failed: number;
  pending: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type StatusFilter = 'verifying' | 'failed' | 'pending';
type DaysFilter = number | 'all';
type ActionIntent =
  | { type: 'single'; payment: PaymentRecord; action: 'approve' | 'reject' }
  | { type: 'bulk' }
  | null;

// Must match the max length of paymentIds in the bulk reconciliation API schema.
const MAX_BULK_SELECTION = 50;
const DAY_OPTIONS: DaysFilter[] = [7, 14, 30, 60, 90, 'all'];

const statusLabels: Record<StatusFilter, string> = {
  verifying: 'รอตรวจสอบ',
  failed: 'ล้มเหลว',
  pending: 'รอดำเนินการ',
};

export default function ReconciliationPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ verifying: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('verifying');
  const [daysBack, setDaysBack] = useState<DaysFilter>(30);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // The API page size equals the bulk cap, so selecting all means selecting the whole page.
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: MAX_BULK_SELECTION, total: 0, totalPages: 1 });
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionIntent, setActionIntent] = useState<ActionIntent>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [caseState, setCaseState] = useState<ReconciliationCaseState>({ status: 'loading' });
  const [caseReload, setCaseReload] = useState(0);
  // Filter whose rows are currently in `payments`; lets a failed reload keep rows only for the same filter.
  const loadedKeyRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    const requestKey = `${statusFilter}:${daysBack}:${page}:${searchTerm}`;
    const params = new URLSearchParams({ status: statusFilter, days: String(daysBack), page: String(page) });
    if (searchTerm) params.set('q', searchTerm);
    setLoading(true);
    setLoadError('');
    setSelected(new Set());
    try {
      const response = await fetch(`/api/admin/reconciliation?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายการกระทบยอดได้');
      setPayments(data.payments || []);
      setSummary(data.summary || { verifying: 0, failed: 0, pending: 0 });
      setPagination(data.pagination || { page: 1, pageSize: MAX_BULK_SELECTION, total: (data.payments || []).length, totalPages: 1 });
      loadedKeyRef.current = requestKey;
    } catch (caughtError) {
      // Rows from a different filter must not stay on screen under the new filter's label.
      if (loadedKeyRef.current !== requestKey) setPayments([]);
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดรายการกระทบยอดได้');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, daysBack, page, searchTerm]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Resolving the last items of a page can leave it empty while earlier pages remain.
  useEffect(() => {
    if (!loading && !loadError && payments.length === 0 && pagination.total > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [loading, loadError, payments.length, pagination.total, pagination.totalPages, page]);

  // Load the facts a reviewer needs whenever a single-payment decision dialog opens.
  const caseTargetId = actionIntent?.type === 'single' ? actionIntent.payment.id : null;
  useEffect(() => {
    if (!caseTargetId) return;
    const controller = new AbortController();
    setCaseState({ status: 'loading' });
    (async () => {
      try {
        const response = await fetch(`/api/admin/reconciliation/${caseTargetId}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายละเอียดรายการได้');
        setCaseState({ status: 'ready', data: data as ReconciliationCase });
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        setCaseState({
          status: 'error',
          message: caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดรายละเอียดรายการได้',
        });
      }
    })();
    return () => controller.abort();
  }, [caseTargetId, caseReload]);

  const caseBlockReason = actionIntent?.type === 'single'
    ? describeCaseBlock(caseState, actionIntent.payment.status)
    : null;

  const changeStatus = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };
  const changeDays = (next: DaysFilter) => {
    setDaysBack(next);
    setPage(1);
  };
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };
  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  };

  const openAction = (intent: Exclude<ActionIntent, null>) => {
    setReason('');
    setActionError('');
    setActionIntent(intent);
  };

  const handleAction = async () => {
    if (!actionIntent) return;
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      setActionError('เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setMessage(null);
    try {
      const isBulk = actionIntent.type === 'bulk';
      const response = await fetch(isBulk ? '/api/admin/reconciliation' : `/api/admin/reconciliation/${actionIntent.payment.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isBulk
          ? { action: 'mark_failed', paymentIds: Array.from(selected), reason: normalizedReason }
          : { action: actionIntent.action, reason: normalizedReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
      setMessage({ type: 'success', text: data.message || 'ดำเนินการสำเร็จ' });
      setActionIntent(null);
      setReason('');
      setSelected(new Set());
      await fetchData();
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BULK_SELECTION) next.add(id);
      return next;
    });
  };

  const selectablePayments = payments.slice(0, MAX_BULK_SELECTION);
  const allSelectableSelected = selectablePayments.length > 0 && selectablePayments.every((payment) => selected.has(payment.id));
  const toggleSelectAll = () => {
    setSelected(allSelectableSelected ? new Set() : new Set(selectablePayments.map((payment) => payment.id)));
  };
  const selectionAtLimit = selected.size >= MAX_BULK_SELECTION;
  // After a failed refresh the rows on screen may be out of date, so mutations stay off until a reload succeeds.
  const showingStaleRows = Boolean(loadError) && payments.length > 0;

  const formatDate = (date: string | null) => date
    ? new Date(date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
    : '-';
  const formatAmount = (amount: string) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(parseFloat(amount));
  const statusTone = (status: string) => status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'verifying' ? 'warning' : 'info';

  const intentTitle = actionIntent?.type === 'bulk'
    ? `ทำเครื่องหมาย ${selected.size.toLocaleString('th-TH')} รายการว่าล้มเหลว`
    : actionIntent?.action === 'approve'
      ? 'อนุมัติรายการชำระเงิน'
      : 'ปฏิเสธรายการชำระเงิน';
  const isDestructive = actionIntent?.type === 'bulk' || actionIntent?.action === 'reject';

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Payment controls"
        title="กระทบยอดการชำระเงิน"
        description="จัดการรายการค้าง ตรวจสอบรายการผิดปกติ และบันทึกเหตุผลก่อนอนุมัติหรือปฏิเสธทุกครั้ง"
        actions={
          <Button variant="outline" disabled={loading} onClick={() => void fetchData()}>
            <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : undefined} aria-hidden />
            รีเฟรช
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="รอตรวจสอบ" value={summary.verifying.toLocaleString('th-TH')} tone="warning" detail="ควรตรวจหลักฐานและปิดงาน" />
        <AdminMetricCard label="ล้มเหลว" value={summary.failed.toLocaleString('th-TH')} tone="danger" detail="ตรวจสาเหตุและประวัติ retry" />
        <AdminMetricCard label="รอดำเนินการ" value={summary.pending.toLocaleString('th-TH')} tone="info" detail="รายการที่ยังไม่สิ้นสุด" />
      </div>

      <AdminSection
        title="คิวตรวจสอบ"
        description={`${daysBack === 'all' ? 'ทุกช่วงเวลา' : `ย้อนหลัง ${daysBack.toLocaleString('th-TH')} วัน`} · เลือกอยู่ ${selected.size.toLocaleString('th-TH')}/${MAX_BULK_SELECTION} รายการ`}
        actions={statusFilter === 'verifying' && selected.size > 0 && !showingStaleRows ? <Button variant="destructive" size="sm" onClick={() => openAction({ type: 'bulk' })}>ทำเครื่องหมายว่าล้มเหลว</Button> : undefined}
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => { if (value) changeStatus(value as StatusFilter); }}
            variant="outline"
            spacing={0}
            aria-label="กรองสถานะกระทบยอด"
            className="max-w-full overflow-x-auto"
          >
            {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
              <ToggleGroupItem key={status} value={status}>{statusLabels[status]} {summary[status].toLocaleString('th-TH')}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form className="flex items-center gap-2" role="search" onSubmit={submitSearch}>
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="ค้นหาเลขธุรกรรมหรืออีเมล"
                aria-label="ค้นหาเลขธุรกรรมหรืออีเมล"
                maxLength={100}
                className="w-56"
              />
              <Button type="submit" variant="outline" size="sm"><Search data-icon="inline-start" aria-hidden />ค้นหา</Button>
            </form>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ช่วงเวลา</span>
              <NativeSelect value={String(daysBack)} onChange={(event) => changeDays(event.target.value === 'all' ? 'all' : Number(event.target.value))} aria-label="ช่วงเวลา">
                {DAY_OPTIONS.map((days) => <NativeSelectOption key={days} value={String(days)}>{days === 'all' ? 'ทั้งหมด' : `ย้อนหลัง ${days} วัน`}</NativeSelectOption>)}
              </NativeSelect>
            </div>
          </div>
        </div>
        {searchTerm ? (
          <p className="mb-4 text-sm text-muted-foreground">
            ผลค้นหา &quot;{searchTerm}&quot; ·{' '}
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={clearSearch}>ล้างการค้นหา</Button>
          </p>
        ) : null}

        {message ? (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-5">
            {message.type === 'error' ? <XCircle aria-hidden /> : <CheckCircle2 aria-hidden />}
            <AlertTitle>{message.type === 'error' ? 'ดำเนินการไม่สำเร็จ' : 'ดำเนินการสำเร็จ'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {!loading && loadError ? (
          <AdminErrorState
            title={showingStaleRows ? 'รีเฟรชไม่สำเร็จ ข้อมูลด้านล่างอาจไม่เป็นปัจจุบัน' : undefined}
            description={showingStaleRows ? `${loadError} · อนุมัติและปฏิเสธถูกปิดไว้จนกว่าจะโหลดสำเร็จ` : loadError}
            action={<Button variant="outline" onClick={() => void fetchData()}>ลองใหม่</Button>}
          />
        ) : null}
        {loading ? (
          <AdminLoadingState title="กำลังโหลดคิวกระทบยอด" />
        ) : payments.length === 0 && loadError ? null : payments.length === 0 ? (
          <AdminEmptyState icon={<ShieldAlert aria-hidden />} title={`ไม่พบรายการ${statusLabels[statusFilter]}`} description={searchTerm ? 'ไม่มีรายการที่ตรงกับคำค้นในช่วงเวลาที่เลือก ลองล้างการค้นหาหรือเปลี่ยนช่วงเวลา' : 'ไม่มีรายการในช่วงเวลาที่เลือก ลองเปลี่ยนสถานะหรือช่วงเวลา'} tone="success" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {statusFilter === 'verifying' ? (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelectableSelected} onCheckedChange={toggleSelectAll} disabled={showingStaleRows} aria-label={payments.length > MAX_BULK_SELECTION ? `เลือก ${MAX_BULK_SELECTION} รายการแรก` : 'เลือกทุกรายการ'} />
                  </TableHead>
                ) : null}
                <TableHead>วันที่</TableHead>
                <TableHead>ผู้ชำระ</TableHead>
                <TableHead>รายการ</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-center">Retry</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  {statusFilter === 'verifying' ? <TableCell><Checkbox checked={selected.has(payment.id)} onCheckedChange={() => toggleSelect(payment.id)} disabled={showingStaleRows || (selectionAtLimit && !selected.has(payment.id))} aria-label={`เลือกธุรกรรม ${payment.id}`} /></TableCell> : null}
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{payment.userName || '-'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{payment.userEmail || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-64 truncate font-medium">{payment.itemTitle || payment.courseTitle || payment.bundleTitle || '-'}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{payment.bundleId ? 'Bundle' : 'Course'} · {payment.id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatAmount(payment.amount)}</TableCell>
                  <TableCell><AdminStatusBadge tone={statusTone(payment.status)}>{statusLabels[payment.status as StatusFilter] || payment.status}</AdminStatusBadge></TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">{payment.retryCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {payment.status === 'verifying' || payment.status === 'failed' ? (
                        <>
                          <Button size="sm" variant="outline" disabled={showingStaleRows} onClick={() => openAction({ type: 'single', payment, action: 'approve' })}>อนุมัติ</Button>
                          <Button size="sm" variant="destructive" disabled={showingStaleRows} onClick={() => openAction({ type: 'single', payment, action: 'reject' })}>ปฏิเสธ</Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && payments.length > 0 ? (
          <nav className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="เลื่อนหน้าคิวกระทบยอด">
            <p className="text-sm text-muted-foreground">
              แสดง {((pagination.page - 1) * pagination.pageSize + 1).toLocaleString('th-TH')}–{((pagination.page - 1) * pagination.pageSize + payments.length).toLocaleString('th-TH')} จาก {pagination.total.toLocaleString('th-TH')} รายการ (เรียงรายการที่รอนานที่สุดก่อน)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft data-icon="inline-start" aria-hidden />ก่อนหน้า
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">หน้า {pagination.page.toLocaleString('th-TH')}/{pagination.totalPages.toLocaleString('th-TH')}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                ถัดไป<ChevronRight data-icon="inline-end" aria-hidden />
              </Button>
            </div>
          </nav>
        ) : null}
      </AdminSection>

      <Dialog
        open={Boolean(actionIntent)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setActionIntent(null);
            setReason('');
            setActionError('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{intentTitle}</DialogTitle>
            <DialogDescription>ระบุเหตุผลและหลักฐานประกอบอย่างน้อย 5 ตัวอักษร ระบบจะเก็บไว้สำหรับตรวจสอบย้อนหลัง</DialogDescription>
          </DialogHeader>
          {actionIntent?.type === 'single' ? (
            <ReconciliationCaseDetails
              state={caseState}
              rowStatus={actionIntent.payment.status}
              onRetry={() => setCaseReload((previous) => previous + 1)}
            />
          ) : null}
          {actionError ? <Alert variant="destructive"><AlertTitle>ดำเนินการไม่สำเร็จ</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert> : null}
          <Field data-invalid={Boolean(reason && reason.trim().length < 5)}>
            <FieldLabel htmlFor="reconciliation-reason">เหตุผลและหลักฐาน</FieldLabel>
            <Textarea id="reconciliation-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="อธิบายสิ่งที่ตรวจสอบและเหตุผลของการตัดสินใจ" />
            <FieldDescription>อย่างน้อย 5 ตัวอักษร</FieldDescription>
            {reason && reason.trim().length < 5 ? <FieldError>กรุณาระบุรายละเอียดเพิ่มเติม</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button variant="outline" disabled={actionLoading} onClick={() => setActionIntent(null)}>ยกเลิก</Button>
            <Button variant={isDestructive ? 'destructive' : 'default'} disabled={actionLoading || reason.trim().length < 5 || Boolean(caseBlockReason)} onClick={() => void handleAction()}>
              {actionLoading ? <AdminPendingLabel>กำลังดำเนินการ</AdminPendingLabel> : isDestructive ? 'ยืนยันการปฏิเสธ' : 'ยืนยันการอนุมัติ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
