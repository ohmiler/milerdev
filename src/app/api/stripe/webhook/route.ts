import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/commerce/stripe';
import { sendEnrollmentEmail, sendPaymentConfirmation } from '@/lib/notifications/email';
import { logError, logEvent } from '@/lib/error-handler';
import { fulfillStripeCheckoutSession } from '@/lib/commerce/payment-fulfillment';
import { loadPaymentRecipient } from '@/lib/commerce/payment-recipient';

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
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'stripe.webhook.signature_invalid',
    });
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
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'stripe.webhook.fulfillment_failed',
    });
    return NextResponse.json(
      { error: 'Failed to process payment fulfillment' },
      { status: 500 },
    );
  }

  if (result.status === 'replayed') {
    logEvent('stripe.webhook.replayed');
    return NextResponse.json({ received: true });
  }

  if (result.status === 'rejected') {
    logEvent(`stripe.webhook.rejected.${result.code}`, 'warn');
    const shouldRetry = result.retryable && result.code !== 'SESSION_NOT_PAID';
    return shouldRetry
      ? NextResponse.json({ error: 'Payment fulfillment is not ready' }, { status: 500 })
      : NextResponse.json({ received: true });
  }

  const details = result.emailDetails;
  if (details) {
    const courseName = details.courseCount === undefined
      ? details.title
      : `${details.title} (ชุดคอร์ส)`;
    const enrollmentName = details.courseCount === undefined
      ? details.title
      : `${details.title} (${details.courseCount} courses)`;
    const payment = result.payment;

    // Emails go to the account that owns the payment, never to customer_details: the payer types
    // that email and name at Checkout, so it could be anyone's address and any text.
    void loadPaymentRecipient(payment.userId).then((recipient) => {
      if (!recipient) return;
      const name = recipient.name || 'Customer';
      return Promise.all([
        sendPaymentConfirmation({
          email: recipient.email,
          name,
          courseName,
          amount: Number(payment.amount),
          paymentId: payment.id,
        }),
        sendEnrollmentEmail({
          email: recipient.email,
          name,
          courseName: enrollmentName,
          courseSlug: details.firstCourseSlug,
        }),
      ]);
    }).catch((error) => logError(
      error instanceof Error ? error : new Error(String(error)),
      { action: 'stripe.webhook.email_failed' },
    ));
  }

  logEvent(`stripe.webhook.fulfilled.${result.status}`);
  return NextResponse.json({ received: true });
}
