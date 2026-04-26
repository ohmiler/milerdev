import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, enrollments, payments } from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

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
  courseIds: string[],
  paymentId: string | undefined
) {
  if (!sessionId) return;

  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (stripeSession.payment_status !== 'paid') return;

    // Verify that the Stripe session metadata matches this user, bundle, and payment
    const meta = stripeSession.metadata || {};
    if (meta.userId && meta.userId !== userId) return;
    if (meta.bundleId && meta.bundleId !== bundleId) return;
    if (meta.paymentId && paymentId && meta.paymentId !== paymentId) return;
    if (meta.type && meta.type !== 'bundle') return;

    // Update payment status if still pending
    if (paymentId) {
      await db
        .update(payments)
        .set({
          status: 'completed',
          stripePaymentId: stripeSession.payment_intent as string,
        })
        .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')));
    }

    // Create enrollment for each course (safe — handles duplicates)
    for (const courseId of courseIds) {
      try {
        await safeInsertEnrollment(userId, courseId);
      } catch (error) {
        console.error(`Fallback enrollment failed for course ${courseId}:`, error);
      }
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
      bundleCourseList.map(c => c.courseId),
      payment?.id
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '540px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg style={{ width: '40px', height: '40px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '8px',
        }}>
          ชำระเงินสำเร็จ! 🎉
        </h1>

        <p style={{
          color: '#64748b',
          fontSize: '1rem',
          marginBottom: '24px',
        }}>
          ขอบคุณสำหรับการสั่งซื้อ
        </p>

        {/* Bundle Info */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            {normalizeUrl(bundle.thumbnailUrl) && (
              <img
                src={normalizeUrl(bundle.thumbnailUrl)!}
                alt={bundle.title}
                width={60}
                height={40}
                style={{ objectFit: 'cover', borderRadius: '6px' }}
              />
            )}
            <div>
              <h3 style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>
                📦 {bundle.title}
              </h3>
              <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>
                ฿{parseFloat(bundle.price.toString()).toLocaleString()} · {bundleCourseList.length} คอร์ส
              </p>
            </div>
          </div>

          {/* Course list */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '12px',
            fontSize: '0.875rem',
          }}>
            {bundleCourseList.map((course) => (
              <div key={course.courseId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 0',
                color: '#475569',
              }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                <span>{course.courseTitle}</span>
              </div>
            ))}
          </div>

          {payment && (
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '12px',
              marginTop: '12px',
              fontSize: '0.875rem',
              color: '#64748b',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>หมายเลขคำสั่งซื้อ:</span>
                <span style={{ fontFamily: 'monospace' }}>{payment.id.slice(0, 8)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>สถานะ:</span>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>✓ ชำระเงินแล้ว</span>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        <div style={{
          background: enrolled ? '#dcfce7' : '#fef3c7',
          color: enrolled ? '#166534' : '#92400e',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          {enrolled ? (
            <>✓ คุณได้ลงทะเบียนเรียน Bundle นี้เรียบร้อยแล้ว ({bundleCourseList.length} คอร์ส)</>
          ) : (
            <>⏳ กำลังดำเนินการลงทะเบียน กรุณารอสักครู่...</>
          )}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bundleCourseList.length > 0 && (
            <Link
              href={`/courses/${bundleCourseList[0].courseSlug}/learn`}
              style={{
                display: 'block',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              🎓 เริ่มเรียนคอร์สแรก
            </Link>
          )}

          <Link
            href="/dashboard"
            style={{
              display: 'block',
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#475569',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            ไปยังแดชบอร์ด
          </Link>
        </div>

        <p style={{
          marginTop: '24px',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}>
          หากมีปัญหาใดๆ กรุณาติดต่อ milerdev.official@gmail.com
        </p>
      </div>
    </div>
  );
}
