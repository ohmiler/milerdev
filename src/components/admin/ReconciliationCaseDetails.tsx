'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export interface ReconciliationCase {
  payment: {
    id: string;
    status: string;
    method: string;
    amount: string;
    currency: string;
    itemTitle: string | null;
    itemType: 'course' | 'bundle' | null;
    createdAt: string | null;
    retryCount: number;
    lastRetryAt: string | null;
    transactionReference: string | null;
  };
  payer: { name: string | null; email: string | null } | null;
  entitlement:
    | { kind: 'course'; total: 1; enrolled: number }
    | { kind: 'bundle'; total: number; enrolled: number }
    | { kind: 'unknown' };
  history: Array<{
    id: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string | null;
    actorName: string | null;
  }>;
  decision: { canDecide: boolean; maxRetries: number };
}

export type ReconciliationCaseState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ReconciliationCase };

const statusLabels: Record<string, string> = {
  verifying: 'รอตรวจสอบ',
  failed: 'ล้มเหลว',
  pending: 'รอดำเนินการ',
  completed: 'สำเร็จ',
  refunded: 'คืนเงินแล้ว',
};

const actionLabels: Record<string, string> = {
  create: 'สร้าง',
  update: 'อัปเดต',
  delete: 'ลบ',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-';
}

function formatAmount(amount: string, currency: string) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: currency || 'THB' }).format(parseFloat(amount));
}

function entitlementText(entitlement: ReconciliationCase['entitlement']) {
  if (entitlement.kind === 'unknown') return 'ตรวจสิทธิ์เรียนไม่ได้ (ไม่พบผู้ซื้อหรือรายการที่ผูกกับการชำระเงิน)';
  if (entitlement.kind === 'course') {
    return entitlement.enrolled > 0 ? 'ลงทะเบียนเรียนคอร์สนี้แล้ว' : 'ยังไม่ได้ลงทะเบียนเรียนคอร์สนี้';
  }
  return `ลงทะเบียนแล้ว ${entitlement.enrolled.toLocaleString('th-TH')} จาก ${entitlement.total.toLocaleString('th-TH')} คอร์สใน Bundle`;
}

/**
 * Read-only facts shown at the decision point. Showing them grants nothing; the approve and
 * reject commands keep their own server-side checks.
 */
export function describeCaseBlock(caseState: ReconciliationCaseState, rowStatus: string): string | null {
  if (caseState.status === 'loading') return 'กำลังโหลดรายละเอียดรายการ';
  if (caseState.status === 'error') return 'โหลดรายละเอียดรายการไม่สำเร็จ';
  if (caseState.data.payment.status !== rowStatus) return 'สถานะรายการถูกเปลี่ยนแล้ว';
  if (!caseState.data.decision.canDecide) return 'รายการนี้ดำเนินการต่อไม่ได้';
  return null;
}

export default function ReconciliationCaseDetails({
  state,
  rowStatus,
  onRetry,
}: {
  state: ReconciliationCaseState;
  rowStatus: string;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-4 text-sm text-muted-foreground" role="status">
        <Spinner aria-hidden />
        กำลังโหลดรายละเอียดรายการ
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>โหลดรายละเอียดรายการไม่สำเร็จ</AlertTitle>
        <AlertDescription>
          {state.message} · ยังไม่ควรตัดสินใจจากข้อมูลที่ไม่ครบ
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>ลองใหม่</Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const { payment, payer, entitlement, history, decision } = state.data;
  const statusChanged = payment.status !== rowStatus;

  return (
    <div className="grid gap-3">
      {statusChanged ? (
        <Alert variant="destructive">
          <AlertTitle>สถานะรายการถูกเปลี่ยนแล้ว</AlertTitle>
          <AlertDescription>
            ตอนนี้รายการอยู่ในสถานะ “{statusLabels[payment.status] ?? payment.status}” อาจมีผู้ตรวจคนอื่นดำเนินการไปแล้ว ปิดหน้านี้แล้วรีเฟรชคิวก่อนตัดสินใจ
          </AlertDescription>
        </Alert>
      ) : !decision.canDecide ? (
        <Alert variant="destructive">
          <AlertTitle>รายการนี้ดำเนินการต่อไม่ได้</AlertTitle>
          <AlertDescription>
            {payment.retryCount >= decision.maxRetries
              ? `ปฏิเสธครบ ${decision.maxRetries.toLocaleString('th-TH')} ครั้งแล้ว`
              : 'สถานะหรือวิธีชำระเงินไม่อยู่ในเงื่อนไขที่กระทบยอดด้วยมือได้'}
          </AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid gap-2 rounded-lg border bg-muted/40 px-3 py-3 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-muted-foreground">ผู้ชำระ</dt>
        <dd>
          {payer ? (
            <>
              <span className="font-medium">{payer.name || '-'}</span>
              <span className="block text-xs text-muted-foreground">{payer.email || '-'}</span>
            </>
          ) : 'ไม่พบผู้ซื้อ (บัญชีอาจถูกลบ)'}
        </dd>
        <dt className="text-muted-foreground">รายการ</dt>
        <dd>
          <span className="font-medium">{payment.itemTitle || 'ไม่ระบุรายการ'}</span>
          <span className="block text-xs text-muted-foreground">
            {payment.itemType === 'bundle' ? 'Bundle' : payment.itemType === 'course' ? 'Course' : 'ไม่พบรายการที่ผูกอยู่'}
          </span>
          <span className="block font-mono text-xs text-muted-foreground">{payment.id}</span>
        </dd>
        <dt className="text-muted-foreground">ยอดเงิน</dt>
        <dd className="font-semibold tabular-nums">{formatAmount(payment.amount, payment.currency)}</dd>
        <dt className="text-muted-foreground">สถานะ</dt>
        <dd>{statusLabels[payment.status] ?? payment.status} · สร้างเมื่อ {formatDate(payment.createdAt)}</dd>
        <dt className="text-muted-foreground">ปฏิเสธไปแล้ว</dt>
        <dd className="tabular-nums">
          {payment.retryCount.toLocaleString('th-TH')}/{decision.maxRetries.toLocaleString('th-TH')} ครั้ง
          {payment.lastRetryAt ? ` · ล่าสุด ${formatDate(payment.lastRetryAt)}` : ''}
        </dd>
        <dt className="text-muted-foreground">เลขอ้างอิงธนาคาร</dt>
        <dd>
          {payment.transactionReference ? (
            <span className="font-mono text-xs">{payment.transactionReference}</span>
          ) : (
            'ไม่มี · ระบบไม่เก็บรูปสลิป เทียบยอดและเวลากับรายการเดินบัญชีก่อนอนุมัติ'
          )}
        </dd>
        <dt className="text-muted-foreground">สิทธิ์เรียน</dt>
        <dd>{entitlementText(entitlement)}</dd>
      </dl>

      <div>
        <h3 className="mb-1 text-sm font-medium">ประวัติการตรวจ</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีประวัติในระบบ (รายการเก่าอาจไม่มีบันทึก)</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-md border px-2 py-1">
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.createdAt)} · {entry.actorName || 'ไม่ทราบผู้ดำเนินการ'} · {actionLabels[entry.action] ?? entry.action}
                </span>
                {entry.newValue ? <span className="block break-words">{entry.newValue}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
