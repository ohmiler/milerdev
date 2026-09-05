import 'server-only';

import { PROMPTPAY_INTENT_TTL_MS } from '@/lib/promptpay-intent';

export type PaymentTarget = {
  type: 'course' | 'bundle';
  id: string;
  title: string;
  href: string;
};

export type ServerPaymentAttempt = {
  id: string;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  itemTitle: string | null;
  amount: string;
  currency: string;
  method: 'stripe' | 'promptpay' | 'bank_transfer';
  status: 'pending' | 'verifying' | 'completed' | 'failed' | 'refunded';
  createdAt: Date | null;
};

export type PaymentPresentationSource =
  | {
      kind: 'exact-attempt';
      ownerId: string;
      expectedAttemptId: string;
      target: PaymentTarget;
      attempt: ServerPaymentAttempt | null;
      access: { enrolledCount: number; totalCount: number };
    }
  | {
      kind: 'cancelled-return';
      target: PaymentTarget;
      access: { enrolledCount: number; totalCount: number };
    };

type PaymentState =
  | 'pending'
  | 'verifying'
  | 'completed-ready'
  | 'completed-access-pending'
  | 'failed'
  | 'refunded'
  | 'unconfirmed'
  | 'cancelled-return';

type RecoveryKind =
  | 'restart'
  | 'refresh'
  | 'contact'
  | 'view-product'
  | 'view-history'
  | 'continue-learning';

export type PaymentPresentation = {
  target: Omit<PaymentTarget, 'title'> & { title: string | null };
  quote: {
    amountDue: string;
    amountFormatted: string;
    currency: 'THB';
  } | null;
  attempt: {
    id: string;
    method: ServerPaymentAttempt['method'];
    rawStatus: ServerPaymentAttempt['status'];
    createdAt: string | null;
    expiresAt: string | null;
  } | null;
  payment: {
    state: PaymentState;
    isConfirmed: boolean;
    label: string;
    heading: string;
    description: string;
    preventDuplicatePayment: boolean;
  };
  access: {
    state: 'none' | 'partial' | 'ready';
    enrolledCount: number;
    totalCount: number;
  };
  recovery: {
    kind: RecoveryKind;
    label: string;
    href: string;
  };
};

const PAYMENT_METHODS: ReadonlyArray<ServerPaymentAttempt['method']> = [
  'stripe',
  'promptpay',
  'bank_transfer',
];
const PAYMENT_STATUSES: ReadonlyArray<ServerPaymentAttempt['status']> = [
  'pending',
  'verifying',
  'completed',
  'failed',
  'refunded',
];
const thbFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isExactTarget(attempt: ServerPaymentAttempt, target: PaymentTarget) {
  if (target.type === 'course') {
    return attempt.courseId === target.id && attempt.bundleId === null;
  }
  return attempt.bundleId === target.id && attempt.courseId === null;
}

function normalizeAmount(amount: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return null;

  const normalized = `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`;
  if (BigInt(match[1]) === BigInt(0) && BigInt(match[2] ?? '0') === BigInt(0)) {
    return null;
  }
  return normalized;
}

function deriveAccess(access: PaymentPresentationSource['access']) {
  if (
    !Number.isInteger(access.enrolledCount)
    || !Number.isInteger(access.totalCount)
    || access.enrolledCount < 0
    || access.totalCount < 1
    || access.enrolledCount > access.totalCount
  ) {
    throw new TypeError('Payment presentation requires valid access counts');
  }

  return {
    state: access.enrolledCount === 0
      ? 'none'
      : access.enrolledCount === access.totalCount
        ? 'ready'
        : 'partial',
    ...access,
  } as const;
}

function unconfirmedPresentation(
  source: PaymentPresentationSource,
  access: PaymentPresentation['access'],
): PaymentPresentation {
  return {
    target: source.target,
    quote: null,
    attempt: null,
    payment: {
      state: 'unconfirmed',
      isConfirmed: false,
      label: 'ยังยืนยันรายการนี้ไม่ได้',
      heading: 'ยังยืนยันรายการนี้ไม่ได้',
      description: 'ระบบยังยืนยันรายการชำระเงินนี้ไม่ได้ จึงยังไม่แสดงว่าได้รับเงินหรือเพิ่มสิทธิ์เรียนแล้ว',
      preventDuplicatePayment: true,
    },
    access,
    recovery: {
      kind: 'view-history',
      label: 'ดูประวัติการชำระเงิน',
      href: '/dashboard/payments',
    },
  };
}

