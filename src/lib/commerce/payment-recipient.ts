import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export type PaymentRecipient = { email: string; name: string | null };

/**
 * Who a payment's receipt and enrollment emails go to: the account that owns the payment.
 * Never an address or name the payer typed at Stripe Checkout, which can be anyone's.
 */
export async function loadPaymentRecipient(userId: string | null): Promise<PaymentRecipient | null> {
  if (!userId) return null;
  const [account] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return account?.email ? { email: account.email, name: account.name } : null;
}
