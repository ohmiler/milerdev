'use client';

import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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

type StatusFilter = 'verifying' | 'failed' | 'pending';
type ActionIntent =
  | { type: 'single'; payment: PaymentRecord; action: 'approve' | 'reject' }
  | { type: 'bulk' }
  | null;

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
  const [daysBack, setDaysBack] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionIntent, setActionIntent] = useState<ActionIntent>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/reconciliation?status=${statusFilter}&days=${daysBack}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายการกระทบยอดได้');
      setPayments(data.payments || []);
      setSummary(data.summary || { verifying: 0, failed: 0, pending: 0 });
      setSelected(new Set());
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดรายการกระทบยอดได้');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, daysBack]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((previous) => previous.size === payments.length ? new Set() : new Set(payments.map((payment) => payment.id)));
  };

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
        description={`ย้อนหลัง ${daysBack.toLocaleString('th-TH')} วัน · เลือกอยู่ ${selected.size.toLocaleString('th-TH')} รายการ`}
        actions={statusFilter === 'verifying' && selected.size > 0 ? <Button variant="destructive" size="sm" onClick={() => openAction({ type: 'bulk' })}>ทำเครื่องหมายว่าล้มเหลว</Button> : undefined}
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => { if (value) setStatusFilter(value as StatusFilter); }}
            variant="outline"
            spacing={0}
            aria-label="กรองสถานะกระทบยอด"
            className="max-w-full overflow-x-auto"
          >
            {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
              <ToggleGroupItem key={status} value={status}>{statusLabels[status]} {summary[status].toLocaleString('th-TH')}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ย้อนหลัง</span>
            <NativeSelect value={String(daysBack)} onChange={(event) => setDaysBack(Number(event.target.value))} aria-label="ช่วงเวลาย้อนหลัง">
              {[7, 14, 30, 60, 90].map((days) => <NativeSelectOption key={days} value={days}>{days} วัน</NativeSelectOption>)}
            </NativeSelect>
          </div>
        </div>

        {message ? (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-5">
            {message.type === 'error' ? <XCircle aria-hidden /> : <CheckCircle2 aria-hidden />}
            <AlertTitle>{message.type === 'error' ? 'ดำเนินการไม่สำเร็จ' : 'ดำเนินการสำเร็จ'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchData()}>ลองใหม่</Button>} /> : null}

        {loading ? (
          <AdminLoadingState title="กำลังโหลดคิวกระทบยอด" />
        ) : payments.length === 0 ? (
          <AdminEmptyState icon={<ShieldAlert aria-hidden />} title={`ไม่พบรายการ${statusLabels[statusFilter]}`} description="ไม่มีรายการในช่วงเวลาที่เลือก ลองเปลี่ยนสถานะหรือช่วงเวลา" tone="success" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {statusFilter === 'verifying' ? (
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === payments.length && payments.length > 0} onCheckedChange={toggleSelectAll} aria-label="เลือกทุกรายการ" />
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
                  {statusFilter === 'verifying' ? <TableCell><Checkbox checked={selected.has(payment.id)} onCheckedChange={() => toggleSelect(payment.id)} aria-label={`เลือกธุรกรรม ${payment.id}`} /></TableCell> : null}
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
                          <Button size="sm" variant="outline" onClick={() => openAction({ type: 'single', payment, action: 'approve' })}>อนุมัติ</Button>
                          <Button size="sm" variant="destructive" onClick={() => openAction({ type: 'single', payment, action: 'reject' })}>ปฏิเสธ</Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intentTitle}</DialogTitle>
            <DialogDescription>ระบุเหตุผลและหลักฐานประกอบอย่างน้อย 5 ตัวอักษร ระบบจะเก็บไว้สำหรับตรวจสอบย้อนหลัง</DialogDescription>
          </DialogHeader>
          {actionIntent?.type === 'single' ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{actionIntent.payment.itemTitle || actionIntent.payment.courseTitle || actionIntent.payment.bundleTitle || 'ไม่ระบุรายการ'}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{actionIntent.payment.id}</div>
            </div>
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
            <Button variant={isDestructive ? 'destructive' : 'default'} disabled={actionLoading || reason.trim().length < 5} onClick={() => void handleAction()}>
              {actionLoading ? <AdminPendingLabel>กำลังดำเนินการ</AdminPendingLabel> : isDestructive ? 'ยืนยันการปฏิเสธ' : 'ยืนยันการอนุมัติ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
