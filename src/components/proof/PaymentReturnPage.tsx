import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth/member-access';
import { isStripeReturnId, loadLearningStart, loadPaymentReturn } from '@/lib/commerce/payment-return';
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
  // Only once payment and access are both confirmed does the page lead into the course.
  const start = record.presentation.payment.state === 'completed-ready' ? await loadLearningStart(record.presentation.target) : null;
  return <TransactionReceipt record={record} start={start} />;
}