function promptPayExpiry(attempt: ServerPaymentAttempt) {
  if (attempt.method !== 'promptpay' || !attempt.createdAt) return null;
  const createdAt = attempt.createdAt.getTime();
  if (!Number.isFinite(createdAt)) return null;
  return new Date(createdAt + PROMPTPAY_INTENT_TTL_MS);
}

function describePayment(
  attempt: ServerPaymentAttempt,
  access: PaymentPresentation['access'],
  targetHref: string,
  now: Date,
): Pick<PaymentPresentation, 'payment' | 'recovery'> {
  if (attempt.status === 'pending') {
    if (attempt.method === 'promptpay') {
      const expiresAt = promptPayExpiry(attempt);
      const isExpired = expiresAt === null || expiresAt.getTime() <= now.getTime();
      if (isExpired) {
        return {
          payment: {
            state: 'pending',
            isConfirmed: false,
            label: 'รายการหมดเวลา',
            heading: 'รายการพร้อมเพย์หมดเวลาแล้ว',
            description: 'ยังไม่มีการยืนยันการชำระเงินจากรายการนี้ หากโอนเงินแล้วอย่าชำระซ้ำและติดต่อพร้อมเลขอ้างอิง',
            preventDuplicatePayment: false,
          },
          recovery: { kind: 'restart', label: 'เริ่มรายการใหม่', href: targetHref },
        };
      }
      return {
        payment: {
          state: 'pending',
          isConfirmed: false,
          label: 'รอแนบสลิป',
          heading: 'รายการนี้ยังรอหลักฐานการชำระเงิน',
          description: 'หากโอนเงินแล้วอย่าชำระซ้ำ กรุณาแนบสลิปในรายการเดิมหรือติดต่อพร้อมเลขอ้างอิง',
          preventDuplicatePayment: true,
        },
        recovery: {
          kind: 'contact',
          label: 'ติดต่อพร้อมเลขอ้างอิง',
          href: 'mailto:milerdev.official@gmail.com',
        },
      };
    }

    if (attempt.method === 'bank_transfer') {
      return {
        payment: {
          state: 'pending',
          isConfirmed: false,
          label: 'รอตรวจสอบการโอนเงิน',
          heading: 'ยังไม่มีการยืนยันการชำระเงิน',
          description: 'หากโอนเงินแล้วอย่าชำระซ้ำ กรุณาติดต่อพร้อมเลขอ้างอิงเพื่อตรวจสอบรายการ',
          preventDuplicatePayment: true,
        },
        recovery: {
          kind: 'contact',
          label: 'ติดต่อพร้อมเลขอ้างอิง',
          href: 'mailto:milerdev.official@gmail.com',
        },
      };
    }

    return {
      payment: {
        state: 'pending',
        isConfirmed: false,
        label: 'ยังชำระไม่เสร็จ',
        heading: 'ยังไม่มีการยืนยันการชำระเงิน',
        description: 'รายการนี้ยังชำระไม่เสร็จ และยังไม่ได้เพิ่มสิทธิ์เรียน',
        preventDuplicatePayment: false,
      },
      recovery: { kind: 'restart', label: 'กลับไปเลือกวิธีชำระเงิน', href: targetHref },
    };
  }

  if (attempt.status === 'verifying') {
    return {
      payment: {
        state: 'verifying',
        isConfirmed: false,
        label: 'กำลังตรวจสอบสลิป',
        heading: 'กำลังตรวจสอบการชำระเงิน',
        description: 'ระบบรับรายการไว้ตรวจสอบแล้ว อย่าชำระหรือส่งหลักฐานซ้ำ',
        preventDuplicatePayment: true,
      },
      recovery: { kind: 'refresh', label: 'ตรวจสถานะอีกครั้ง', href: '/dashboard/payments' },
    };
  }

  if (attempt.status === 'completed') {
    if (access.state === 'ready') {
      return {
        payment: {
          state: 'completed-ready',
          isConfirmed: true,
          label: 'ชำระแล้ว · พร้อมเรียน',
          heading: 'ชำระแล้ว พร้อมเริ่มเรียน',
          description: 'การชำระเงินได้รับการยืนยันและสิทธิ์เรียนพร้อมแล้ว',
          preventDuplicatePayment: true,
        },
        recovery: { kind: 'continue-learning', label: 'ไปการเรียนของฉัน', href: '/dashboard' },
      };
    }
    return {
      payment: {
        state: 'completed-access-pending',
        isConfirmed: true,
        label: 'ชำระแล้ว · กำลังเปิดสิทธิ์',
        heading: 'ชำระแล้ว กำลังเปิดสิทธิ์',
        description: 'การชำระเงินได้รับการยืนยันแล้ว แต่สิทธิ์เรียนยังไม่ครบ อย่าชำระซ้ำ',
        preventDuplicatePayment: true,
      },
      recovery: { kind: 'refresh', label: 'ตรวจสิทธิ์อีกครั้ง', href: '/dashboard/payments' },
    };
  }

  if (attempt.status === 'failed') {
    return {
      payment: {
        state: 'failed',
        isConfirmed: false,
        label: 'ชำระเงินไม่สำเร็จ',
        heading: 'รายการนี้ไม่สำเร็จ',
        description: 'ยังไม่มีการยืนยันการชำระเงินและยังไม่ได้เพิ่มสิทธิ์เรียนจากรายการนี้',
        preventDuplicatePayment: false,
      },
      recovery: { kind: 'restart', label: 'กลับไปเลือกวิธีชำระเงิน', href: targetHref },
    };
  }

  return {
    payment: {
      state: 'refunded',
      isConfirmed: false,
      label: 'คืนเงินแล้ว',
      heading: 'รายการนี้คืนเงินแล้ว',
      description: 'รายการนี้ถูกบันทึกว่าได้คืนเงินแล้ว กรุณาดูรายละเอียดสินค้าหรือติดต่อพร้อมเลขอ้างอิง',
      preventDuplicatePayment: true,
    },
    recovery: { kind: 'view-product', label: 'ดูรายละเอียดสินค้า', href: targetHref },
  };
}

