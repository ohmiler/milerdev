import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, enrollments, payments } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';
import TransactionReceipt from '@/components/proof/TransactionReceipt';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'สถานะการชำระเงินคอร์ส',
  description: 'ตรวจสอบรายการชำระเงินและสิทธิ์เข้าเรียนของคุณ',
  robots: { index: false, follow: false },
};

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

async function getPaymentStatus(slug: string, userId: string) {
  // Get course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  // Check if already enrolled
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id)
      )
    )
    .limit(1);

  // Get latest payment for this course
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.courseId, course.id)
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return {
    course,
    isEnrolled: !!enrollment,
    payment,
  };
}

// Verify Stripe session and fulfill payment + enrollment if webhook hasn't done it yet
async function verifyAndFulfill(sessionId: string | undefined, userId: string, courseId: string) {
  if (!sessionId) return;

  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillStripeCheckoutSession({
      session: stripeSession,
      expected: { userId, type: 'course', itemId: courseId },
    });
    if (result.status === 'rejected') {
      console.error(`[PaymentSuccess] Course fulfillment rejected (${result.code})`);
    }
  } catch (error) {
    console.error('Stripe session verification fallback failed:', error);
  }
}

export default async function PaymentSuccessPage({ params, searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/courses/${slug}/payment-success`);
  }

  const { slug } = await params;
  const data = await getPaymentStatus(slug, session.user.id);

  if (!data) {
    redirect('/courses');
  }

  const { course, isEnrolled, payment } = data;
  const { session_id } = await searchParams;

  // If not enrolled yet, try to verify with Stripe and fulfill
  if (!isEnrolled) {
    await verifyAndFulfill(session_id, session.user.id, course.id);
  }

  // Re-check enrollment after potential fulfillment
  let enrolled = isEnrolled;
  if (!enrolled) {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, course.id)))
      .limit(1);
    enrolled = !!enrollment;
  }

  return (
    <TransactionReceipt
      kind="course"
      title={course.title}
      amount={(payment?.amount ?? course.price).toString()}
      orderId={payment?.id}
      thumbnailUrl={normalizeUrl(course.thumbnailUrl)}
      accessReady={enrolled}
      primaryHref={`/courses/${slug}/learn`}
      primaryLabel="เริ่มเรียนคอร์สนี้"
    />
  );
}
