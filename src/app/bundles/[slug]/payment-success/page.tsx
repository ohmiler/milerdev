import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, enrollments, payments } from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { fulfillStripeCheckoutSession } from '@/lib/payment-fulfillment';
import TransactionReceipt from '@/components/proof/TransactionReceipt';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'สถานะการชำระเงินชุดคอร์ส',
  description: 'ตรวจสอบรายการชำระเงินและสิทธิ์เข้าเรียนในชุดคอร์สของคุณ',
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

async function getBundlePaymentStatus(slug: string, userId: string) {
  // Get bundle
  const [bundle] = await db
    .select()
    .from(bundles)
    .where(eq(bundles.slug, slug))
    .limit(1);

  if (!bundle) return null;

  // Get courses in bundle
  const bCourses = await db
    .select({
      courseId: bundleCourses.courseId,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
    .where(eq(bundleCourses.bundleId, bundle.id))
    .orderBy(asc(bundleCourses.orderIndex));

  // Get latest payment for this bundle
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.bundleId, bundle.id)
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  // Check enrollment status for each course
  const enrollmentStatus = await Promise.all(
    bCourses.map(async (bc) => {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, bc.courseId)
          )
        )
        .limit(1);
      return { ...bc, isEnrolled: !!enrollment };
    })
  );

  const allEnrolled = enrollmentStatus.every((c) => c.isEnrolled);

  return {
    bundle,
    courses: enrollmentStatus,
    payment,
    allEnrolled,
  };
}

// Verify Stripe session and fulfill payment + enrollment if webhook hasn't done it yet
async function verifyAndFulfillBundle(
  sessionId: string | undefined,
  userId: string,
  bundleId: string,
) {
  if (!sessionId) return;

  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillStripeCheckoutSession({
      session: stripeSession,
      expected: { userId, type: 'bundle', itemId: bundleId },
    });
    if (result.status === 'rejected') {
      console.error(`[PaymentSuccess] Bundle fulfillment rejected (${result.code})`);
    }
  } catch (error) {
    console.error('Stripe session verification fallback failed:', error);
  }
}

export default async function BundlePaymentSuccessPage({ params, searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    const { slug } = await params;
    redirect(`/login?callbackUrl=/bundles/${slug}/payment-success`);
  }

  const { slug } = await params;
  const data = await getBundlePaymentStatus(slug, session.user.id);

  if (!data) {
    redirect('/courses');
  }

  const { bundle, courses: bundleCourseList, payment } = data;
  const { session_id } = await searchParams;

  // If not all enrolled yet, try to verify with Stripe and fulfill
  if (!data.allEnrolled) {
    await verifyAndFulfillBundle(
      session_id,
      session.user.id,
      bundle.id,
    );
  }

  // Re-check enrollment after potential fulfillment
  let enrolled = data.allEnrolled;
  if (!enrolled) {
    const results = await Promise.all(
      bundleCourseList.map(async (bc) => {
        const [enrollment] = await db
          .select()
          .from(enrollments)
          .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, bc.courseId)))
          .limit(1);
        return !!enrollment;
      })
    );
    enrolled = results.every(Boolean);
  }

  return (
    <TransactionReceipt
      kind="bundle"
      title={bundle.title}
      amount={(payment?.amount ?? bundle.price).toString()}
      orderId={payment?.id}
      thumbnailUrl={normalizeUrl(bundle.thumbnailUrl)}
      accessReady={enrolled}
      primaryHref={bundleCourseList[0] ? `/courses/${bundleCourseList[0].courseSlug}/learn` : undefined}
      primaryLabel="เริ่มเรียนคอร์สแรก"
      items={bundleCourseList.map((course) => ({
        id: course.courseId,
        title: course.courseTitle,
        href: `/courses/${course.courseSlug}`,
      }))}
    />
  );
}
