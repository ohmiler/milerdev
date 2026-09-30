import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/member-access';
import { isStripeReturnId, loadPaymentReturn } from '@/lib/payment-return';
import TransactionReceipt from './TransactionReceipt';

export type PaymentReturnPageProps = {
  params: Promise<{ slug: string; sessionId?: string }>;
  searchParams?: Promise<{ session_id?: string | string[] }>;
};

export default async function PaymentReturnPage({ type, params, searchParams }: PaymentReturnPageProps & { type: 'course' | 'bundle' }) {
  const [{ slug, sessionId }, query] = await Promise.all([params, searchParams]);
  const path = `/${type === 'course' ? 'courses' : 'bundles'}/${encodeURIComponent(slug)}/payment-success`;
  // Auth strips queries. Preserve only the allowlisted provider handle in the path.
  if (!sessionId && isStripeReturnId(query?.session_id)) redirect(`${path}/${query.session_id}`);
  const member = await requireMember(sessionId && isStripeReturnId(sessionId) ? `${path}/${sessionId}` : path);
  const record = await loadPaymentReturn(member.id, type, slug, sessionId);
  if (!record) notFound();
  return <TransactionReceipt record={record} />;
}
