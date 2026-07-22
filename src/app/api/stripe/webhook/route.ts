import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { sendEnrollmentEmail, sendPaymentConfirmation } from '@/lib/email';
import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature ?? '',
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  let result;
  try {
    result = await fulfillStripeCheckoutSession({
      session: checkoutSession,
      event: { id: event.id, type: event.type },
    });
  } catch (error) {
    console.error('[Webhook] Unexpected fulfillment failure:', error);
    return NextResponse.json(
      { error: 'Failed to process payment fulfillment' },
      { status: 500 },
    );
  }

  if (result.status === 'replayed') {
    console.log(`[Webhook] Stripe event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true });
  }

  if (result.status === 'rejected') {
    console.error(
      `[Webhook] Fulfillment rejected (${result.code}, paymentId=${checkoutSession.metadata?.paymentId ?? 'missing'})`,
    );
    const shouldRetry = result.retryable && result.code !== 'SESSION_NOT_PAID';
    return shouldRetry
      ? NextResponse.json({ error: 'Payment fulfillment is not ready' }, { status: 500 })
      : NextResponse.json({ received: true });
  }

  const customerEmail = checkoutSession.customer_details?.email;
  const customerName = checkoutSession.customer_details?.name || 'Customer';
  const details = result.emailDetails;
  if (customerEmail && details) {
    const courseName = details.courseCount === undefined
      ? details.title
      : `${details.title} (Bundle)`;
    const enrollmentName = details.courseCount === undefined
      ? details.title
      : `${details.title} (${details.courseCount} courses)`;

    Promise.all([
      sendPaymentConfirmation({
        email: customerEmail,
        name: customerName,
        courseName,
        amount: Number(result.payment.amount),
        paymentId: result.payment.id,
      }),
      sendEnrollmentEmail({
        email: customerEmail,
        name: customerName,
        courseName: enrollmentName,
        courseSlug: details.firstCourseSlug,
      }),
    ]).catch((error) => console.error('[Webhook] Failed to send payment emails:', error));
  }

  console.log(`[Webhook] Payment ${result.payment.id} fulfilled (${result.status})`);
  return NextResponse.json({ received: true });
}
