'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import type { PaymentRecord } from '@/lib/payment-records';

const CheckoutDialog = dynamic(() => import('@/components/checkout/CheckoutDialog'));

export default function PaymentRecoveryAction({ record, onRefresh }: { record: PaymentRecord; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const refresh = onRefresh ?? (() => router.refresh());
  const { recovery, target } = record.presentation;
  if (record.canSubmitSlip && recovery.kind === 'resume') return <>
    <Button ref={trigger} type="button" className="h-auto min-h-11 whitespace-normal" onClick={() => setOpen(true)}>{recovery.label}</Button>
    {open ? <CheckoutDialog open onClose={() => setOpen(false)} target={target} resumePaymentId={record.id} exposureId={null} returnFocusRef={trigger} onEnrolled={refresh} /> : null}
  </>;
  if (recovery.kind === 'refresh') return <Button type="button" className="h-auto min-h-11 whitespace-normal" onClick={refresh}>{recovery.label}</Button>;
  return <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal"><Link href={recovery.href}>{recovery.label}</Link></Button>;
}
