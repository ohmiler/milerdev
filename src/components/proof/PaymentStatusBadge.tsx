import { Ban, CircleCheck, CircleHelp, CircleX, Clock, LoaderCircle, Search, Undo2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { PaymentRecord } from '@/lib/commerce/payment-records';

type PaymentState = PaymentRecord['presentation']['payment']['state'];

// Each state gets its own color and icon, so status never relies on color alone.
const STATUS_STYLES: Record<PaymentState, { variant: React.ComponentProps<typeof Badge>['variant']; Icon: typeof Clock }> = {
  'completed-ready': { variant: 'green', Icon: CircleCheck },
  'completed-access-pending': { variant: 'info', Icon: LoaderCircle },
  pending: { variant: 'amber', Icon: Clock },
  verifying: { variant: 'info', Icon: Search },
  failed: { variant: 'destructive', Icon: CircleX },
  refunded: { variant: 'violet', Icon: Undo2 },
  'cancelled-return': { variant: 'outline', Icon: Ban },
  unconfirmed: { variant: 'outline', Icon: CircleHelp },
};

export default function PaymentStatusBadge({ state, label }: { state: PaymentState; label: string }) {
  const { variant, Icon } = STATUS_STYLES[state];

  return (
    <Badge variant={variant} data-payment-status={state} className="h-auto max-w-full whitespace-normal py-1">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
