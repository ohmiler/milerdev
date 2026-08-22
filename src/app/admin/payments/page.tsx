'use client';

import { ExternalLink, Search, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/Toast';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'verifying';
  stripePaymentId: string | null;
  slipUrl: string | null;
  createdAt: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  bundleTitle: string | null;
  itemTitle: string | null;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
  totalRevenue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusIntent = { payment: Payment; newStatus: Payment['status'] } | null;

const statusText: Record<Payment['status'], string> = {
  pending: 'รอดำเนินการ',
  completed: 'สำเร็จ',
  failed: 'ล้มเหลว',
  refunded: 'คืนเงิน',
  verifying: 'กำลังตรวจสอบ',
};

const methodText: Record<Payment['method'], string> = {
  stripe: 'Stripe',
  promptpay: 'PromptPay',
  bank_transfer: 'โอนเงิน',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statusIntent, setStatusIntent] = useState<StatusIntent>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPayments = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
        method: methodFilter,
        ...(searchDebounce && { search: searchDebounce }),
      });
      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายการชำระเงินได้');
      setPayments(data.payments || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'ไม่สามารถโหลดรายการชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, currentPage, searchDebounce]);

  const openStatusDialog = (payment: Payment, newStatus: Payment['status']) => {
    if (newStatus === payment.status) return;
    setStatusReason('');
    setStatusError('');
    setStatusIntent({ payment, newStatus });
  };

  const handleStatusChange = async () => {
    if (!statusIntent) return;
    const reason = statusReason.trim();
    if (reason.length < 5) {
      setStatusError('เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร');
      return;
    }

    setUpdatingStatus(statusIntent.payment.id);
    setStatusError('');
    try {
      const response = await fetch(`/api/admin/payments/${statusIntent.payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusIntent.newStatus, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'เปลี่ยนสถานะไม่สำเร็จ');
      showToast(`เปลี่ยนสถานะเป็น “${statusText[statusIntent.newStatus]}” สำเร็จ`, 'success');
      setStatusIntent(null);
      setStatusReason('');
      await fetchPayments();
    } catch (caughtError) {
      setStatusError(caughtError instanceof Error ? caughtError.message : 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formatCurrency = (amount: string | number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(parseFloat(String(amount)));
  const statusTone = (status: Payment['status']): AdminTone => status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'pending' || status === 'verifying' ? 'warning' : 'info';

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <AdminPageHeader
        eyebrow="Payment operations"
        title="รายการชำระเงิน"
        description="ค้นหา ตรวจหลักฐาน และเปลี่ยนสถานะธุรกรรมพร้อมบันทึกเหตุผลสำหรับตรวจสอบย้อนหลัง"
        meta="การยืนยันรายการอาจส่งผลต่อสิทธิ์เข้าเรียน โปรดตรวจข้อมูลก่อนดำเนินการ"
      />

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="ธุรกรรมทั้งหมด" value={stats.total.toLocaleString('th-TH')} detail="รายการที่อยู่ในระบบ" />
          <AdminMetricCard label="สำเร็จแล้ว" value={stats.completed.toLocaleString('th-TH')} tone="success" detail="ปิดยอดและมอบสิทธิ์แล้ว" />
          <AdminMetricCard label="รอดำเนินการ" value={stats.pending.toLocaleString('th-TH')} tone="warning" detail="ควรติดตามเพื่อปิดงาน" />
          <AdminMetricCard label="รายได้รวม" value={formatCurrency(stats.totalRevenue)} tone="info" detail="จากธุรกรรมสำเร็จ" />
        </div>
      ) : null}

      <AdminSection title="ค้นหาและกรอง" description="ค้นหาจากชื่อ อีเมล ชื่อคอร์ส หรือชื่อ bundle">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="ชื่อ อีเมล คอร์ส หรือ bundle" className="pl-9" aria-label="ค้นหารายการชำระเงิน" />
          </div>
          <NativeSelect className="w-full" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} aria-label="กรองสถานะ">
            <NativeSelectOption value="all">ทุกสถานะ</NativeSelectOption>
            {(Object.keys(statusText) as Payment['status'][]).map((status) => <NativeSelectOption key={status} value={status}>{statusText[status]}</NativeSelectOption>)}
          </NativeSelect>
          <NativeSelect className="w-full" value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setCurrentPage(1); }} aria-label="กรองช่องทางชำระเงิน">
            <NativeSelectOption value="all">ทุกช่องทาง</NativeSelectOption>
            {(Object.keys(methodText) as Payment['method'][]).map((method) => <NativeSelectOption key={method} value={method}>{methodText[method]}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </AdminSection>

      {loadError ? <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void fetchPayments()}>ลองใหม่</Button>} /> : null}

      <AdminSection title="สมุดรายการชำระเงิน" description={`${(pagination?.total ?? payments.length).toLocaleString('th-TH')} รายการ`}>
        {loading && payments.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดรายการชำระเงิน" />
        ) : payments.length === 0 ? (
          <AdminEmptyState icon={<WalletCards aria-hidden />} title="ไม่พบรายการชำระเงิน" description="ลองเปลี่ยนคำค้นหา สถานะ หรือช่องทางชำระเงิน" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ชำระเงิน</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>ช่องทาง</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เวลา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.userId ? <Link href={`/admin/users/${payment.userId}`} className="font-semibold text-primary hover:underline">{payment.userName || 'ไม่ระบุชื่อ'}</Link> : <div className="font-semibold">{payment.userName || 'ไม่ระบุชื่อ'}</div>}
                      <div className="mt-1 text-xs text-muted-foreground">{payment.userEmail || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-72 truncate font-medium">{payment.bundleTitle || payment.courseTitle || payment.itemTitle || '-'}</div>
                      {payment.slipUrl ? payment.slipUrl.startsWith('http') ? (
                        <a href={payment.slipUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">ดูหลักฐาน <ExternalLink className="size-3" aria-hidden /></a>
                      ) : <div className="mt-1 max-w-72 truncate font-mono text-xs text-muted-foreground" title={payment.slipUrl}>Ref: {payment.slipUrl}</div> : null}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell><AdminStatusBadge>{methodText[payment.method]}</AdminStatusBadge></TableCell>
                    <TableCell>
                      <div className="flex min-w-44 items-center gap-2">
                        <AdminStatusBadge tone={statusTone(payment.status)}>{statusText[payment.status]}</AdminStatusBadge>
                        <NativeSelect
                          size="sm"
                          value={payment.status}
                          disabled={updatingStatus === payment.id}
                          onChange={(event) => openStatusDialog(payment, event.target.value as Payment['status'])}
                          aria-label={`เปลี่ยนสถานะธุรกรรม ${payment.id}`}
                        >
                          <NativeSelectOption value={payment.status}>เปลี่ยนสถานะ</NativeSelectOption>
                          {payment.status === 'completed' ? <NativeSelectOption value="refunded">คืนเงิน</NativeSelectOption> : null}
                          {payment.status !== 'completed' && payment.status !== 'refunded' && payment.method !== 'stripe' ? <NativeSelectOption value="completed">สำเร็จ</NativeSelectOption> : null}
                          {payment.status === 'pending' || payment.status === 'verifying' ? <NativeSelectOption value="failed">ล้มเหลว</NativeSelectOption> : null}
                        </NativeSelect>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs leading-5 text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
                  </TableRow>
                ))}
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

      <Dialog
        open={Boolean(statusIntent)}
        onOpenChange={(open) => {
          if (!open && !updatingStatus) {
            setStatusIntent(null);
            setStatusReason('');
            setStatusError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยนสถานะ</DialogTitle>
            <DialogDescription>
              {statusIntent ? `เปลี่ยนจาก “${statusText[statusIntent.payment.status]}” เป็น “${statusText[statusIntent.newStatus]}” พร้อมบันทึกเหตุผล` : 'ระบุเหตุผลการเปลี่ยนสถานะ'}
            </DialogDescription>
          </DialogHeader>
          {statusIntent ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{statusIntent.payment.bundleTitle || statusIntent.payment.courseTitle || statusIntent.payment.itemTitle || 'ไม่ระบุรายการ'}</div>
              <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground"><span className="font-mono">{statusIntent.payment.id}</span><span>{formatCurrency(statusIntent.payment.amount)}</span></div>
            </div>
          ) : null}
          {statusError ? <Alert variant="destructive"><AlertTitle>เปลี่ยนสถานะไม่สำเร็จ</AlertTitle><AlertDescription>{statusError}</AlertDescription></Alert> : null}
          <Field data-invalid={Boolean(statusReason && statusReason.trim().length < 5)}>
            <FieldLabel htmlFor="payment-status-reason">เหตุผล</FieldLabel>
            <Textarea id="payment-status-reason" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} rows={4} placeholder="ระบุสิ่งที่ตรวจสอบและเหตุผลของการเปลี่ยนสถานะ" />
            <FieldDescription>อย่างน้อย 5 ตัวอักษร</FieldDescription>
            {statusReason && statusReason.trim().length < 5 ? <FieldError>กรุณาระบุรายละเอียดเพิ่มเติม</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(updatingStatus)} onClick={() => setStatusIntent(null)}>ยกเลิก</Button>
            <Button variant={statusIntent?.newStatus === 'failed' || statusIntent?.newStatus === 'refunded' ? 'destructive' : 'default'} disabled={Boolean(updatingStatus) || statusReason.trim().length < 5} onClick={() => void handleStatusChange()}>
              {updatingStatus ? <AdminPendingLabel>กำลังเปลี่ยนสถานะ</AdminPendingLabel> : 'ยืนยันการเปลี่ยนสถานะ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