export function derivePaymentPresentation(
  source: PaymentPresentationSource,
  options: { now: Date },
): PaymentPresentation {
  if (!Number.isFinite(options.now.getTime())) {
    throw new TypeError('Payment presentation requires a valid current time');
  }

  const access = deriveAccess(source.access);
  if (source.kind === 'cancelled-return') {
    return {
      target: source.target,
      quote: null,
      attempt: null,
      payment: {
        state: 'cancelled-return',
        isConfirmed: false,
        label: 'ยกเลิกการชำระแล้ว',
        heading: 'ยกเลิกการชำระแล้ว',
        description: 'ยังไม่มีการยืนยันการชำระเงินและยังไม่ได้เพิ่มสิทธิ์เรียน',
        preventDuplicatePayment: false,
      },
      access,
      recovery: {
        kind: 'restart',
        label: 'เลือกวิธีชำระเงินใหม่',
        href: source.target.href,
      },
    };
  }

  const { attempt } = source;
  const amountDue = attempt ? normalizeAmount(attempt.amount) : null;
  const createdAtTimestamp = attempt?.createdAt?.getTime();
  if (
    !attempt
    || !source.expectedAttemptId
    || attempt.id !== source.expectedAttemptId
    || attempt.userId !== source.ownerId
    || !isExactTarget(attempt, source.target)
    || attempt.currency !== 'THB'
    || !PAYMENT_METHODS.includes(attempt.method)
    || !PAYMENT_STATUSES.includes(attempt.status)
    || amountDue === null
    || (createdAtTimestamp !== undefined && !Number.isFinite(createdAtTimestamp))
  ) {
    return unconfirmedPresentation(source, access);
  }

  const description = describePayment(attempt, access, source.target.href, options.now);
  return {
    target: {
      ...source.target,
      title: attempt.itemTitle?.trim() || null,
    },
    quote: {
      amountDue,
      amountFormatted: thbFormatter.format(Number(amountDue)),
      currency: 'THB',
    },
    attempt: {
      id: attempt.id,
      method: attempt.method,
      rawStatus: attempt.status,
      createdAt: attempt.createdAt?.toISOString() ?? null,
      expiresAt: promptPayExpiry(attempt)?.toISOString() ?? null,
    },
    ...description,
    access,
  };
}
